<!---
markmeta_author: tiltwind
markmeta_date: 2026-08-08
markmeta_title: Rust 内存模型详解
markmeta_categories: program-language
markmeta_tags: rust,memory-model,atomics,ordering,happens-before,concurrency,send,sync,fence,data-race,unsafe
markmeta_last_update: 2026-08-08
-->

# Rust 内存模型详解

**摘要**: Rust 的并发内存模型（Memory Model）以 C++20 atomics 为蓝本，用 happens-before 描述跨线程可见性与同步。本文从编译器/硬件重排序出发，讲清 data race 与 race condition 的分野、access-based 与 C++ object-based 的差异、`Ordering` 五种次序、modification order、`fence`/`compiler_fence`、各架构屏障指令映射，以及 `Mutex`/`channel`/`Send`/`Sync` 如何在日常代码中建立同步边。Safe Rust 编译期消掉 data race；真正需要啃内存模型的，主要是 `unsafe` 与手写 lock-free 代码。

> **范围说明**：本文只讨论**并发内存模型**（原子操作、可见性、同步次序）。Rust 的内存**布局**与**所有权分配**语义（栈/堆、`Box`/`Rc`/`Arc` 的分配行为、`repr` 布局规则、Stacked/Tree Borrows 别名模型）不在本文范围内。

## 1. 为什么需要内存模型

### 1.1 编译器重排序与硬件重排序

单线程下，编译器与 CPU 可以在不改变可观察结果的前提下重排、合并甚至删除访存：

```rust
x = 1;
y = 3;
x = 2;
// 编译器可优化为: x = 2; y = 3;
```

多线程下，另一线程可能依赖「先写 `x=1` 再写 `y`」这类中间状态——单线程不可见的优化会变成跨线程 bug。

硬件侧，各核通过缓存与 store buffer 异步传播写入。x86/x64 属于强序（大致 TSO），ARM/POWER 等弱序平台允许更多重排。同一段「碰巧在 x86 上正确」的代码，在弱序 CPU 上可能失败。因此需要一套与架构无关的语言级规则。

### 1.2 Rust 的两层故事

| 层次 | 作用 | 多数程序员是否直接面对 |
|---|---|---|
| 所有权 / 借用 / `Send` / `Sync` | 编译期消灭 data race，强制共享可变数据走同步原语 | Safe Rust 日常依赖 |
| C++20 风格 atomics 内存模型 | 定义原子操作、happens-before、何种冲突构成 UB | 主要出现在 `unsafe`、atomics、lock-free |

Nomicon 的表述很直白：Rust 原子内存模型**直接继承 C++20**，并非因为该模型特别简洁，而是为了复用已有研究、工具与硬件实现经验。Rust **不暴露** C++ 的 `memory_order_consume`。

> 忠告（对齐 Go Memory Model 精神）：若你的 Safe Rust 程序必须靠细抠 Ordering 才能「碰巧正确」，优先改成 `Mutex` / channel / 更简单的原子模式。SeqCst 慢一点，通常仍比错误的 Relaxed 便宜。

## 2. Data Race：UB 的核心边界

### 2.1 定义

官方定义（`std::sync::atomic` / Nomicon）：**data race** 是满足下列条件的访问：

1. 访问冲突（conflict）：触及重叠内存，且至少一方是写；
2. 至少一方是**非原子**访问；
3. 二者**不同步**：按内存模型，彼此都不 happens-before 对方。

失败的 `compare_exchange` / `compare_exchange_weak` **不算**写。

Data race 在 Rust 中是 **undefined behavior (UB)**——与 C++ 同类严厉：编译器可假设永不发生，并据此做任意优化。

### 2.2 Data race ≠ Race condition

| 维度 | Data race | Race condition（广义竞态） |
|---|---|---|
| 含义 | 无同步的冲突访存（含非原子） | 正确性依赖调度时序（逻辑竞态） |
| Safe Rust | **不可能** | **可能**（死锁、丢更新逻辑、误判边界等） |
| 后果 | UB | 通常仍是内存安全；与 `unsafe` 结合才可能变成内存不安全 |

典型：用 `AtomicUsize` 做索引时先 `load` 再 bounds check 再索引——可能 panic，但是 Safe；若在 check 之后又 `load` 一次并用 `get_unchecked`，则 race condition + `unsafe` 可变成越界 UB。

