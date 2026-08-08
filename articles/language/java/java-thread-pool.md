<!---
markmeta_author: tiltwind
markmeta_date: 2026-07-18
markmeta_title: Java 线程池原理详解
markmeta_categories: program-language
markmeta_tags: java,concurrency,thread-pool,executor,threadpoolexecutor
-->

# Java 线程池原理详解

**摘要**: 本文从「为什么需要线程池」出发，系统梳理 Java `Executor` 框架体系，深入剖析 `ThreadPoolExecutor` 的七大核心参数、执行流程与源码原理（`ctl` 控制变量、`Worker` 机制、`addWorker`/`getTask`），讲解线程池的五种状态流转、阻塞队列与拒绝策略选型，并说明为何阿里规约禁用 `Executors` 工厂方法。最后给出线程数配置经验、`ForkJoinPool` 工作窃取、最佳实践清单，以及 JDK 21 虚拟线程（Virtual Threads）对传统线程池模型的影响。

## 1. 为什么需要线程池

线程是稀缺资源。直接 `new Thread().start()` 存在三个问题：

1. **创建/销毁开销大**：线程的创建涉及分配栈内存、内核态线程映射、系统调用，频繁创建销毁浪费 CPU。
2. **数量不可控**：请求量突增时无限制创建线程，会耗尽内存与 CPU，最终 OOM 或频繁上下文切换导致系统崩溃。
3. **难以管理**：无法统一监控、复用、调优。

线程池通过「**线程复用**」解决上述问题，核心价值：

- **降低资源消耗**：复用已创建的线程，避免重复创建销毁。
- **提高响应速度**：任务到达时无需等待线程创建即可执行。
- **可管理可监控**：统一控制并发数、队列、拒绝策略，便于监控与调优。

## 2. Executor 框架体系

JDK 的 `java.util.concurrent`（JUC）通过 `Executor` 框架将「任务提交」与「任务执行」解耦。核心关系如下：

```
Executor (接口: execute(Runnable))
   │
   └── ExecutorService (接口: submit/shutdown/invokeAll ...)
          │
          ├── AbstractExecutorService (抽象类: 模板实现)
          │        │
          │        ├── ThreadPoolExecutor        ← 通用线程池核心实现
          │        │        │
          │        │        └── ScheduledThreadPoolExecutor  ← 定时/周期任务
          │        │
          │        └── ForkJoinPool              ← 分治 + 工作窃取
          │
          └── ScheduledExecutorService (接口: schedule/scheduleAtFixedRate ...)
```

| 类型 | 职责 |
| --- | --- |
| `Executor` | 最顶层接口，只定义 `execute(Runnable)` |
| `ExecutorService` | 扩展生命周期管理（`shutdown`）与带返回值的 `submit`、`Future` |
| `ScheduledExecutorService` | 支持延时与周期性调度 |
| `ThreadPoolExecutor` | 最核心的线程池实现，本文重点 |
| `ForkJoinPool` | 面向分治任务，基于工作窃取（work-stealing） |

`Executors` 是一个**工厂类**，提供快捷创建上述线程池的静态方法（见第 9 节）。

## 3. ThreadPoolExecutor 七大核心参数

`ThreadPoolExecutor` 最完整的构造函数：

```java
public ThreadPoolExecutor(
    int corePoolSize,                 // 1. 核心线程数
    int maximumPoolSize,              // 2. 最大线程数
    long keepAliveTime,               // 3. 空闲线程存活时间
    TimeUnit unit,                    // 4. keepAliveTime 的时间单位
    BlockingQueue<Runnable> workQueue,// 5. 任务阻塞队列
    ThreadFactory threadFactory,      // 6. 线程工厂
    RejectedExecutionHandler handler  // 7. 拒绝策略
) { ... }
```

