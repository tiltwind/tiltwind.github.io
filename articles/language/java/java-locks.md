<!---
markmeta_author: tiltwind
markmeta_date: 2026-07-18
markmeta_title: Java 锁机制详解
markmeta_categories: program-language
markmeta_tags: java,concurrency,lock,synchronized,aqs,cas,reentrantlock
-->

# Java 锁机制详解

**摘要**: Java 的锁体系从底层到上层大致分三层：`synchronized` 由 JVM 内建、依赖对象头 Mark Word 与 Monitor 实现，并通过锁升级(无锁→偏向→轻量级→重量级)优化性能；`CAS` 是无锁并发与乐观锁的硬件基础；`AQS` 则用一个 `volatile int state` + CLH 变体队列构建了 `ReentrantLock`、读写锁、`Semaphore`、`CountDownLatch` 等几乎所有 `java.util.concurrent` 同步器。本文自顶向下梳理锁的分类术语、`synchronized` 原理、锁升级、CAS、AQS 及其衍生同步器，并给出对比与实践要点。注意：**偏向锁(biased locking)自 JDK 15 起默认禁用(JEP 374)，JDK 18 已彻底移除**，理解它主要用于阅读旧资料与老版本 JVM。

## 1. 锁的分类概念(术语黑话)

这些"锁"多数不是具体实现，而是描述锁某一维度特性的概念，同一把锁可同时具备多个属性。

| 分类 | 含义 | 典型代表 |
| --- | --- | --- |
| 悲观锁 (Pessimistic) | 假设一定会冲突，操作前先加锁，独占执行 | `synchronized`、`ReentrantLock` |
| 乐观锁 (Optimistic) | 假设不冲突，不加锁，更新时用 CAS 校验，失败重试 | `CAS`、原子类、`StampedLock` 乐观读 |
| 公平锁 (Fair) | 按申请顺序(FIFO)获取锁 | `new ReentrantLock(true)` |
| 非公平锁 (Non-fair) | 允许插队，新线程先尝试抢占，吞吐更高 | `synchronized`、`ReentrantLock` 默认 |
| 可重入锁 (Reentrant) | 同一线程可重复获取已持有的锁而不死锁 | `synchronized`、`ReentrantLock` |
| 独占锁 (Exclusive) | 一次仅一个线程持有(写锁语义) | `ReentrantLock`、写锁 |
| 共享锁 (Shared) | 多个线程可同时持有(读锁语义) | 读锁、`Semaphore`、`CountDownLatch` |
| 自旋锁 (Spin) | 获取失败时不阻塞，循环重试，避免线程切换开销 | 轻量级锁、`CAS` 自旋 |
| 可中断锁 (Interruptible) | 等待锁的过程中可响应中断 | `lockInterruptibly()` |
| 读写锁 (Read-Write) | 读读共享、读写/写写互斥 | `ReentrantReadWriteLock` |

**为什么要区分**：并发场景不同选择不同。读多写少用读写锁或乐观读；争用低用自旋避免上下文切换；需要超时/中断/公平性时用 `ReentrantLock` 而非 `synchronized`。

## 2. synchronized 原理

`synchronized` 是 JVM 内建的悲观、可重入、非公平的独占锁，无需手动释放(异常/退出自动解锁)。

### 2.1 字节码层面

- **同步代码块**：编译为 `monitorenter` / `monitorexit` 指令对。为保证异常时也能释放，编译器会生成一个额外的 `monitorexit` 放在异常处理路径中。
- **同步方法**：方法的 `access_flags` 中设置 `ACC_SYNCHRONIZED` 标志，由方法调用/返回时隐式执行 monitor 的获取与释放。

两者本质相同，都是获取/释放对象关联的 Monitor。

### 2.2 对象头 Mark Word

每个 Java 对象在堆中的内存布局为：**对象头(Header) + 实例数据(Instance Data) + 对齐填充(Padding)**。对象头又含 Mark Word 与类型指针(Klass Pointer)。锁信息就存在 **Mark Word** 里。64 位 JVM 下 Mark Word 占 8 字节，其内容随锁状态复用(节省空间)：