### 2.3 Access-based vs Object-based

C++ 按「原子对象 / 非原子对象」划分内存；Rust 是 **access-based**（与 LLVM 一致）：原子性附着在**每一次访问**上。

实用差异：

- 对同一位置并发做「原子读 + 非原子读」在 Rust 中允许（C++ 因对象分区常禁止）。
- 非同步的、**部分重叠或不同大小**的冲突原子访问仍是 UB（mixed-size）。
- 对**只读内存**（如 `.rodata`、只读 `mmap` 页）做原子操作通常是 UB：原子写必然 UB；原子读在多数情况下也不被保证。目前唯一放宽的情形是「大小不超过指针宽度的 `Relaxed` load」，且仅在少数已知不会把原子读实现为读-改-写的平台上成立（x86-64、aarch64 等）——这条例外随编译器实现演进，不要依赖，详见官方 `std::sync::atomic` 模块中 "Atomic accesses to read-only memory" 一节。

## 3. Happens-before 与同步边

内存模型用 **happens-before** 偏序描述因果：若 A happens-before B，则 A 的副作用对 B 可见，且不允许把破坏该可见性的重排当作合法优化。

关键同步边（日常最常用）：

| 同步源 | 规则（直觉） |
|---|---|
| 程序顺序 | 同一线程内，先执行的操作 happens-before 后执行的操作 |
| Release–Acquire | 对同一原子位置：Release 写 synchronizes-with 读到该值的 Acquire 读 |
| SeqCst | 在 Acq/Rel 之上，另有全局 SeqCst 总序 |
| 锁 | `Mutex`/`RwLock` 解锁 Release，下一把同锁加锁 Acquire |
| 线程 | `spawn` 之前的操作 happens-before 子线程入口；子线程结束 happens-before `join` 返回 |
| Channel | `send` happens-before 对应 `recv` 完成（消息所有权转移本身也要求同步） |
| 传递性 | A ≺ B 且 B ≺ C ⇒ A ≺ C |

Release–Acquire **只在「读到对方写入的那次值」时**建立边；读到旧值、或操作不同原子变量，都不会自动同步。Release 之前的**全部**写（含非原子与 Relaxed）会对 Acquire 之后的读可见。

## 4. Ordering：五种内存次序

`std::sync::atomic::Ordering`（同 C++20，无 Consume）：

```rust
#[non_exhaustive]  // 不能写穷尽的 match，必须带 `_ =>` 分支
pub enum Ordering {
    Relaxed,  // 仅原子性 + 单变量修改顺序，无跨线程同步边
    Release,  // 写侧：此前写不能排到该 Release 之后
    Acquire,  // 读侧：此后读/写不能排到该 Acquire 之前
    AcqRel,   // RMW：读 Acquire + 写 Release
    SeqCst,   // Acq/Rel/AcqRel + 全局 SeqCst 总序
}
```

### 4.1 强弱与适用

| Ordering | 同步能力 | 典型用途 |
|---|---|---|
| `Relaxed` | 无 happens-before（但保留单变量修改顺序，见 4.2） | 统计计数、ID 生成；不用于发布其他数据的载荷本身 |
| `Release` | 发布此前写 | `store` 结束临界区、发布「数据已就绪」 |
| `Acquire` | 获取已发布写 | `load` 进入临界区、确认就绪后再读载荷 |
| `AcqRel` | 双向 | `fetch_*` / 成功的 CAS 同时扮演获取与释放 |
| `SeqCst` | 最强 | 多变量之间需要**所有线程一致的总序**（代价与陷阱见 4.4） |

注意 API 约束：

- `Release` 只能用于能 store 的操作；用在 `load` 上非法，用在 RMW 上时**读侧退化为 Relaxed**。
- `Acquire` 只能用于能 load 的操作；用在 `store` 上非法，用在 RMW 上时**写侧退化为 Relaxed**。
- `AcqRel` 仅用于 RMW；用在 `load`/`store` 上非法。CAS 失败时可能只体现 Acquire，但不会变成 Relaxed。

「非法」的表现形式取决于次序是不是编译期常量——文档写的是 panic，因为 `Ordering` 在类型上是普通运行期值：

```rust
a.load(Ordering::Release);   // 字面量 → 编译期报错：
                             // error: atomic loads cannot have `Release` or `AcqRel` ordering
let ord = get_order();       // 运行期决定
a.load(ord);                 // → 运行期 panic
```