| 参数 | 说明 |
| --- | --- |
| `corePoolSize` | 核心线程数。默认即使空闲也不回收（除非 `allowCoreThreadTimeOut(true)`）。 |
| `maximumPoolSize` | 线程池允许的最大线程数（核心 + 非核心）。 |
| `keepAliveTime` | 非核心线程空闲超过此时间后被回收。 |
| `unit` | `keepAliveTime` 的时间单位（`TimeUnit`）。 |
| `workQueue` | 存放待执行任务的阻塞队列（见第 6 节）。 |
| `threadFactory` | 创建线程的工厂，可自定义线程名、优先级、守护属性。 |
| `handler` | 队列满且线程数达上限时的拒绝策略（见第 7 节）。 |

## 4. 执行流程原理

### 4.1 任务提交的四步决策

调用 `execute(task)` 时，线程池按以下优先级决策（**关键：队列优先于扩容**）：

```
              提交任务 execute(task)
                     │
                     ▼
        ┌──────────────────────────────┐
        │ 运行线程数 < corePoolSize ?    │──是──► 创建核心线程立即执行
        └──────────────┬───────────────┘
                     否 │
                     ▼
        ┌──────────────────────────────┐
        │ workQueue 能入队 (未满) ?      │──是──► 任务入队等待
        └──────────────┬───────────────┘
                     否 │
                     ▼
        ┌──────────────────────────────┐
        │ 运行线程数 < maximumPoolSize ? │──是──► 创建非核心线程执行
        └──────────────┬───────────────┘
                     否 │
                     ▼
              执行拒绝策略 handler
```

一句话概括：**先用核心线程，再塞队列，队列满了再开非核心线程到最大值，还不够就拒绝**。

> 常见误区：很多人以为线程数先加到 `maximumPoolSize` 再入队。实际上只要队列没满，就一直入队，而不会创建非核心线程。因此若使用**无界队列**，`maximumPoolSize` 永远不会生效。

补充两个易错点：

- **新建线程执行的是"刚提交的新任务"，而非队列头任务。** 第 3 步 `addWorker(command, false)` 把新任务作为该线程的 `firstTask`，新线程**先跑新任务**，跑完再回队列拉旧任务；队列头那个最老的任务反而继续排队。相当于新任务"插队"被立即执行。
- **线程本身没有"核心/非核心"标签。** 回收只看动态条件 `当前线程数 > corePoolSize`：满足时，**任一**空闲线程 `poll` 等待 `keepAliveTime` 未取到任务就退出，直到线程数缩回 `corePoolSize`。退出的不一定是"当初新建的那个"，只保证总数收敛，并非精确回收某几个特定线程（`allowCoreThreadTimeOut(true)` 时核心线程也参与淘汰，可缩到 0）。

### 4.2 ctl：状态与线程数的合二为一

`ThreadPoolExecutor` 用一个 `AtomicInteger ctl` 同时保存两个信息：

```java
// 高 3 位: 运行状态 runState; 低 29 位: 工作线程数 workerCount
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));

private static final int COUNT_BITS = Integer.SIZE - 3;          // 29
private static final int COUNT_MASK = (1 << COUNT_BITS) - 1;     // 低 29 位掩码, 约 5 亿

// 拆包 / 打包
private static int runStateOf(int c)     { return c & ~COUNT_MASK; } // 取高 3 位
private static int workerCountOf(int c)  { return c &  COUNT_MASK; } // 取低 29 位
private static int ctlOf(int rs, int wc) { return rs | wc; }
```

用一个原子整数管理两个字段，**避免了状态与线程数之间的并发不一致**，所有状态判断和线程计数都通过 CAS 无锁完成，是高性能设计的关键。理论最大线程数为 `2^29 - 1`（约 5.36 亿），而非 `Integer.MAX_VALUE`。

### 4.3 Worker：线程的载体

每个工作线程被封装为一个内部类 `Worker`，它**同时是 `Runnable` 又继承了 `AQS`**：

```java
private final class Worker extends AbstractQueuedSynchronizer implements Runnable {
    final Thread thread;        // 真正干活的线程
    Runnable firstTask;         // 第一个任务(可为 null)
    // ...
}
```

- `Worker` 继承 AQS 实现了一个**不可重入**的独占锁：加锁表示线程正在执行任务，`shutdown()` 时据此判断哪些线程可被中断（空闲线程才可中断）。
- 每个 `Worker` 启动后进入 `runWorker` 循环：执行 `firstTask`，随后不断从队列拉取任务。

