<!---
markmeta_author: tiltwind
markmeta_date: 2026-07-18
markmeta_title: Java 内存模型 (JMM) 详细原理
markmeta_categories: program-language
markmeta_tags: java,jmm,concurrency,volatile,happens-before,memory-barrier
-->

# Java 内存模型 (JMM) 详细原理

**摘要**: Java 内存模型 (Java Memory Model, JMM) 是一套抽象规范 (JSR-133)，它定义了多线程环境下共享变量的访问规则，屏蔽了不同 CPU 架构、编译器优化带来的内存访问差异。本文从"为什么需要 JMM"出发，讲清主内存/工作内存抽象、并发三大特性 (原子性/可见性/有序性)、重排序、核心的 happens-before 原则、`volatile`/`synchronized`/`final` 的内存语义、内存屏障 (Memory Barrier) 类型，以及顺序一致性模型与 JMM 的关系。

## 1. 为什么需要 JMM

### 1.1 硬件层面的问题

现代计算机为了缩小 CPU 与主内存 (Main Memory) 之间巨大的速度差异，引入了多级缓存 (L1/L2/L3 Cache) 和寄存器 (Register)。CPU 优先操作缓存，运算结束后再"某个时刻"写回主内存。由此带来两个根本问题：

- **可见性 (Visibility) 问题**：线程 A 修改了缓存中的共享变量，尚未写回主内存，线程 B 从主内存 (或自己的缓存) 读到的仍是旧值。
- **有序性 (Ordering) 问题**：为提升性能，编译器与处理器会对指令进行**重排序 (Reordering)**，单线程下结果不变，但多线程下可能观察到"乱序"的中间状态。

不同 CPU 架构 (x86、ARM、SPARC) 的缓存一致性协议和内存一致性模型强弱不同 (x86 是强内存模型 TSO，ARM/Power 较弱)。如果让 Java 程序员直接面对这些硬件差异，并发程序将无法跨平台。

### 1.2 JMM 是一个抽象规范

**JMM 不是物理内存布局，而是一组规则**。它规定了 JVM 如何将变量存储到内存、如何从内存读取变量，从而**屏蔽底层硬件与操作系统的差异**，为程序员提供"一次编写、到处一致"的并发语义保证。JMM 的核心目标是：在保证正确性的前提下，尽可能放开优化 (重排序) 的空间，同时给程序员一组可依赖的规则 (happens-before) 来推理程序行为。

## 2. 主内存与工作内存

JMM 定义了两级抽象内存：

| 抽象概念 | 对应关系 (类比) | 说明 |
|---|---|---|
| 主内存 (Main Memory) | 对应物理主内存 (堆中的共享数据) | 所有线程共享，存储共享变量 (实例字段、静态字段、数组元素) |
| 工作内存 (Working Memory) | 对应 CPU 缓存/寄存器 | 每个线程私有，保存该线程用到的共享变量的**副本** |

规则：

- 线程对共享变量的所有操作都必须在**工作内存**中进行，不能直接读写主内存。
- 线程间变量传递必须通过**主内存**：线程 A 改完写回主内存，线程 B 再从主内存读取。
- 局部变量、方法参数等**线程私有数据**不受 JMM 影响 (不存在共享，也就不存在可见性问题)。

> 注意：主内存/工作内存与 JVM 运行时的堆、栈、方法区不是同一层次的划分，前者是并发语义的抽象模型。

## 3. 八种内存交互操作

JMM 定义了 8 种原子操作 (JSR-133 后已用 happens-before 重新表述，此模型出自更早的规范，仍利于理解)：

| 操作 | 作用域 | 说明 |
|---|---|---|
| `lock` (锁定) | 主内存 | 把变量标识为线程独占 |
| `unlock` (解锁) | 主内存 | 释放锁定的变量 |
| `read` (读取) | 主内存 → | 从主内存读出变量值，传向工作内存 |
| `load` (载入) | → 工作内存 | 把 read 得到的值放入工作内存副本 |
| `use` (使用) | 工作内存 | 把工作内存值传给执行引擎 |
| `assign` (赋值) | 工作内存 | 把执行引擎的值赋给工作内存副本 |
| `store` (存储) | 工作内存 → | 把工作内存值传向主内存 |
| `write` (写入) | → 主内存 | 把 store 的值写入主内存变量 |

