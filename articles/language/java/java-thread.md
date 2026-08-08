<!---
markmeta_author: tiltwind
markmeta_date: 2026-07-19
markmeta_title: Java 线程 (Thread) 详解
markmeta_categories: program-language
markmeta_tags: java,concurrency,thread,runnable,threadlocal,interrupt,wait-notify
-->

# Java 线程 (Thread) 详解

**摘要**: 本文系统梳理 Java 线程 (`Thread`) 的基础知识与操作范例：线程与进程的区别、四种创建线程的方式 (`Thread`/`Runnable`/`Callable`+`Future`/线程池)、线程生命周期的六种状态 (NEW/RUNNABLE/BLOCKED/WAITING/TIMED_WAITING/TERMINATED) 与状态流转、`start`/`join`/`sleep`/`yield`/`interrupt` 等核心方法、优雅的中断协作机制、`wait`/`notify` 线程通信 (含生产者-消费者范例)、`ThreadLocal` 原理与内存泄漏、守护线程、未捕获异常处理器，以及 JDK 21 虚拟线程 (Virtual Threads)。锁与同步细节见 [Java 锁机制详解](java-locks.md)，内存可见性见 [Java 内存模型 (JMM) 详细原理](java-memory-model.md)，池化管理见 [Java 线程池原理详解](java-thread-pool.md)。

## 1. 进程与线程

- **进程 (Process)**：操作系统资源分配的基本单位，拥有独立的地址空间 (堆、方法区等)。进程间内存隔离，通信需借助 IPC (管道、共享内存、Socket)。
- **线程 (Thread)**：CPU 调度的基本单位，是进程内的执行流。同一进程内的多个线程**共享堆与方法区**，但各自拥有独立的**程序计数器 (PC)、虚拟机栈、本地方法栈**。

为什么用多线程：

- **提升吞吐/响应**：I/O 密集型任务 (网络、磁盘) 等待期间让 CPU 处理其他任务；CPU 密集型任务利用多核并行。
- **代价**：共享内存带来**线程安全**问题 (可见性/原子性/有序性，见 [JMM](java-memory-model.md))，以及**上下文切换**开销 (保存/恢复寄存器与栈、缓存失效)。

> Java 的 `Thread` 在 JDK 21 之前默认是**平台线程 (Platform Thread)**，与操作系统内核线程 1:1 映射，创建成本高 (默认栈 ~1MB)，数量受限。JDK 21 引入的**虚拟线程 (Virtual Thread)** 是轻量级用户态线程，见第 12 节。

## 2. 创建线程的方式

### 2.1 继承 Thread 类

重写 `run()` 方法，调用 `start()` 启动。

```java
public class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("running in " + Thread.currentThread().getName());
    }

    public static void main(String[] args) {
        new MyThread().start(); // 启动新线程，JVM 调用 run()
    }
}
```

缺点：Java 单继承，继承 `Thread` 后无法再继承其他类，扩展性差。

### 2.2 实现 Runnable 接口 (推荐)

将「任务」与「线程」解耦，`Runnable` 只描述任务，交给 `Thread` 执行。

```java
public class Task implements Runnable {
    @Override
    public void run() {
        System.out.println("task running");
    }

    public static void main(String[] args) {
        Thread t = new Thread(new Task(), "worker-1");
        t.start();

        // Lambda 写法 (Runnable 是函数式接口)
        new Thread(() -> System.out.println("lambda task")).start();
    }
}
```

> **`start()` vs `run()`**：`start()` 由 JVM 创建新线程并异步执行 `run()`；直接调用 `run()` 只是在**当前线程**同步执行普通方法，不会创建新线程。一个线程对象 `start()` 只能调用一次，重复调用抛 `IllegalThreadStateException`。

### 2.3 实现 Callable + Future (带返回值)

`Runnable.run()` 无返回值、不能抛受检异常。需要返回结果或异常时用 `Callable<V>`，配合 `FutureTask` (它同时实现了 `Runnable` 和 `Future`)。

```java
import java.util.concurrent.*;

public class CallableDemo {
    public static void main(String[] args) throws Exception {
        Callable<Integer> task = () -> {
            TimeUnit.SECONDS.sleep(1);
            return 1 + 2;
        };

        FutureTask<Integer> future = new FutureTask<>(task);
        new Thread(future).start();

        // get() 阻塞直到任务完成，可拿到返回值或捕获执行异常 (ExecutionException)
        Integer result = future.get();     // 也有 get(timeout, unit) 超时版本
        System.out.println("result = " + result);
    }
}
```