实践中几乎总是写字面量，所以这类错误会被编译器当场拦下，不用担心它潜伏到生产环境。

### 4.2 Relaxed 不等于「没有任何保证」：modification order

把 `Relaxed` 理解成「完全无序」是常见误解。内存模型规定：**每个原子变量都有一条全局唯一的修改顺序（modification order）**，该变量上的所有写按此顺序排列，所有线程对它的观察都与这条顺序一致。这个保证与 `Ordering` 无关，`Relaxed` 同样享有：

- **一致性（coherence）**：同一线程对同一原子变量连续读，取值不会在修改顺序上「倒退」——读到 5 之后不会再读到更早的 3。
- **RMW 的连贯性**：`fetch_add` 等读-改-写操作总是读到修改顺序中**紧邻的前一个值**，所以并发 `fetch_add(1, Relaxed)` 绝不会丢计数。
- **不会凭空产生值**：读到的必须是某个线程真实写过的值。

`Relaxed` 缺的只是**跨变量的因果关系**：它不建立 happens-before，因此不能用来「发布」其他内存。这正是 5.2 计数器安全、而 5.1 的 flag 必须用 Release/Acquire 的原因。

### 4.3 `compare_exchange` 的双 Ordering 参数

CAS 系列要传两个次序：成功路径与失败路径。

```rust
// 参数：current, new, success ordering, failure ordering
atom.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
atom.compare_exchange_weak(false, true, Ordering::Acquire, Ordering::Relaxed)
```

规则：

- **失败次序只能是 load 次序**：`Relaxed` / `Acquire` / `SeqCst`。传 `Release` 或 `AcqRel` 非法——失败时不发生写，谈不上释放。编译器的报错信息把理由说得很清楚：`` `compare_exchange`'s failure ordering may not be `Release` or `AcqRel`, since a failed `compare_exchange` does not result in a write ``（呼应 2.1「失败的 CAS 不算写」）。
- 失败次序**可以强于**成功次序（Rust 1.64 起放开了这一限制，此前会 panic）。
- 常见搭配：拿锁用 `(Acquire, Relaxed)`——成功即进入临界区需要 Acquire；失败只是重试，不读任何被保护数据，`Relaxed` 足够、也最便宜。若失败后要读取当前值并据此做决策，则失败次序需要 `Acquire`。
- `compare_exchange_weak` 允许**伪失败（spurious failure）**，在 LL/SC 架构（ARM、RISC-V）上能生成更优代码；因此它只应用在**重试循环**里，一次性 CAS 用 `compare_exchange`。

### 4.4 SeqCst 多给了什么

仅用 SeqCst 原子 + 普通数据访问、且程序无 data race 时，行为可按「各线程指令交错成一条全局执行」来推理（SC-DRF 直觉）。一旦混入更弱次序，就可能出现「各线程看到的原子操作顺序不一致」——经典 IRIW 等场景。实践中多数锁、一次性发布用 Acq/Rel 足够；需要「多个独立 flag 上的全局裁决」时才认真考虑 SeqCst。

但 SeqCst 也不是「一定不会错」的保险：

- SeqCst **fence** 与 SeqCst 原子操作如何一起参与那条全局总序，是 C++ 内存模型中公认最微妙的部分，直觉推理经常出错。Mara Bos 在《Rust Atomics and Locks》中直言：真正必须依赖 SeqCst 的算法极少，代码里出现 SeqCst 往往说明作者没想清楚需要哪条同步边。
- SeqCst 保证的是**原子操作之间**的全局总序，不会让一段本身有 data race 的代码变得合法。
- 它有实打实的代价：x86-64 上 SeqCst store 要用 `xchgq`（带隐式 lock），而 Release store 只是一条普通 `movq`——具体差异见第 6 节实测表。

正确的用法顺序是：先用 Acquire/Release 把同步边**画清楚**；实在画不清时用 SeqCst 兜底并留 TODO，而不是把 SeqCst 当成免于思考的默认值。

## 5. 代码模式

### 5.1 发布–订阅（Release–Acquire）

载荷**不能**用 `Mutex` 来演示：`Mutex` 的 unlock/lock 自带一对 Release/Acquire 同步边，会把 flag 的次序问题完全掩盖掉。这里用 `Relaxed` 访问的原子载荷——它自身不提供任何同步边，可见性完全由 `ready` 这一对 Release/Acquire 决定：