```
|-------------------------------------------------------|--------------------|
|                  Mark Word (64 bits)                  |  锁状态 (2 bit tag) |
|-------------------------------------------------------|--------------------|
| unused:25 | hashCode:31 | unused:1 | age:4 | 0 | 01    |  无锁 (Normal)      |
| threadID:54 | epoch:2 | unused:1 | age:4 | 1 | 01      |  偏向锁 (已废弃)     |
| ptr_to_lock_record:62                        | 00      |  轻量级锁           |
| ptr_to_heavyweight_monitor:62                | 10      |  重量级锁           |
|                                              | 11      |  GC 标记            |
|-------------------------------------------------------|--------------------|
```

锁标志位(最低 2 bit)：`01` 无锁/偏向、`00` 轻量级、`10` 重量级、`11` GC。

### 2.3 Monitor (ObjectMonitor) 机制

重量级锁由 JVM 中 C++ 实现的 `ObjectMonitor` 支撑，核心字段：

- `_owner`：指向持有锁的线程。
- `_EntryList`：竞争锁失败被阻塞的线程队列。
- `_WaitSet`：调用 `wait()` 后进入等待的线程集合。
- `_count` / `_recursions`：重入计数。

重量级锁的阻塞/唤醒依赖操作系统的互斥量(mutex)，涉及用户态到内核态切换，代价高，故 HotSpot 引入锁升级来尽量避免。

## 3. 锁升级(锁膨胀)

**为什么**：绝大多数锁在运行期要么无竞争、要么只被同一线程反复获取。直接用重量级 mutex 浪费。HotSpot 让锁随竞争激烈程度逐步"膨胀"，且**只升不降**(不可逆)。

```
无锁 ──首次加锁──▶ 偏向锁 ──其他线程竞争──▶ 轻量级锁 ──自旋失败/竞争加剧──▶ 重量级锁
(Normal)         (Biased,已废弃)          (Lightweight)              (Heavyweight)
```

### 3.1 偏向锁 (Biased Locking) — 已废弃

- **原理**：假设锁总被同一线程获取。首次获取时通过 CAS 把线程 ID 记入 Mark Word，此后同线程再进入只需比对 ID，几乎零开销。
- **批量重偏向 (Bulk Rebias)**：某类对象的偏向撤销达到阈值(默认 20)后，对该类新对象整体重偏向到新线程，而非逐个撤销。
- **批量撤销 (Bulk Revoke)**：撤销进一步达阈值(默认 40)后，认定该类不适合偏向，禁用其偏向。
- **废弃**：偏向锁给 JVM 带来巨大维护复杂度，收益在现代应用中下降。**JDK 15 (JEP 374) 默认禁用**(需 `-XX:+UseBiasedLocking` 才启用)，**JDK 18 (JDK-8256425) 彻底移除**相关代码。新版本 JVM 中锁直接从无锁进入轻量级。

### 3.2 轻量级锁 (Lightweight Lock)

- **原理**：线程在栈帧中建立 Lock Record，用 CAS 尝试把对象 Mark Word 替换为指向该 Lock Record 的指针。成功即持有锁。
- **适用**：线程交替执行、无实际竞争(仅是不同线程先后进入)。
- **膨胀**：若 CAS 失败(存在真实竞争)，会自旋一定次数(自适应自旋)重试；仍失败则膨胀为重量级锁。

### 3.3 重量级锁 (Heavyweight Lock)

Mark Word 指向 `ObjectMonitor`，未获取锁的线程被 OS 挂起(阻塞)，让出 CPU。竞争激烈时避免了空转自旋，但有内核态切换成本。

## 4. CAS (Compare-And-Swap)

**为什么**：加锁-解锁开销大。CAS 是一条 CPU 原子指令(x86 的 `cmpxchg`)，是乐观锁与无锁(lock-free)算法的基础。

**语义**：`CAS(V, expected, new)` — 当内存位置 V 的当前值等于 expected 时，原子地写入 new 并返回成功，否则失败。Java 中经由 `sun.misc.Unsafe` 的 `compareAndSwapXxx`(JDK 9+ 推荐 `VarHandle`)暴露，原子类如 `AtomicInteger` 即基于它。