实际开发中更常见的是把 `Callable` 提交给线程池：`Future<Integer> f = executorService.submit(callable)`。

### 2.4 使用线程池 (生产实践)

**生产环境不应手动 `new Thread()`**，应使用线程池统一管理，避免无限制创建线程导致 OOM。详见 [Java 线程池原理详解](java-thread-pool.md)。

```java
ExecutorService pool = new ThreadPoolExecutor(
        4, 8, 60L, TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(1000),
        new ThreadPoolExecutor.CallerRunsPolicy());

pool.execute(() -> System.out.println("via pool"));
pool.shutdown();
```

> 严格说，线程的创建方式本质只有两种：**继承 `Thread`** 与**实现 `Runnable`**；`Callable`/`FutureTask`/线程池都是在 `Runnable` 基础上的封装。

## 3. 线程的生命周期与状态

Java 线程在 `java.lang.Thread.State` 枚举中定义了**六种**状态 (注意：这是 JVM 层面的状态，与操作系统的线程状态不完全对应)。

| 状态 | 含义 |
| --- | --- |
| `NEW` | 已创建 (`new Thread()`)，尚未 `start()` |
| `RUNNABLE` | 可运行：包含操作系统层面的「就绪 (ready)」和「运行中 (running)」，也包含正在进行 I/O 阻塞的情况 |
| `BLOCKED` | 阻塞：等待进入 `synchronized` 临界区 (竞争监视器锁失败) |
| `WAITING` | 无限期等待：调用 `wait()`/`join()`/`LockSupport.park()` 无超时版本，需被其他线程显式唤醒 |
| `TIMED_WAITING` | 限期等待：`sleep(t)`/`wait(t)`/`join(t)`/`park(t)`，超时自动返回 |
| `TERMINATED` | 终止：`run()` 执行完毕或抛出异常退出 |

### 3.1 状态流转图

```
        new Thread()
            │
            ▼
         ┌──────┐  start()   ┌──────────┐
         │ NEW  │ ─────────► │ RUNNABLE │ ◄───────────┐
         └──────┘            └──────────┘             │
                              │  ▲  │  ▲              │
      竞争 synchronized 锁失败 │  │  │  │ 获取到锁      │
                              ▼  │  │  │              │
                          ┌─────────┐│  │             │
                          │ BLOCKED ││  │             │
                          └─────────┘│  │             │
                                     │  │             │
     wait()/join()/park()  ──────────┘  │  notify()/notifyAll()
             │                          │  unpark()/join 结束
             ▼                          │
        ┌─────────┐                     │
        │ WAITING │ ────────────────────┘
        └─────────┘
                                     sleep(t)/wait(t)/join(t) 超时到期
        ┌───────────────┐  ──────────────────────────────┐
        │ TIMED_WAITING │ ◄──── sleep(t) 等带超时的等待     │
        └───────────────┘  ──────────────────────────────┘
                                     run() 结束
         RUNNABLE ─────────────────────────────► ┌────────────┐
                                                 │ TERMINATED │
                                                 └────────────┘
```

关键点：

- **`sleep` 不释放锁**，`wait` 会释放锁 (见第 6 节)。
- 从 `WAITING`/`TIMED_WAITING`/`BLOCKED` 返回时都要先重新竞争到锁 (若涉及锁) 才能回到 `RUNNABLE`。
- Java 没有单独的「运行中」状态，`RUNNABLE` 把「就绪」和「运行」合并了；正在读写网络/磁盘的线程在 JVM 看来也是 `RUNNABLE` (因为 JVM 不感知内核态的 I/O 阻塞)。

## 4. 线程的核心方法