```rust
use std::sync::atomic::{AtomicBool, AtomicI32, Ordering};
use std::thread;

static DATA: AtomicI32 = AtomicI32::new(0);
static READY: AtomicBool = AtomicBool::new(false);

fn main() {
    thread::scope(|s| {
        s.spawn(|| {
            DATA.store(42, Ordering::Relaxed);    // 载荷：自身不建立同步边
            READY.store(true, Ordering::Release); // 发布：此前所有写随之可见
        });

        s.spawn(|| {
            while !READY.load(Ordering::Acquire) { // 获取
                std::hint::spin_loop();
            }
            // 读到 true ⇒ 与那次 Release 建立 happens-before
            // ⇒ 保证看到 Release 之前的全部写（含 Relaxed 与非原子写）
            assert_eq!(DATA.load(Ordering::Relaxed), 42);
        });
    });
}
```

把 `READY` 的两处都改成 `Relaxed`，断言就**不再有保证**：`Relaxed` 只约束 `READY` 自己的修改顺序，不建立 happens-before，消费者完全可能看到 `READY == true` 却读到 `DATA == 0`。这在 x86 上几乎测不出来，在 aarch64 等弱序平台上是真实故障。

若载荷是**非原子**数据（如 `UnsafeCell<T>` 里的缓冲区），结论完全相同：`Release` 之前的非原子写同样会对 `Acquire` 之后可见——这正是「用一个原子 flag 发布一整块非原子数据」这类模式成立的依据，也是 `Arc`、`OnceLock` 等标准库类型的内部做法。

### 5.2 仅需原子性：Relaxed 计数

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

static HITS: AtomicUsize = AtomicUsize::new(0);

fn hit() {
    // 不拿计数去同步其他内存 → Relaxed 足够
    HITS.fetch_add(1, Ordering::Relaxed);
}
```

### 5.3 SpinLock：临界区的 Acquire/Release 配对

下面是一个可运行的最小实现，包含被保护的数据与 guard，用于说明「临界区内的普通读写如何通过一对同步边传递」。**仅作教学示意**：它自旋不退避、无 poison、无公平性、不可重入，生产代码请用 `std::sync::Mutex` 或 `parking_lot`。

```rust
use std::cell::UnsafeCell;
use std::ops::{Deref, DerefMut};
use std::sync::atomic::{AtomicBool, Ordering};

pub struct SpinLock<T> {
    locked: AtomicBool,
    data: UnsafeCell<T>,
}

// 只要 T: Send，跨线程共享 &SpinLock<T> 就是安全的：互斥由 locked 保证
unsafe impl<T: Send> Sync for SpinLock<T> {}

impl<T> SpinLock<T> {
    pub const fn new(value: T) -> Self {
        Self { locked: AtomicBool::new(false), data: UnsafeCell::new(value) }
    }

    pub fn lock(&self) -> SpinGuard<'_, T> {
        // 成功 → Acquire：与上一个持锁者的 Release 建立 happens-before
        // 失败 → Relaxed：仅重试，不读取任何被保护数据
        while self
            .locked
            .compare_exchange_weak(false, true, Ordering::Acquire, Ordering::Relaxed)
            .is_err()
        {
            // 失败路径用 Relaxed load 自旋，避免反复发起总线独占（read-then-CAS）
            while self.locked.load(Ordering::Relaxed) {
                std::hint::spin_loop();
            }
        }
        SpinGuard { lock: self }
    }
}

pub struct SpinGuard<'a, T> {
    lock: &'a SpinLock<T>,
}

impl<T> Deref for SpinGuard<'_, T> {
    type Target = T;
    fn deref(&self) -> &T {
        unsafe { &*self.lock.data.get() } // 持有 guard ⇒ 独占访问
    }
}

impl<T> DerefMut for SpinGuard<'_, T> {
    fn deref_mut(&mut self) -> &mut T {
        unsafe { &mut *self.lock.data.get() }
    }
}