```java
AtomicInteger counter = new AtomicInteger(0);

// 无锁自增：读取旧值 -> CAS 尝试写新值 -> 失败则循环重试
public int increment() {
    int prev, next;
    do {
        prev = counter.get();
        next = prev + 1;
    } while (!counter.compareAndSet(prev, next));
    return next;
}
// 实际 AtomicInteger.getAndIncrement() 内部即此逻辑
```

### CAS 三大问题

1. **ABA 问题**：值从 A→B→A，CAS 误认为"没变过"。**解决**：加版本号/时间戳，用 `AtomicStampedReference`(带 stamp)或 `AtomicMarkableReference`(带布尔标记)。
2. **自旋开销**：高竞争下大量失败重试空耗 CPU。**缓解**：`LongAdder`(分段累加,热点分散)、限制自旋次数、或退化为阻塞锁。
3. **只能保证单个变量的原子性**：无法原子更新多个共享变量。**解决**：把多个变量封装进一个对象，用 `AtomicReference` 整体 CAS；或改用锁。

## 5. AQS (AbstractQueuedSynchronizer)

`AQS` 是 Doug Lea 设计的同步器框架(《The java.util.concurrent Synchronizer Framework》),是 `ReentrantLock`、读写锁、`Semaphore`、`CountDownLatch` 等的公共基类。

### 5.1 核心结构

- **`volatile int state`**：同步状态。含义由子类定义 —— 对 `ReentrantLock` 是重入次数，对 `Semaphore` 是剩余许可，对 `CountDownLatch` 是计数。通过 CAS(`compareAndSetState`)修改。
- **CLH 变体双向队列**：竞争失败的线程包装成 `Node`,进入一个 FIFO 双向链表(带 head/tail),阻塞等待。它是 CLH 队列的变体(改用显式前驱后继指针 + 阻塞而非纯自旋)。

```
        获取失败入队              唤醒后继
head ──▶ Node(A,持锁) ──▶ Node(B,阻塞) ──▶ Node(C,阻塞) ◀── tail
         ▲ prev/next 双向链接        waitStatus 标记状态
```

- **Node 状态 (waitStatus)**：`CANCELLED(1)` 取消、`SIGNAL(-1)` 后继需被唤醒、`CONDITION(-2)` 在条件队列、`PROPAGATE(-3)` 共享传播。
- **模板方法模式**：AQS 实现排队/阻塞/唤醒的骨架，子类只需重写：`tryAcquire` / `tryRelease`(独占)、`tryAcquireShared` / `tryReleaseShared`(共享)、`isHeldExclusively`。

### 5.2 独占模式 acquire / release 流程

```
acquire(arg):
  if (!tryAcquire(arg))              // 子类尝试直接获取(改 state)
      addWaiter + acquireQueued      // 失败则入队，前驱是 head 时再试，
                                     // 否则 LockSupport.park() 阻塞
release(arg):
  if (tryRelease(arg))               // 子类释放(改 state)
      unparkSuccessor(head)          // 唤醒队列后继节点
```

共享模式(`acquireShared`/`releaseShared`)类似，区别在于获取成功后会向后**传播(propagate)**唤醒后续共享节点,实现多个线程同时通过。

### 5.3 Condition 条件队列

`ConditionObject` 由 AQS 提供，等价于 `synchronized` 里的 `wait/notify`,但一把锁可创建多个 Condition(多条件队列)。`await()` 将线程移入**条件队列**并释放锁；`signal()` 把节点从条件队列转移回**同步队列**重新竞争锁。

## 6. 基于 AQS 的同步器

### 6.1 ReentrantLock

可重入独占锁，`state` 记录重入次数。支持公平与非公平(默认非公平)。

```java
ReentrantLock lock = new ReentrantLock();     // 非公平
// ReentrantLock lock = new ReentrantLock(true); // 公平
lock.lock();
try {
    // 临界区
} finally {
    lock.unlock();   // 必须在 finally 中释放
}
```