| 方法 | 静态/实例 | 说明 |
| --- | --- | --- |
| `start()` | 实例 | 启动线程，异步执行 `run()` |
| `run()` | 实例 | 线程执行体，不应直接调用 |
| `Thread.sleep(ms)` | 静态 | 当前线程休眠指定毫秒，**不释放锁**，可被中断 |
| `Thread.yield()` | 静态 | 提示调度器让出 CPU (不保证生效)，仍处 `RUNNABLE` |
| `join()` | 实例 | 等待目标线程终止后再继续 (底层是 `wait`) |
| `Thread.currentThread()` | 静态 | 返回当前正在执行的线程对象 |
| `setDaemon(true)` | 实例 | 设为守护线程，必须在 `start()` 前调用 |
| `setPriority(n)` | 实例 | 设置优先级 1~10 (默认 5)，仅是提示，依赖 OS 调度 |
| `interrupt()` | 实例 | 请求中断目标线程 (见第 5 节) |
| `getState()` | 实例 | 返回线程当前 `Thread.State` |

### 4.1 join：等待其他线程结束

```java
Thread t1 = new Thread(() -> heavyWork());
t1.start();
t1.join();   // 主线程阻塞，直到 t1 执行完毕
System.out.println("t1 done, continue main");
```

`join()` 常用于「主线程等待所有子线程完成后再汇总结果」。带超时的 `join(long millis)` 可避免无限等待。

### 4.2 sleep vs yield vs wait

| 对比项 | `sleep(t)` | `yield()` | `wait()` |
| --- | --- | --- | --- |
| 所属类 | `Thread` (静态) | `Thread` (静态) | `Object` (实例) |
| 是否释放锁 | 否 | 否 | **是** |
| 进入状态 | `TIMED_WAITING` | 保持 `RUNNABLE` | `WAITING`/`TIMED_WAITING` |
| 唤醒方式 | 超时自动醒 | 立即有机会重新竞争 | `notify`/`notifyAll` 或超时 |
| 使用前提 | 无 | 无 | 必须持有该对象监视器锁 |

## 5. 线程中断机制 (Interrupt)

Java 的线程中断是一种**协作式 (cooperative)** 机制：`interrupt()` 只是设置目标线程的**中断标志位**，并不会强行终止线程；线程需要主动检查标志并响应。

> `Thread.stop()`/`suspend()`/`resume()` 已废弃：`stop` 会强行释放锁导致对象状态破坏，`suspend` 持锁挂起易死锁。**唯一正确的停止线程方式就是中断协作 + 标志位。**

### 5.1 三个相关方法

| 方法 | 类型 | 作用 | 是否清除标志 |
| --- | --- | --- | --- |
| `interrupt()` | 实例 | 设置中断标志 | 否 |
| `isInterrupted()` | 实例 | 查询目标线程是否被中断 | 否 |
| `Thread.interrupted()` | 静态 | 查询**当前**线程并**清除**标志 | **是** |

### 5.2 响应中断的两种情形

1. **阻塞方法**：`sleep`/`wait`/`join` 等在等待时若被中断，会**清除中断标志**并抛出 `InterruptedException`。
2. **运行中**：需在循环里主动轮询 `isInterrupted()`。

```java
public class InterruptDemo implements Runnable {
    @Override
    public void run() {
        // 用中断标志作为循环退出条件
        while (!Thread.currentThread().isInterrupted()) {
            try {
                doWork();
                TimeUnit.MILLISECONDS.sleep(100);
            } catch (InterruptedException e) {
                // sleep 被中断，标志已被清除，需重新设置以便上层感知
                Thread.currentThread().interrupt();
                break; // 退出循环，优雅结束
            }
        }
        cleanup(); // 释放资源
    }
}
```

**最佳实践**：捕获 `InterruptedException` 后，要么**向上抛出**，要么调用 `Thread.currentThread().interrupt()` **恢复中断标志**——绝不要「吞掉」中断 (空 catch 块)，否则上层无法感知线程应当停止。

## 6. 线程通信：wait / notify / notifyAll

`wait`/`notify`/`notifyAll` 是 `Object` 的方法，用于线程间协作。**调用前必须持有该对象的监视器锁 (即在 `synchronized` 块内)**，否则抛 `IllegalMonitorStateException`。

- `wait()`：释放锁并进入等待队列，直到被 `notify`/`notifyAll` 唤醒 (或超时/中断)。
- `notify()`：随机唤醒等待该对象锁的一个线程。
- `notifyAll()`：唤醒所有等待线程 (推荐，避免信号丢失)。

### 6.1 为什么 wait 必须在循环里

被唤醒后需**重新检查条件**，防止**虚假唤醒 (spurious wakeup)** 以及被唤醒后条件又被其他线程改变。规范写法：`while (条件不满足) obj.wait();` 而非 `if`。