impl<T> Drop for SpinGuard<'_, T> {
    fn drop(&mut self) {
        // Release：临界区内的全部写对下一个 Acquire 成功者可见
        self.lock.locked.store(false, Ordering::Release);
    }
}
```

获取用 Acquire、释放用 Release：临界区内的普通读写通过这对同步边对下一持锁者可见。注意内层的 `Relaxed` 自旋（read-then-CAS，也叫 TTAS）——直接循环 CAS 会让每次尝试都独占缓存行，多核竞争下性能远差于先用普通 load 观望。

### 5.4 `fence` 实战：`Arc` 的引用计数

`Arc` 的引用计数是理解 `fence` 最好的真实案例，标准库的做法（简化后）是：

```rust
// clone：只是增加计数，不需要发布或获取任何数据 → Relaxed 足够
fn clone(&self) -> Self {
    self.inner().strong.fetch_add(1, Ordering::Relaxed);
    Arc { ptr: self.ptr }
}

// drop：减少计数；最后一个持有者负责析构载荷
fn drop(&mut self) {
    if self.inner().strong.fetch_sub(1, Ordering::Release) != 1 {
        return;                                   // 不是最后一个，直接走人
    }
    std::sync::atomic::fence(Ordering::Acquire);  // 与其他线程的 Release 减法配对
    unsafe { self.drop_slow() };                  // 独占了，安全析构
}
```

三处次序各有理由：

- **`clone` 用 `Relaxed`**：增加计数不涉及任何数据的发布或获取，只需要 4.2 讲的「RMW 连贯性」保证不丢计数。
- **`fetch_sub` 用 `Release`**：本线程在 drop 之前对载荷做过的所有访问，必须对「最终执行析构的那个线程」可见——否则析构可能与其他线程尚未传播的写并发，构成 data race。
- **`fence(Acquire)`**：只有计数归零的那一个线程需要「获取」其余所有线程的 Release。把 Acquire 放进 `fetch_sub` 也正确（写成 `AcqRel`），但那样**每次** drop 都要付 Acquire 的代价；用 fence 就把开销挪到了「一生只发生一次」的归零路径上。

这就是 fence 的典型价值：**把同步开销从热路径挪到冷路径**。这里也是下一小节所说 atomic–fence 配对的实例——一侧是 `Release` 原子操作，另一侧是 `Acquire` fence。

### 5.5 `fence` 与 `compiler_fence`

- `fence(order)`：CPU + 编译器屏障，可与其他线程的原子操作/fence 建立 synchronizes-with（三种配对：atomic–fence、fence–atomic、fence–fence）。**不能**单独用 fence 同步「纯非原子」跨线程访问；中间仍需原子变量传递「信号」。
- `compiler_fence(order)`：只约束编译器重排，不发 CPU fence；用于信号处理器等「同一线程内硬件可见、编译器不可见」的场景。

`fence(Relaxed)` 会 panic。自旋等待场景中也常用「`Relaxed` load 循环 + 跳出后 `fence(Acquire)`」，把 Acquire 的代价从每次轮询挪到唯一一次成功观测上——与 5.4 中 `Arc` 的思路一致。

## 6. Ordering 到硬件：屏障指令映射

`Ordering` 是与架构无关的抽象；编译器最终把它翻译成各平台指令。了解这层映射能解释「为什么 x86 上写错次序也测不出问题」。

下表为 rustc 1.97.0、`-O` 下的实测产物（`AtomicUsize`）：

| 操作 | x86-64 | aarch64 基线 | aarch64 + LSE/LRCPC（Apple Silicon 等） |
|---|---|---|---|
| `load(Relaxed)` | `movq` | `ldr` | `ldr` |
| `load(Acquire)` | `movq` | `ldar` | `ldapr` |
| `load(SeqCst)` | `movq` | `ldar` | `ldar` |
| `store(Relaxed)` | `movq` | `str` | `str` |
| `store(Release)` | `movq` | `stlr` | `stlr` |
| `store(SeqCst)` | `xchgq` | `stlr` | `stlr` |
| `fetch_add(AcqRel)` | `lock xaddq` | `__aarch64_ldadd8_acq_rel`（运行时分派） | `ldaddal` |
| `compare_exchange` | `lock cmpxchgq` | `ldaxr`/`stlxr` 循环 | `casal` |
| `fence(Acquire)` | 无指令 | `dmb ishld` | `dmb ishld` |
| `fence(Release / AcqRel)` | 无指令 | `dmb ish` | `dmb ish` |
| `fence(SeqCst)` | `lock orl $0, (%rsp)` | `dmb ish` | `dmb ish` |
| `compiler_fence(*)` | 无指令 | 无指令 | 无指令 |

三个直接结论：

1. **x86-64 上 Acquire/Release 是「免费」的**——`load(Relaxed)`、`load(Acquire)`、`load(SeqCst)` 生成的是**完全相同的 `movq`**，Release store 同理。所以把该用 `Acquire` 的地方误写成 `Relaxed`，在 x86 上**几乎不可能测出来**，换到 aarch64（Apple Silicon、Graviton、多数手机）立刻暴露。这正是第 9 节「在弱序硬件上测」的由来。
2. **x86-64 上真正有代价的只有 SeqCst store 与 RMW**（`xchgq` / `lock` 前缀）；aarch64 则从 Acquire/Release 起就换用专门指令，代价梯度平滑得多。
3. **同一份代码在同一架构上产物也会变**：aarch64 基线的 RMW 走 outline-atomics 运行时分派（`__aarch64_ldadd8_acq_rel`，开机检测有无 LSE），启用 LSE 后直接内联成单条 `ldaddal`；Acquire load 在支持 FEAT_LRCPC 的芯片上从 `ldar` 降级为更宽松也更快的 `ldapr`。

> 产物随编译器版本、目标特性、上下文而变——例如 `fence(SeqCst)` 在 x86-64 上，LLVM 如今偏好比 `mfence` 更快的 `lock or $0, (%rsp)`。想确认实际产物请自己看汇编，不要凭表推断：
>
> ```bash
> rustc -O --emit asm --target aarch64-unknown-linux-gnu -o - src/lib.rs
> ```
>
> 或用 [Compiler Explorer](https://godbolt.org/) / `cargo asm`。

## 7. 高层同步原语的内存语义

多数业务代码不应手写 Ordering，而应依赖标准库同步边：

| API | 内存语义（直觉） |
|---|---|
| `Mutex::lock` / `drop(guard)` | Acquire / Release |
| `RwLock` 读/写锁 | 同类 Acq/Rel；写解锁与后续读/写加锁同步 |
| `mpsc` / `sync_channel` 的 `send`/`recv` | send happens-before 对应 recv 完成 |
| `thread::spawn` | 父线程 spawn 前 ≺ 子线程开始 |
| `JoinHandle::join` | 子线程全部操作 ≺ join 返回 |
| `thread::scope`（1.63+） | 作用域退出隐式 join 全部子线程；可安全借用栈上数据，无需 `Arc` |
| `Once::call_once` / `OnceLock::get_or_init`（1.70+） | 初始化闭包中的写 ≺ 任何一次成功的 `get`（内部即 Release 发布 + Acquire 读取） |
| `Condvar::notify_*` / `wait` | `wait` 返回时重新持有 `Mutex`，同步边由该 `Mutex` 提供；**必须**配合循环重检条件（虚假唤醒） |
| `Barrier::wait` | 所有线程到达屏障前的操作 ≺ 任一线程从 `wait` 返回之后的操作 |
| `Arc` clone/drop 的引用计数 | 原子 RMW（见 5.4）；**载荷**仍需 `Mutex`/`RwLock`/atomics 保护 |

`Send` / `Sync` 不替代内存次序，而是类型层约束：

- `T: Send`：所有权可安全移到另一线程；
- `T: Sync` ⇔ `&T: Send`：共享引用可安全跨线程；
- `Mutex<T>: Sync` 要求 `T: Send`（锁只保护一把「门」，不能把非 `Send` 的内部状态合法化）。

`Rc`/`RefCell` 非 `Send`/`Sync`；跨线程共享可变状态用 `Arc<Mutex<T>>` 或 atomics。

## 8. 与 C++ / JMM / Go Memory Model 对照

| 维度 | Rust | C++20 | Java (JMM) | Go |
|---|---|---|---|---|
| 规范源头 | C++20 atomics（无 consume）+ access-based 访问模型 | ISO C++ `[intro.races]` | JSR-133 | [The Go Memory Model](https://go.dev/ref/mem) |
| Data race | UB | UB | 有定义的「可出现任意旧值」等弱保证，非 C/C++ 式 UB | 数据竞争是 bug；模型用 happens-before 描述同步 |
| 原子性归属 | access-based：附着在每次访问上 | object-based：附着在原子对象上 | 附着在变量声明（`volatile`） | 附着在 `sync/atomic` 的 API 调用上 |
| 日常防护 | 所有权 + `Send`/`Sync` 编译期拦截 | 全靠程序员自律 | 靠程序员正确用锁/`volatile` | race detector + 规范约定 |
| 显式次序 | `Ordering` 五档 | `memory_order` 六档（含 `consume`） | `volatile`、锁、`final`、j.u.c | channel / sync / atomic，无多档 Ordering API |
| 弱序优化空间 | 大（尤其 ARM） | 大 | 大 | 相对保守的 happens-before 列表 |

要点：Rust Safe 代码的「默认正确性」来自类型系统，而不是程序员背 Ordering 表；一旦进入 `unsafe` 或裸 atomics，规则强度与 C++ 同级。

## 9. 实践建议

1. **优先高层原语**：`Mutex`、`RwLock`、channel、`thread::scope`、`OnceLock`；把 Ordering 决策关进少数模块。
2. **先画同步边，再选 Ordering**：明确「谁发布什么、谁获取什么」，`Acquire`/`Release` 通常就够；拿不准时用 SeqCst 兜底并留 TODO，但别把它当免于思考的默认值（见 4.4）。
3. **配对使用**：Release store ↔ Acquire load（读到新值时）；CAS 循环常用 `(Acquire, Relaxed)`，失败次序不能是 `Release`/`AcqRel`。
4. **Relaxed 只服务「值本身」**：计数、ID 生成；不要用 Relaxed flag 发布旁边的非原子缓冲区。
5. **在弱序硬件上测**：x86-64 上 Acquire/Release 与 Relaxed 生成相同指令（见第 6 节），次序写错测不出来；CI 或开发机包含 aarch64 能提早暴露问题。
6. **工具链**：
   ```bash
   # 检测 UB（含 data race、别名违规）
   cargo +nightly miri test
   # 开启弱内存模拟 + 多随机种子，显著提升 lock-free 代码的问题检出率
   MIRIFLAGS="-Zmiri-many-seeds" cargo +nightly miri test
   # 运行期数据竞争检测（编译真实二进制，可跑集成测试）
   RUSTFLAGS="-Zsanitizer=thread" cargo +nightly test --target x86_64-unknown-linux-gnu
   ```
   另可用 [`loom`](https://docs.rs/loom) 对并发数据结构做交错穷举，比随机测试更彻底。
7. **混合大小/原子与非原子写**：无同步时禁止；需要转型访问时先用 `join`/锁建立 happens-before。
8. **别自己造轮子**：无锁队列、`Arc` 变体、seqlock 这类结构优先用 `crossbeam`、`arc-swap` 等经过验证的库。

## 参考

1. Mara Bos, *Rust Atomics and Locks*（免费在线全文，本领域权威专著）, <https://marabos.nl/atomics/>
2. The Rustonomicon — Atomics, <https://doc.rust-lang.org/nomicon/atomics.html>
3. The Rustonomicon — Data Races and Race Conditions, <https://doc.rust-lang.org/nomicon/races.html>
4. `std::sync::atomic` — Memory model for atomic accesses, <https://doc.rust-lang.org/std/sync/atomic/>
5. `std::sync::atomic::Ordering`, <https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html>
6. `std::sync::atomic::fence`, <https://doc.rust-lang.org/std/sync/atomic/fn.fence.html>
7. The Rust Reference — Behavior considered undefined, <https://doc.rust-lang.org/reference/behavior-considered-undefined.html>
8. Rust Unsafe Code Guidelines Reference（别名模型等未定型部分的现状）, <https://rust-lang.github.io/unsafe-code-guidelines/>
9. C++20 `[intro.races]` / `memory_order`, cppreference: <https://en.cppreference.com/w/cpp/atomic/memory_order>
10. The Rust Programming Language — Fearless Concurrency / Send and Sync, <https://doc.rust-lang.org/book/ch16-00-concurrency.html>
11. Miri — an interpreter for Rust's mid-level intermediate representation, <https://github.com/rust-lang/miri>
12. `loom` — 并发数据结构的交错穷举测试, <https://docs.rs/loom>
13. 本仓库相关笔记：[Java 内存模型 (JMM) 详细原理](../java/java-memory-model.md)、[Go 内存模型](../go/go-memory-model.md)