**公平 vs 非公平**：非公平锁 `lock()` 先直接 CAS 抢占 state，抢不到才入队，吞吐高但可能饿死；公平锁 `tryAcquire` 会先用 `hasQueuedPredecessors()` 检查队列是否有排队者，有则不抢占，严格 FIFO。

### 6.2 ReentrantReadWriteLock

读写分离，`state` 高 16 位记读锁(共享)持有数、低 16 位记写锁(独占)重入数。

- **读读共享、读写互斥、写写互斥**，适合读多写少。
- **锁降级 (Lock Downgrading)**：允许持写锁的线程再获取读锁，然后释放写锁，从而在不放开数据可见性的前提下降级为读锁；**不支持升级**(持读锁直接申请写锁会死锁)。

```java
ReentrantReadWriteLock rwl = new ReentrantReadWriteLock();
Lock readLock = rwl.readLock();
Lock writeLock = rwl.writeLock();

// 锁降级：写锁 -> 读锁
writeLock.lock();
try {
    // 修改数据
    readLock.lock();       // 在持有写锁时获取读锁
} finally {
    writeLock.unlock();    // 释放写锁，此时仍持读锁 => 降级完成
}
try {
    // 使用数据(读锁保护，其他线程可读不可写)
} finally {
    readLock.unlock();
}
```

### 6.3 Semaphore

信号量，共享锁。`state` 表示可用许可数，`acquire()` 减、`release()` 加，用于限流/资源池(如限制并发数)。许可耗尽时线程阻塞。

### 6.4 CountDownLatch

一次性倒计时门闩，共享锁。`state` 初始化为计数 N，`countDown()` 递减，`await()` 阻塞直到 state 为 0。**不可重置**,用于"等待一组操作全部完成"。

### 6.5 CyclicBarrier(对比 CountDownLatch)

栅栏，让一组线程互相等待到达同一屏障点后再一起继续。基于 `ReentrantLock` + `Condition` 实现(非直接 AQS 计数)。

| 维度 | CountDownLatch | CyclicBarrier |
| --- | --- | --- |
| 等待关系 | 一个/多个线程等待其他线程完成 | 一组线程互相等待 |
| 可重用 | 否(一次性) | 是(可循环使用) |
| 计数方向 | 递减到 0 | 累加到目标数后重置 |
| 屏障动作 | 无 | 可设 barrierAction(全部到达后执行) |
| 底层 | AQS 共享 | ReentrantLock + Condition |

### 6.6 StampedLock (JDK 8)

改进的读写锁，提供三种模式：**写锁、悲观读锁、乐观读(Optimistic Read)**。核心亮点是乐观读：**不加锁**先读取，读后用 `validate(stamp)` 校验期间是否有写发生，无写则数据有效——读多写极少时性能远超 `ReentrantReadWriteLock`。

```java
StampedLock sl = new StampedLock();
long stamp = sl.tryOptimisticRead();   // 乐观读，不阻塞写
double curX = x, curY = y;             // 读共享变量
if (!sl.validate(stamp)) {             // 校验期间是否被写修改
    stamp = sl.readLock();             // 校验失败，升级为悲观读锁
    try { curX = x; curY = y; }
    finally { sl.unlockRead(stamp); }
}
```

注意：`StampedLock` **不可重入**、不支持 Condition，写锁不响应中断需用 `readLockInterruptibly`。

## 7. synchronized vs ReentrantLock

| 维度 | synchronized | ReentrantLock |
| --- | --- | --- |
| 实现层 | JVM 内建(monitorenter/exit) | JDK API(基于 AQS) |
| 锁释放 | 自动(异常/退出块) | 手动 `unlock()`(须 finally) |
| 公平性 | 仅非公平 | 可选公平/非公平 |
| 可中断 | 不支持 | `lockInterruptibly()` |
| 超时获取 | 不支持 | `tryLock(time, unit)` |
| 尝试获取 | 不支持 | `tryLock()`(立即返回) |
| 条件变量 | 单一(wait/notify) | 多个 `Condition` |
| 可重入 | 是 | 是 |
| 性能 | 现代 JVM 已优化，接近 | 高竞争下更灵活 |