### 6.2 生产者-消费者范例

```java
public class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;

    public BoundedBuffer(int capacity) {
        this.capacity = capacity;
    }

    public synchronized void put(T item) throws InterruptedException {
        while (queue.size() == capacity) {
            wait();            // 队列满，释放锁并等待
        }
        queue.add(item);
        notifyAll();           // 唤醒可能在等待的消费者
    }

    public synchronized T take() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();            // 队列空，释放锁并等待
        }
        T item = queue.poll();
        notifyAll();           // 唤醒可能在等待的生产者
        return item;
    }
}
```

> 现代开发更推荐用 JUC 的高层工具替代裸 `wait`/`notify`：`BlockingQueue` (`ArrayBlockingQueue`/`LinkedBlockingQueue`) 直接封装了生产者-消费者；`Condition` (配合 `ReentrantLock`) 提供多条件队列，见 [Java 锁机制详解](java-locks.md)。

## 7. ThreadLocal：线程本地变量

`ThreadLocal<T>` 为每个线程提供变量的**独立副本**，实现线程隔离，常用于：数据库连接/`SimpleDateFormat` 等非线程安全对象的线程封闭、全链路 `traceId` 传递、Spring 事务上下文。

```java
public class ThreadLocalDemo {
    private static final ThreadLocal<SimpleDateFormat> DATE_FORMAT =
            ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));

    public static String format(Date date) {
        return DATE_FORMAT.get().format(date); // 每个线程拿到自己的 SimpleDateFormat
    }
}
```

### 7.1 原理

每个 `Thread` 内部有一个 `ThreadLocal.ThreadLocalMap` 字段，`key` 是 `ThreadLocal` 对象 (弱引用 `WeakReference`)，`value` 是存储的值。`get`/`set` 都是操作**当前线程**自己的 map，因此天然隔离。

### 7.2 内存泄漏与 remove

`ThreadLocalMap` 的 `Entry` 的 key 是弱引用，value 是强引用。若 `ThreadLocal` 对象被回收 (key 变 null)，而线程 (尤其是**线程池中长期存活的线程**) 仍在，value 就无法被回收，导致**内存泄漏**。

**必须在 finally 中调用 `remove()`**：

```java
try {
    DATE_FORMAT.set(fmt);
    // ... 业务逻辑
} finally {
    DATE_FORMAT.remove(); // 关键：清理，防止线程复用时脏数据 + 内存泄漏
}
```

> 父子线程传递值用 `InheritableThreadLocal`；但在**线程池**场景下父子关系失效，需借助阿里 `TransmittableThreadLocal (TTL)`。

## 8. 守护线程 (Daemon Thread)

- **用户线程 (User Thread)**：JVM 会等待所有用户线程结束才退出。
- **守护线程 (Daemon Thread)**：为其他线程服务的后台线程 (如 GC 线程)。当**所有用户线程都结束**时，JVM 直接退出，不管守护线程是否执行完。

```java
Thread daemon = new Thread(() -> {
    while (true) { monitor(); }
});
daemon.setDaemon(true);  // 必须在 start() 之前设置
daemon.start();
```

注意：守护线程可能在任意时刻被终止，**不要在守护线程里执行 I/O、写文件等需要保证完成的操作** (可能来不及执行 finally)。

## 9. 未捕获异常处理器

线程的 `run()` 中抛出的未捕获异常不会传播到创建它的线程，默认打印堆栈后线程终止。可通过 `UncaughtExceptionHandler` 统一处理 (告警、日志):

```java
Thread t = new Thread(() -> { throw new RuntimeException("boom"); });
t.setUncaughtExceptionHandler((thread, ex) ->
        log.error("thread {} crashed", thread.getName(), ex));
t.start();

// 全局兜底
Thread.setDefaultUncaughtExceptionHandler((thread, ex) -> log.error("uncaught", ex));
```

> 线程池中，通过 `execute` 提交的任务异常会触发该处理器；但通过 `submit` 提交的异常被封装进 `Future`，需 `future.get()` 时才抛出 (`ExecutionException`)，容易被吞掉。

## 10. 线程安全概述

多线程共享可变状态时会产生线程安全问题，根因是并发三大特性 (原子性/可见性/有序性) 得不到保证。解决手段分层：