主要规则 (简述)：`read`/`load`、`store`/`write` 必须成对顺序出现 (不要求连续)；不允许 `assign` 后不同步回主内存；不允许无 `assign` 却把数据从工作内存同步回主内存；变量只能在主内存"诞生"；一个变量同一时刻只能被一个线程 `lock`，`lock` 会清空工作内存该变量值 (需重新 `load`)，`unlock` 前必须把变量同步回主内存 (`store`+`write`)。

## 4. 并发三大特性

| 特性 | 含义 | 由什么保证 |
|---|---|---|
| 原子性 (Atomicity) | 操作不可分割，要么全做要么全不做 | 基本读写 (除 long/double 的非原子协定) 天然原子；更大范围由 `synchronized`、`lock`、CAS/`Atomic` 类保证 |
| 可见性 (Visibility) | 一个线程的修改能被其他线程立即看到 | `volatile`、`synchronized` (unlock 前刷回主内存)、`final` |
| 有序性 (Ordering) | 程序执行顺序符合代码顺序 | `volatile` (禁止重排序)、`synchronized` (同一锁串行) |

> `long`/`double` 的非原子协定：JMM 允许 JVM 对 64 位变量的读写拆成两次 32 位操作，因此非 `volatile` 的 `long`/`double` 在 32 位平台可能读到"半个值"。实践中主流 64 位 JVM 均已保证其原子性。

## 5. 重排序 (Reordering)

从源码到最终执行，指令可能经历三类重排序：

1. **编译器重排序 (Compiler Reordering)**：编译器在不改变单线程语义前提下，重新安排语句执行顺序。
2. **指令级并行重排序 (Instruction-Level Parallelism, ILP)**：处理器将多条指令重叠执行，若无数据依赖则可乱序。
3. **内存系统重排序 (Memory System Reordering)**：由于使用缓存与读写缓冲区 (Store Buffer)，加载和存储操作看起来可能是乱序执行的。

### 5.1 as-if-serial 语义

**as-if-serial**：不管怎么重排序，**单线程**程序的执行结果不能被改变。为此编译器和处理器必须遵守**数据依赖 (data dependency)** 关系——存在数据依赖 (写后读、写后写、读后写) 的操作不会被重排序。

```java
int a = 1;      // 1
int b = 2;      // 2
int c = a + b;  // 3  依赖 1、2，不会被排到它们之前
```

操作 1 和 2 无依赖，可任意重排；但 3 依赖 1、2。as-if-serial 给单线程程序员制造了"程序按代码顺序执行"的假象。**问题在于**：as-if-serial 只保证单线程，多线程下这些看不见的重排序就会暴露为可见性/有序性 bug——这正是 happens-before 要解决的。

## 6. happens-before 原则 (核心)

happens-before 是 JMM 向程序员提供的**核心规则**：如果操作 A happens-before 操作 B，那么 A 的结果对 B **可见**，且 A 在执行顺序上"排在" B 之前 (语义上)。

> 关键澄清：happens-before **不代表**前者物理上一定先于后者执行。只要重排序后的结果与"存在 happens-before 关系"时一致，这种重排序就是合法的。happens-before 约束的是"结果可见性"，不是"时间先后"。

JSR-133 定义的规则 (8 条核心)：