**选型**：优先 `synchronized`(简单、自动释放、JVM 持续优化);需要超时、可中断、公平、多条件队列或 `tryLock` 时才用 `ReentrantLock`。

## 8. LockSupport (park / unpark)

`LockSupport` 是 AQS 阻塞/唤醒线程的底层工具，封装了 `Unsafe.park/unpark`。

- `park()`：阻塞当前线程；`unpark(thread)`：唤醒指定线程。
- 基于**许可 (permit)** 语义：每个线程关联一个许可(最多累积 1 个，不叠加)。`unpark` 发放许可，`park` 消费许可——有许可则立即返回并清零，无许可则阻塞。

### 8.1 park/unpark vs wait/notify

| 维度 | `park/unpark` (LockSupport) | `wait/notify` (Object monitor) |
| --- | --- | --- |
| 是否需持有锁 | **不需要**，可直接调用 | 必须在 `synchronized` 块内(持有 monitor)，否则抛 `IllegalMonitorStateException` |
| 唤醒目标 | **精确到指定线程**(`unpark(thread)`) | `notify` 随机唤醒一个等待线程，`notifyAll` 唤醒全部 |
| 顺序依赖 | `unpark` 可**先于** `park` 调用，许可预留，不丢唤醒信号 | `notify` 必须在 `wait` **之后**，先 `notify` 后 `wait` 会永久丢失唤醒(信号丢失) |
| 信号累积 | 许可最多 1 个，多次 `unpark` 不叠加(连续两次 `unpark` 只能解除一次 `park`) | 无信号累积，`notify` 时无等待线程则信号直接丢弃 |
| 底层实现 | `Unsafe.park/unpark`，无需进入 monitor | JVM monitor 的 `ObjectMonitor` 等待队列 |
| 中断响应 | `park` 被中断后**返回**(不抛异常)，需自行检查中断标志 | `wait` 被中断抛 `InterruptedException` |

**核心优势**：`park/unpark` 解耦了阻塞与锁，且不受调用顺序限制，因此成为 AQS 实现线程阻塞/唤醒的底层原语——`wait/notify` 的"先 wait 后 notify"约束和"随机唤醒"特性都难以满足 AQS 精确、有序唤醒队列节点的需求。

> 注意：`park` 可能**无因返回 (spurious wakeup)**，与 `wait` 一样，使用时应在**循环中配合条件判断**，不能假设返回即条件满足。

## 9. 死锁 (Deadlock)

**产生的四个必要条件**(同时满足才会死锁)：

1. **互斥 (Mutual Exclusion)**：资源同一时刻只能被一个线程占用。
2. **持有并等待 (Hold and Wait)**：持有资源的同时等待其他资源。
3. **不可剥夺 (No Preemption)**：资源不能被强制抢占，只能自愿释放。
4. **循环等待 (Circular Wait)**：存在线程与资源的环形等待链。

**避免**(破坏任一条件)：

- 破坏"持有并等待"：一次性申请全部资源。
- 破坏"不可剥夺"：用 `tryLock(timeout)` 获取不到就释放已持有的锁并重试。
- 破坏"循环等待"：**按固定全局顺序**申请锁(最常用、最实用)。
- 排查工具：`jstack`、`jconsole`、`ThreadMXBean.findDeadlockedThreads()`。

## 参考

1. 方腾飞、魏鹏、程晓明. 《Java 并发编程的艺术》. 机械工业出版社. (锁、AQS、CAS、并发工具类章节)
2. Doug Lea. *The java.util.concurrent Synchronizer Framework*. <https://gee.cs.oswego.edu/dl/papers/aqs.pdf>
3. 周志明. 《深入理解 Java 虚拟机(第 3 版)》. 机械工业出版社. (对象内存布局、Mark Word、锁优化章节)
4. JEP 374: Deprecate and Disable Biased Locking. <https://openjdk.org/jeps/374>
5. JDK-8256425: Obsolete Biased Locking in JDK 18. <https://bugs.openjdk.org/browse/JDK-8256425>
6. OpenJDK HotSpot 源码 `markWord.hpp` / `objectMonitor.cpp` / `AbstractQueuedSynchronizer` 源码.