| 手段 | 说明 | 参考 |
| --- | --- | --- |
| `volatile` | 保证可见性与禁止重排序，不保证原子性 | [JMM](java-memory-model.md) |
| `synchronized` | 内建锁，保证原子性、可见性、有序性 | [Java 锁机制](java-locks.md) |
| `Lock` / AQS | `ReentrantLock`、读写锁、`Condition` 等 | [Java 锁机制](java-locks.md) |
| CAS / 原子类 | `AtomicInteger`/`LongAdder` 无锁并发 | [Java 锁机制](java-locks.md) |
| 并发容器 | `ConcurrentHashMap`/`CopyOnWriteArrayList`/`BlockingQueue` | — |
| 线程封闭 | `ThreadLocal`、栈封闭 (局部变量) | 第 7 节 |
| 不可变 | `final` + 不可变对象天然线程安全 | [JMM](java-memory-model.md) |

## 11. 死锁

多个线程互相持有对方需要的锁并等待，形成循环等待。产生的四个必要条件：**互斥、请求与保持、不可剥夺、循环等待**。

```java
// 典型死锁：两个线程以相反顺序获取两把锁
synchronized (lockA) {
    synchronized (lockB) { /* ... */ } // 线程1
}
synchronized (lockB) {
    synchronized (lockA) { /* ... */ } // 线程2，可能与线程1循环等待
}
```

避免手段：**固定加锁顺序**、使用 `tryLock(timeout)` 超时放弃、减小锁粒度、用无锁结构。排查用 `jstack` (查找 `Found one Java-level deadlock`)，详见 [Java 性能分析与诊断调优](java-performance-analysis.md)。

## 12. 虚拟线程 (Virtual Threads, JDK 21)

JDK 21 通过 JEP 444 正式引入**虚拟线程**：由 JVM 调度的轻量级线程，多路复用到少量平台线程 (载体线程 carrier thread) 上，创建成本极低 (可轻松创建百万级)，适合 **I/O 密集型高并发** 场景 (如 Web 服务每请求一线程)。

```java
// 直接启动一个虚拟线程
Thread.startVirtualThread(() -> System.out.println("in virtual thread"));

// 每个任务一个虚拟线程的执行器
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 1_000_000).forEach(i ->
            executor.submit(() -> { blockingIo(); return null; }));
}
```

要点：

- 虚拟线程在遇到阻塞 I/O 时会**自动挂起 (unmount)** 并让出载体线程，无需异步回调即可写出同步风格代码。
- **不要池化虚拟线程** (它本身就廉价)；避免在虚拟线程里用 `synchronized` 长时间持锁 (会「钉住 pinning」载体线程)，改用 `ReentrantLock`。
- 对 CPU 密集型任务无优势，仍应用平台线程池。详见 [Java 线程池原理详解](java-thread-pool.md) 相关章节。

## 13. 最佳实践

- **优先用线程池/`Executor`**，不要在业务代码里裸 `new Thread()`。
- **优先 `Runnable`/`Callable` 而非继承 `Thread`**，任务与执行分离。
- 给线程**起有意义的名字** (`new Thread(r, "order-consumer-1")`)，便于 `jstack`/日志定位。
- **正确处理中断**：不吞掉 `InterruptedException`，恢复标志或向上抛。
- **`ThreadLocal` 用完必须 `remove()`**，尤其在线程池中。
- 共享可变状态优先用 **JUC 并发工具** (`BlockingQueue`/`ConcurrentHashMap`/原子类) 而非裸 `wait`/`notify`。
- 设置**全局 `UncaughtExceptionHandler`** 兜底告警。
- 加锁遵循**固定顺序**、缩小临界区，避免死锁。

## 参考

1. Oracle, Java Thread (Java SE API 文档), <https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html>
2. Brian Goetz 等，《Java Concurrency in Practice》(Java 并发编程实战)，机械工业出版社
3. 方腾飞、魏鹏、程晓明，《Java 并发编程的艺术》，机械工业出版社
4. 周志明，《深入理解 Java 虚拟机 (第3版)》，机械工业出版社，第 12 章
5. JEP 444: Virtual Threads, <https://openjdk.org/jeps/444>
6. Oracle, Java Language Specification — Threads and Locks, <https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html>