| # | 规则 | 说明 |
|---|---|---|
| 1 | 程序顺序规则 (Program Order) | 一个线程内，书写在前的操作 happens-before 书写在后的操作 |
| 2 | 监视器锁规则 (Monitor Lock) | 对一个锁的 `unlock` happens-before 后续对同一个锁的 `lock` |
| 3 | volatile 变量规则 (Volatile) | 对一个 `volatile` 变量的**写** happens-before 后续对同一变量的**读** |
| 4 | 传递性 (Transitivity) | A happens-before B，B happens-before C，则 A happens-before C |
| 5 | 线程启动规则 (Thread start) | `Thread.start()` happens-before 该线程中的任意操作 |
| 6 | 线程终止规则 (Thread join) | 线程中的任意操作 happens-before 其他线程从该线程 `join()` 成功返回 |
| 7 | 线程中断规则 (Interruption) | 对线程 `interrupt()` 的调用 happens-before 被中断线程检测到中断 (`isInterrupted()`/抛出 `InterruptedException`) |
| 8 | 对象终结规则 (Finalizer) | 一个对象的构造函数结束 happens-before 它的 `finalize()` 方法开始 |

程序员只需依据这些规则组合 (尤其借助传递性) 来推理跨线程可见性，无需关心底层重排序与屏障细节。

## 7. volatile 详解

`volatile` 提供两个语义保证：**可见性** + **禁止 (特定) 重排序**；但**不保证原子性**。

### 7.1 可见性与有序性原理

- **写 volatile**：JMM 会把该线程工作内存中的值**立即刷新到主内存**。
- **读 volatile**：JMM 会把该线程工作内存中的值**置为无效**，强制从主内存重新读取。

结合 happens-before 的 volatile 规则 (写 happens-before 读)，写线程在写 volatile 之前的**所有**共享变量修改，对读线程读到 volatile 之后都可见 (借助屏障禁止重排序实现)。其内存语义等价于：volatile 写 ≈ 锁的释放 (release)，volatile 读 ≈ 锁的获取 (acquire)。

### 7.2 内存屏障实现 (JSR-133 Cookbook 保守策略)

编译器通过插入**内存屏障 (Memory Barrier)** 禁止特定重排序：

- 在每个 volatile **写**之前插入 **StoreStore** 屏障；
- 在每个 volatile **写**之后插入 **StoreLoad** 屏障；
- 在每个 volatile **读**之后插入 **LoadLoad** 屏障；
- 在每个 volatile **读**之后插入 **LoadStore** 屏障。

其中 volatile 写后的 **StoreLoad** 是开销最大、也是保证"写-读"顺序的关键屏障 (x86 上通常仅需这一条，因为 x86 只允许 StoreLoad 重排序)。

### 7.3 为何不保证原子性

`volatile` 只保证单次读/写的可见性与顺序，**复合操作**仍非原子。典型如 `count++` 实为 read-modify-write 三步：

```java
volatile int count = 0;

// 多线程并发调用，结果仍会丢失更新，最终值 < 预期
public void inc() {
    count++; // 读 count -> +1 -> 写回，中间可能被其他线程插入
}
```

需要原子性应使用 `synchronized`、`AtomicInteger` (CAS) 或 `LongAdder`。

### 7.4 DCL 单例为何需要 volatile

双重检查锁定 (Double-Checked Locking, DCL)：

```java
public class Singleton {
    // 必须 volatile
    private static volatile Singleton instance;

    public static Singleton getInstance() {
        if (instance == null) {                 // 第一次检查 (无锁)
            synchronized (Singleton.class) {
                if (instance == null) {         // 第二次检查 (持锁)
                    instance = new Singleton(); // 关键
                }
            }
        }
        return instance;
    }
}
```

`instance = new Singleton()` 并非原子操作，大致分三步：

1. 分配内存空间；
2. 初始化对象 (执行构造函数)；
3. 将 `instance` 引用指向该内存地址。

步骤 2 和 3 之间**没有数据依赖**，可能被重排序为 1→3→2。若线程 A 执行到 1→3 (引用已非 null，但对象尚未初始化完成，即"**半初始化对象 (partially constructed object)**")，此时线程 B 在第一次检查处发现 `instance != null`，直接返回并使用这个未初始化完成的对象，导致错误。

用 `volatile` 修饰 `instance`，禁止步骤 2、3 重排序 (StoreStore 屏障保证初始化先于引用赋值)，从根本上避免半初始化对象被其他线程读到。