### 4.4 addWorker 与 runWorker/getTask

**addWorker(firstTask, core)**：负责创建并启动新线程。

1. 自旋 + CAS 校验状态与线程数上限（`core` 决定用 `corePoolSize` 还是 `maximumPoolSize` 作为上界）。
2. CAS 成功增加 `workerCount` 后，创建 `Worker` 并 `t.start()`。

**runWorker(worker)** → **getTask()**：工作线程的主循环。

```
runWorker:
  while (task != null || (task = getTask()) != null) {
      w.lock();                 // 上锁, 标记忙碌
      beforeExecute();
      task.run();               // 执行任务
      afterExecute();
      w.unlock();
  }
  processWorkerExit();          // getTask 返回 null → 线程退出并回收
```

**getTask()** 是线程「复用」与「回收」的核心：

- 若允许超时回收（非核心线程，或开启 `allowCoreThreadTimeOut`），用 `workQueue.poll(keepAliveTime, unit)` 拉取；超时取不到任务则返回 `null`，线程退出。
- 否则用 `workQueue.take()` **阻塞等待**，实现核心线程的长期驻留复用。

这正是「一个线程执行完任务后不销毁、而是回到队列取下一个任务」的复用本质。

## 5. 线程池状态流转

`ctl` 高 3 位表示五种状态：

| 状态 | 含义 | 是否接收新任务 | 是否处理队列任务 |
| --- | --- | --- | --- |
| `RUNNING` | 运行中 | 是 | 是 |
| `SHUTDOWN` | 已关闭 | 否 | 是（处理完存量） |
| `STOP` | 已停止 | 否 | 否（并中断执行中任务） |
| `TIDYING` | 整理中 | 否 | 否，所有任务终止、线程数为 0 |
| `TERMINATED` | 已终止 | - | `terminated()` 钩子执行完毕 |

流转关系：

```
        shutdown()                队列空 & 线程数=0
RUNNING ───────────► SHUTDOWN ─────────────────────┐
   │                    │                            ▼
   │ shutdownNow()      │  (STOP 下线程数=0)      TIDYING ──► TERMINATED
   └────────────────► STOP ────────────────────────┘         (terminated() 完成)
```

- `shutdown()`：平缓关闭，不再接收新任务，但会执行完队列中的存量任务。
- `shutdownNow()`：立即停止，尝试中断所有执行中线程，并返回未执行的任务列表。

## 6. 阻塞队列选择

`workQueue` 的选择直接决定线程池行为：

| 队列 | 特点 | 典型用途 |
| --- | --- | --- |
| `ArrayBlockingQueue` | **有界**，数组实现，需指定容量 | 推荐，可控内存 |
| `LinkedBlockingQueue` | 链表实现，**默认无界**（`Integer.MAX_VALUE`）；可指定容量变有界 | 无界时有 OOM 风险 |
| `SynchronousQueue` | **不存储元素**，每个插入必须等待一个移除 | `CachedThreadPool`，直接交给线程 |
| `PriorityBlockingQueue` | 无界，支持**优先级**排序 | 任务有优先级需求 |
| `DelayedWorkQueue` | 无界，按**延时/到期时间**排序的堆 | `ScheduledThreadPoolExecutor` |

**经验**：生产环境优先使用**有界队列**（`ArrayBlockingQueue` 或指定容量的 `LinkedBlockingQueue`），配合合理的拒绝策略，避免任务无限堆积导致 OOM。

## 7. 四种拒绝策略

当队列已满且线程数达到 `maximumPoolSize` 时触发。`RejectedExecutionHandler` 的四个内置实现：

| 策略 | 行为 |
| --- | --- |
| `AbortPolicy`（默认） | 抛出 `RejectedExecutionException`，快速失败 |
| `CallerRunsPolicy` | 由**提交任务的调用者线程**自己执行该任务，起到「减速」反压作用 |
| `DiscardPolicy` | 静默丢弃当前任务，不抛异常 |
| `DiscardOldestPolicy` | 丢弃队列头部（最老）任务，再重试提交当前任务 |