## 8. synchronized 与 final 的内存语义

### 8.1 synchronized

- **原子性**：同一锁保护的临界区同一时刻只有一个线程执行。
- **可见性**：进入 `synchronized` 块 (lock/acquire) 前清空工作内存、从主内存重读；退出块 (unlock/release) 前把修改刷回主内存。对应 happens-before 的监视器锁规则。
- **有序性**：临界区内代码对同一把锁串行执行，从整体上保证有序 (临界区内部仍可在不破坏语义前提下重排序)。

### 8.2 final

`final` 字段提供特殊的初始化安全性 (initialization safety)：

- **写 final 的重排序规则**：构造函数内对 final 字段的写入，与随后把该对象引用赋给引用变量，这两者**不能重排序**。
- **读 final 的重排序规则**：初次读一个包含 final 字段的对象引用，与随后读该 final 字段，**不能重排序**。

因此**只要对象被正确构造 (构造期间 this 引用未逸出)**，其他线程不通过同步就能看到 final 字段的正确初始值。这正是不可变对象 (Immutable Object) 天然线程安全的底层依据。

## 9. 顺序一致性模型与 JMM

**顺序一致性 (Sequential Consistency, SC)** 是一个理论参照模型，有两大特征：

1. 一个线程中的所有操作按程序顺序执行；
2. 所有线程只看到**单一**的、全局一致的操作执行总顺序 (每个操作原子且立即可见)。

**JMM 与 SC 的关系**：

- 对**正确同步 (correctly synchronized，即无数据竞争)** 的程序，JMM 保证其执行结果与顺序一致性模型**一致**——这是 JMM 给程序员的核心承诺 (SC-DRF: Sequential Consistency for Data-Race-Free programs)。
- 对**未同步/存在数据竞争**的程序，JMM 只提供**最小安全性 (out-of-thin-air safety)**：读到的值要么是某次写入的值、要么是默认值 (0/null/false)，**不会读到凭空产生的值**，但不保证结果符合直觉顺序。

换言之，JMM 是"弱于顺序一致性但对正确同步程序等价于顺序一致性"的模型，以此换取更大的优化空间与性能。

## 10. 内存屏障类型汇总

内存屏障 (Memory Barrier / Fence) 是一类 CPU 指令，用来禁止屏障两侧特定类型的重排序，并强制刷新/失效缓存。JMM 抽象出四种：

| 屏障类型 | 语义 (示例 `Load1; Barrier; Load2`) |
|---|---|
| **LoadLoad** | 确保 Load1 的数据装载先于 Load2 及后续所有读操作 |
| **StoreStore** | 确保 Store1 的写入 (刷新到主内存) 先于 Store2 及后续所有写操作对其他处理器可见 |
| **LoadStore** | 确保 Load1 的数据装载先于 Store2 及后续所有写操作的刷出 |
| **StoreLoad** | 确保 Store1 的写入对其他处理器可见，先于 Load2 及后续所有读操作的装载 (**开销最大，兼具其余三者效果**) |

不同处理器提供的屏障强弱不同，JVM/编译器据此在生成的机器码中选择合适指令 (如 x86 的 `mfence`/`lock` 前缀)。程序员一般无需直接接触屏障，而是通过 `volatile`、`synchronized`、`final` 及 `java.util.concurrent` 间接使用。

## 参考

1. JSR-133: Java Memory Model and Thread Specification, <https://www.cs.umd.edu/~pugh/java/memoryModel/jsr133.pdf>
2. JSR-133 FAQ (Jeremy Manson & Brian Goetz), <https://www.cs.umd.edu/~pugh/java/memoryModel/jsr-133-faq.html>
3. Doug Lea, The JSR-133 Cookbook for Compiler Writers, <https://gee.cs.oswego.edu/dl/jmm/cookbook.html>
4. 方腾飞、魏鹏、程晓明，《Java 并发编程的艺术》，机械工业出版社
5. 周志明，《深入理解 Java 虚拟机 (第3版)》，机械工业出版社，第 12 章 "Java 内存模型与线程"