自定义拒绝策略（例如记录日志、落库、告警）：

```java
RejectedExecutionHandler handler = (Runnable r, ThreadPoolExecutor executor) -> {
    log.warn("任务被拒绝, 当前队列大小={}, 活跃线程={}",
             executor.getQueue().size(), executor.getActiveCount());
    // 可选: 持久化任务、发送告警, 或降级处理
};
```

## 8. 手动创建线程池示例

阿里规约推荐的标准写法：

```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    8,                                       // corePoolSize
    16,                                      // maximumPoolSize
    60L, TimeUnit.SECONDS,                   // keepAliveTime
    new ArrayBlockingQueue<>(1024),          // 有界队列
    new ThreadFactoryBuilder()               // 命名线程, 便于排查(Guava)
        .setNameFormat("order-pool-%d")
        .build(),
    new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略: 调用者执行, 反压
);
```

若不使用 Guava，可手写 `ThreadFactory`：

```java
AtomicInteger idx = new AtomicInteger();
ThreadFactory factory = r -> {
    Thread t = new Thread(r, "order-pool-" + idx.incrementAndGet());
    t.setDaemon(false);
    return t;
};
```

## 9. Executors 工厂方法与阿里规约禁用原因

`Executors` 提供了若干快捷方法，但**《阿里巴巴 Java 开发手册》强制规定：线程池不允许使用 `Executors` 创建，而应通过 `ThreadPoolExecutor` 构造函数创建**，以便开发者清晰知晓运行规则、规避资源耗尽风险。

| 工厂方法 | 底层配置 | 风险 |
| --- | --- | --- |
| `newFixedThreadPool(n)` | core=max=n，`LinkedBlockingQueue`（**无界**） | 队列无限堆积 → **OOM** |
| `newSingleThreadExecutor()` | core=max=1，无界队列 | 同上 → **OOM** |
| `newCachedThreadPool()` | core=0，max=`Integer.MAX_VALUE`，`SynchronousQueue` | 线程数近乎无限 → **OOM** |
| `newScheduledThreadPool(n)` | max=`Integer.MAX_VALUE`，`DelayedWorkQueue` | 线程数近乎无限 → **OOM** |
| `newWorkStealingPool()` | 基于 `ForkJoinPool`，并行度=CPU 核数 | JDK 8+，任务需无强依赖顺序 |

**两类根本风险**：

1. **无界队列 OOM**：`FixedThreadPool`/`SingleThreadExecutor` 队列长度为 `Integer.MAX_VALUE`，请求堆积撑爆内存。
2. **无限线程 OOM**：`CachedThreadPool`/`ScheduledThreadPool` 最大线程数为 `Integer.MAX_VALUE`，瞬时高并发创建海量线程耗尽资源。

## 10. 线程数配置经验

线程数并无银弹，需结合任务性质并**以压测为准**。经典经验公式：

- **CPU 密集型**（计算为主）：`线程数 ≈ CPU 核数 + 1`。多出的 1 个用于弥补偶发的缺页中断或线程暂停带来的空闲。
- **IO 密集型**（网络/磁盘等待为主）：`线程数 ≈ CPU 核数 × 2`，或更精确地：

```
最优线程数 = CPU 核数 × CPU 利用率 × (1 + 平均等待时间 / 平均计算时间)
```

等待时间占比越高，可开的线程越多。实践中务必结合监控（QPS、RT、队列长度、拒绝次数）迭代压测，而非死记公式。

## 11. ForkJoinPool 与工作窃取

`ForkJoinPool` 面向**分治（divide and conquer）**任务：将大任务 `fork` 成小任务并行执行，再 `join` 合并结果（`RecursiveTask`/`RecursiveAction`）。

其核心是**工作窃取（Work-Stealing）**：

- 每个工作线程拥有自己的**双端队列（deque）**，新产生的子任务压入自己队列的头部。
- 线程从自己队列**头部**取任务执行；当自己队列为空时，**从其他线程队列的尾部「窃取」任务**。

好处：减少线程竞争、充分利用空闲线程，实现负载均衡。Java 8 的 `parallelStream()` 与 `CompletableFuture` 默认使用公共池 `ForkJoinPool.commonPool()`。

## 12. 线程池最佳实践

1. **手动创建、合理设参**：显式指定七大参数，拒绝 `Executors` 快捷方法。
2. **使用有界队列**：控制内存上限，配合拒绝策略实现反压。
3. **命名线程**：通过 `ThreadFactory` 设置有意义的线程名，便于日志排查与问题定位。
4. **正确处理异常**：
   - `execute()` 提交的任务若抛出异常，会直接抛给线程的 `UncaughtExceptionHandler`（线程终止，日志可见）。
   - `submit()` 返回 `Future`，任务异常被**封装在 `Future` 中吞掉**，只有调用 `future.get()` 时才以 `ExecutionException` 抛出。务必在 `get()` 处 try-catch，或在任务内部兜底捕获。
5. **优雅关闭**：应用退出时组合使用 `shutdown()` 与超时等待：

```java
executor.shutdown(); // 不再接收新任务, 执行完存量
try {
    if (!executor.awaitTermination(30, TimeUnit.SECONDS)) {
        executor.shutdownNow();          // 超时则强制中断
        executor.awaitTermination(10, TimeUnit.SECONDS);
    }
} catch (InterruptedException e) {
    executor.shutdownNow();
    Thread.currentThread().interrupt();  // 恢复中断标志
}
```

6. **监控**：定期采集 `getActiveCount()`、`getQueue().size()`、`getCompletedTaskCount()`、`getLargestPoolSize()`、拒绝次数等指标。
7. **动态调参**：`ThreadPoolExecutor` 支持运行时调整 `setCorePoolSize()`、`setMaximumPoolSize()`、`setKeepAliveTime()`；结合配置中心可做到不重启动态调优（美团动态线程池方案的核心思路）。
8. **隔离**：不同业务使用独立线程池，避免相互影响（如慢任务拖垮核心链路）。

## 13. JDK 21 虚拟线程对线程池模型的影响

JDK 21 正式发布**虚拟线程（Virtual Threads，Project Loom）**。它由 JVM 调度、极其轻量（可创建数百万个），阻塞时自动让出底层平台线程（carrier thread）。

对传统线程池模型的影响：

- **IO 密集场景无需再用线程池「限流复用平台线程」**。传统上池化的核心动机之一是「平台线程昂贵」，而虚拟线程创建极廉价，可「一个请求一个虚拟线程（thread-per-request）」。推荐用 `Executors.newVirtualThreadPerTaskExecutor()`——它**不是池**，而是为每个任务新建一个虚拟线程。
- **不要池化虚拟线程**：池化是为复用昂贵资源，而虚拟线程本身廉价，池化反而失去意义。
- **CPU 密集任务仍需传统线程池**：虚拟线程不会加速纯计算，此类场景继续使用固定大小的平台线程池。
- **注意点**：虚拟线程中避免长时间持有 `synchronized`（可能 pin 住载体线程，Loom 后续版本持续优化），推荐用 `ReentrantLock`。

简言之：虚拟线程改变的是「IO 密集型」的并发模型（从「池化平台线程」转向「海量廉价虚拟线程」），但 `ThreadPoolExecutor` 在 CPU 密集型与资源限流场景中依然不可替代。

## 参考

- 方腾飞 等，《Java 并发编程的艺术》，机械工业出版社，第 9 章「Java 中的线程池」。
- 《阿里巴巴 Java 开发手册（嵩山版）》——「并发处理」章节，线程池强制规约。<https://github.com/alibaba/p3c>
- Oracle，`ThreadPoolExecutor` (Java SE Javadoc)。<https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html>
- Oracle，`ForkJoinPool` (Java SE Javadoc)。<https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html>
- JEP 444: Virtual Threads (JDK 21)。<https://openjdk.org/jeps/444>
- JavaGuide，「Java 线程池详解」。<https://javaguide.cn/java/concurrent/java-thread-pool-summary.html>
