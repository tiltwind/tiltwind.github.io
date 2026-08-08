<!---
markmeta_author: tiltwind
markmeta_date: 2026-07-18
markmeta_title: JVM 架构详解
markmeta_categories: program-language
markmeta_tags: java,jvm,classloader,runtime,jit,execution-engine
-->

# JVM 架构详解

**摘要**: 本文自顶向下梳理 Java 虚拟机 (JVM) 的整体架构，说明它在 Java 体系中的位置，拆解三大核心子系统——类加载子系统 (ClassLoader Subsystem)、运行时数据区 (Runtime Data Areas) 与执行引擎 (Execution Engine)，并深入讲解运行时数据区的线程私有/共享划分、堆的分代结构、执行引擎的解释器与 JIT 即时编译机制、本地方法接口 (JNI) 以及基于栈的字节码执行流程。文末给出各内存区常见的溢出错误对照，帮助建立完整的 JVM 心智模型。以 HotSpot 虚拟机为主要参照。

## 1. JVM 在 Java 体系中的位置

Java 的核心价值主张是 **"一次编写，到处运行" (Write Once, Run Anywhere, WORA)**。这一能力的实现依赖于 JVM 作为中间抽象层：

```
Java 源码 (.java)
      │  javac 编译
      ▼
字节码 (.class, Bytecode)   ← 平台无关的中间表示
      │  类加载 + 执行引擎
      ▼
JVM (针对具体 OS/CPU 的实现)
      │
      ▼
操作系统 / 硬件 (Linux/Windows/macOS, x86/ARM ...)
```

**为什么需要 JVM**：源码不直接编译成机器码，而是编译成一套统一的字节码指令集。字节码由各平台上的 JVM 负责翻译执行，从而屏蔽底层差异。JVM 是一份**规范 (Specification)**，任何满足《Java Virtual Machine Specification》的实现都可以运行标准字节码；HotSpot 是 Oracle JDK / OpenJDK 的默认实现。

值得注意：JVM 执行的是**字节码而非 Java 语言**。因此 Kotlin、Scala、Groovy、Clojure 等只要能编译成合规字节码，都能运行在 JVM 之上。

## 2. JVM 整体架构

JVM 内部可划分为三大子系统，加上支撑执行的本地方法接口：

```
        ┌──────────────────────────────────────────────┐
        │                     JVM                        │
        │                                                │
        │  ① 类加载子系统 (ClassLoader Subsystem)         │
        │     加载 → 链接 → 初始化                          │
        │                    │                            │
        │                    ▼                            │
        │  ② 运行时数据区 (Runtime Data Areas)            │
        │  ┌─────────────────────────────────────────┐   │
        │  │ 线程共享:   堆 (Heap) | 方法区 (Metaspace)│   │
        │  │ 线程私有:   PC 寄存器 | 虚拟机栈 | 本地方法栈│  │
        │  └─────────────────────────────────────────┘   │
        │                    │                            │
        │                    ▼                            │
        │  ③ 执行引擎 (Execution Engine)                  │
        │     解释器 (Interpreter) + JIT 编译器 + GC       │
        │                    │                            │
        └────────────────────┼───────────────────────────┘
                             ▼
        ④ 本地方法接口 (JNI) → 本地方法库 (Native Libraries)
```

- **① 类加载子系统**：负责把 `.class` 字节码从磁盘/网络加载到内存，完成验证、准备、解析、初始化。
- **② 运行时数据区**：JVM 运行期间使用的内存区域，是本文的核心。
- **③ 执行引擎**：读取字节码并执行，包含解释器、JIT 编译器和垃圾回收器 (GC)。
- **④ 本地方法接口**：调用 C/C++ 等本地代码的桥梁。

## 3. 类加载子系统 (ClassLoader Subsystem)

类的生命周期分为三个阶段：

1. **加载 (Loading)**：通过全限定名找到 `.class` 二进制字节流，在方法区生成对应的类元数据，并在堆中生成一个 `Class` 对象作为访问入口。
2. **链接 (Linking)**：
   - **验证 (Verification)**：确保字节码符合规范、不危害 JVM 安全。
   - **准备 (Preparation)**：为静态变量分配内存并设置**零值**（如 `int` 为 0）。
   - **解析 (Resolution)**：将常量池中的符号引用 (Symbolic Reference) 替换为直接引用 (Direct Reference)。
3. **初始化 (Initialization)**：执行类构造器 `<clinit>()`，为静态变量赋**真实值**、执行静态代码块。

### 3.1 双亲委派模型 (Parents Delegation Model)

类加载器采用双亲委派：收到加载请求时先委派给父加载器，父加载器无法完成才自己加载。三层内置加载器：

| 加载器 | 职责 |
| --- | --- |
| 启动类加载器 (Bootstrap ClassLoader) | 加载 `<JAVA_HOME>/lib` 核心类库 (`rt.jar`/模块)，由 C++ 实现 |
| 扩展/平台类加载器 (Extension / Platform ClassLoader) | 加载扩展类库（JDK 9+ 为 Platform ClassLoader） |
| 应用类加载器 (Application ClassLoader) | 加载 classpath 上的应用类 |

**为什么需要双亲委派**：保证核心类（如 `java.lang.Object`）在任何加载器下都是同一份，避免被篡改或重复加载，维护类型体系的一致性与安全性。

## 4. 运行时数据区 (Runtime Data Areas)

按线程隔离性，运行时数据区分为**线程私有**和**线程共享**两类。

```
┌───────────────────────────── 线程共享 ─────────────────────────────┐
│   堆 (Heap)                    方法区 / 元空间 (Metaspace)           │
└────────────────────────────────────────────────────────────────────┘
┌───────── 线程 1 (私有) ─────────┐  ┌───────── 线程 2 (私有) ────────┐
│ PC 寄存器 | 虚拟机栈 | 本地方法栈│  │ PC 寄存器 | 虚拟机栈 | 本地方法栈│
└─────────────────────────────────┘  └────────────────────────────────┘
```

### 4.1 程序计数器 (PC Register)｜线程私有

一块很小的内存，记录当前线程所执行字节码的行号（下一条指令地址）。每个线程独立一份，是线程切换后能恢复到正确执行位置的基础。它是**唯一不会发生 `OutOfMemoryError`** 的区域。执行本地方法 (native) 时其值为 undefined。

### 4.2 Java 虚拟机栈 (JVM Stack)｜线程私有

每个线程创建时分配一个虚拟机栈，**方法的每次调用对应一个栈帧 (Stack Frame)** 的入栈与出栈。栈帧结构：

| 组成 | 作用 |
| --- | --- |
| 局部变量表 (Local Variable Table) | 存放方法参数与局部变量，以槽 (slot) 为单位；`long`/`double` 占两个槽 |
| 操作数栈 (Operand Stack) | 字节码运算的工作区，指令从这里取操作数、压入结果 |
| 动态链接 (Dynamic Linking) | 指向运行时常量池中该栈帧所属方法的引用，支持运行期解析 |
| 返回地址 (Return Address) | 方法退出后回到调用者的位置 |

栈的深度不足会抛 `StackOverflowError`（如无限递归）；若栈可动态扩展且无法申请到足够内存，则抛 `OutOfMemoryError`。

### 4.3 本地方法栈 (Native Method Stack)｜线程私有

作用与虚拟机栈类似，区别在于它服务于 **native 方法**（通过 JNI 调用的 C/C++ 方法）。HotSpot 中虚拟机栈与本地方法栈合二为一。同样可能抛出 `StackOverflowError` 与 `OutOfMemoryError`。

### 4.4 堆 (Heap)｜线程共享

**几乎所有对象实例和数组都在堆上分配**，是 GC 管理的主要区域，也是最大的一块内存。为配合分代垃圾回收 (Generational GC)，堆通常划分为新生代与老年代：

```
┌──────────────────── Heap ────────────────────┐
│  新生代 (Young Generation)                     │
│  ┌────────┬──────────┬──────────┐             │
│  │ Eden   │ Survivor0│ Survivor1│  (默认 8:1:1)│
│  └────────┴──────────┴──────────┘             │
│  老年代 (Old / Tenured Generation)             │
│  ┌───────────────────────────────┐            │
│  │                               │            │
│  └───────────────────────────────┘            │
└───────────────────────────────────────────────┘
```

- **Eden**：新对象优先在此分配。
- **Survivor 0 / S1 (From/To)**：Minor GC 后存活对象在两个 Survivor 间来回复制，年龄计数递增。
- **老年代**：年龄达到阈值（默认 15）或大对象直接晋升至此，由 Major/Full GC 回收。

分代的依据是**弱分代假说**：绝大多数对象朝生夕灭，少数存活对象趋向长寿。因此对新生代频繁做低成本回收，对老年代低频回收，整体效率更高。堆内存不足时抛 `OutOfMemoryError: Java heap space`。

### 4.5 方法区 / 元空间 (Method Area / Metaspace)｜线程共享

方法区存储**类的元数据**：类结构信息、字段与方法数据、运行时常量池 (Runtime Constant Pool)、静态变量、JIT 编译后的代码缓存等。它是《JVM 规范》中的**逻辑概念**，不同版本实现不同：

| 版本 | 实现 | 位置 | 溢出错误 |
| --- | --- | --- | --- |
| JDK 7 及以前 | 永久代 (PermGen) | 堆内，大小固定 (`-XX:MaxPermSize`) | `OutOfMemoryError: PermGen space` |
| JDK 8 及以后 | 元空间 (Metaspace) | **本地内存 (Native Memory)，堆外** | `OutOfMemoryError: Metaspace` |

**为什么用 Metaspace 取代 PermGen**：PermGen 大小固定、难以调优，在动态生成大量类的场景（如反射、CGLIB 代理）易溢出。Metaspace 改用本地内存，默认可随需求动态扩展（可用 `-XX:MaxMetaspaceSize` 限制上限），避免了固定容量的痛点，也简化了 GC。

> 补充：字符串常量池 (String Pool) 在 JDK 7 时已从方法区移入堆中，便于回收。

## 5. 执行引擎 (Execution Engine)

执行引擎负责将字节码指令翻译为底层机器码并执行。为兼顾**启动速度**与**峰值性能**，HotSpot 采用"解释器 + JIT 编译器"的混合模式。

### 5.1 解释器 (Interpreter)

逐条读取、翻译并执行字节码。优点是启动快、无需预热；缺点是重复执行同一段代码时反复翻译，长期性能差。

### 5.2 JIT 即时编译器 (Just-In-Time Compiler)

对**热点代码 (HotSpot Code)** ——被频繁调用的方法或循环体——直接编译成本地机器码并缓存，后续直接执行机器码，大幅提速。**"HotSpot" 虚拟机的名字正来源于其热点探测能力**。

**热点探测 (Hot Spot Detection)** 采用基于计数器的方式：
- **方法调用计数器 (Invocation Counter)**：统计方法被调用次数。
- **回边计数器 (Back Edge Counter)**：统计循环回跳次数（支持栈上替换 OSR）。

计数超过阈值即触发编译。HotSpot 内置两个 JIT 编译器：

| 编译器 | 别名 | 特点 |
| --- | --- | --- |
| C1 | Client Compiler | 编译快、优化少，面向启动速度 |
| C2 | Server Compiler | 编译慢、优化激进，面向峰值性能 |

### 5.3 分层编译 (Tiered Compilation)

自 JDK 7 引入、JDK 8 起默认开启，融合 C1/C2 的优势，划分 **5 个层级 (Level 0–4)**：

| 层级 | 执行方式 | 说明 |
| --- | --- | --- |
| Level 0 | 解释执行 | 纯解释器，无编译 |
| Level 1 | C1 (无 profiling) | 简单方法完全优化，不做性能采集 |
| Level 2 | C1 (有限 profiling) | 采集方法调用与回边计数 |
| Level 3 | C1 (完全 profiling) | 采集完整 profiling 数据 |
| Level 4 | C2 | 依据 profiling 数据做激进优化，峰值性能最高 |

典型路径：解释执行 (L0) → C1 带完整采集 (L3) → 收集到足够热度后由 C2 (L4) 编译为高度优化代码。既保证冷启动快，又能在运行一段时间后达到高性能。

### 5.4 关键优化：逃逸分析 (Escape Analysis)

JIT 通过分析对象的作用域，判断对象是否"逃逸"出方法或线程，据此做优化：
- **栈上分配 (Stack Allocation)**：未逃逸对象可分配在栈上，随栈帧出栈自动回收，减轻 GC 压力。
- **标量替换 (Scalar Replacement)**：将对象拆解为独立的成员变量，避免整体分配。
- **锁消除 (Lock Elision)**：对不会被多线程访问的对象消除同步。

### 5.5 AOT 与 GraalVM（简述）

- **AOT (Ahead-Of-Time) 编译**：在程序运行**前**就把字节码编译为机器码，进一步缩短启动时间、降低运行时开销（JDK 9 曾实验性引入 `jaotc`，后废弃）。
- **GraalVM**：以高性能 Graal 编译器为核心的多语言运行时，其 **Native Image** 可把 Java 应用 AOT 编译成独立本地可执行文件，实现毫秒级启动与更低内存占用，适合云原生/Serverless 场景（代价是牺牲部分运行时动态特性）。

## 6. 本地方法接口 (JNI) 与本地方法库

**JNI (Java Native Interface)** 是 Java 代码与本地代码 (C/C++/汇编) 互操作的标准接口。当方法用 `native` 修饰时，其实现不在字节码中，而由**本地方法库 (Native Method Libraries)** 提供。

用途：复用已有 C/C++ 库、访问操作系统底层能力、性能敏感的计算。JDK 自身也大量使用（如 `Object.hashCode()`、`Thread.start0()`、I/O 操作）。执行 native 方法时使用本地方法栈。

## 7. 字节码执行流程（基于栈的指令集）

JVM 是一台**基于栈的虚拟机 (Stack-Based)**，运算通过操作数栈完成，而非依赖 CPU 寄存器。以 `int c = a + b;`（设 `a=1, b=2`）为例，对应字节码大致如下：

```text
iconst_1      // 将常量 1 压入操作数栈
istore_1      // 弹出栈顶，存入局部变量表 slot1 (a)
iconst_2      // 将常量 2 压入操作数栈
istore_2      // 弹出栈顶，存入局部变量表 slot2 (b)
iload_1       // 加载 a 压栈
iload_2       // 加载 b 压栈
iadd          // 弹出栈顶两个数相加，结果 3 压栈
istore_3      // 弹出结果存入 slot3 (c)
```

可用 `javap -c ClassName` 查看任意类的字节码。基于栈的设计**不依赖具体硬件寄存器，可移植性好**，是实现平台无关的关键；代价是指令数偏多、执行密度低于基于寄存器的设计，这部分开销由 JIT 编译弥补。

## 8. HotSpot 与其他虚拟机

| 虚拟机 | 说明 |
| --- | --- |
| HotSpot | Oracle JDK / OpenJDK 默认实现，业界主流，热点探测 + 分层编译 |
| OpenJ9 (Eclipse) | IBM 开源，低内存占用、快启动，适合容器环境 |
| GraalVM | 多语言、支持 Native Image AOT |
| Zing / Azul | 商业 VM，主打低延迟、超大堆、无停顿 GC (C4) |

本文所述内存区划分、执行机制以 HotSpot 为准，其他 VM 在遵循规范的前提下实现细节可能不同。

## 9. 常见内存溢出区域对照

| 数据区 | 线程隔离 | 存放内容 | 典型溢出错误 |
| --- | --- | --- | --- |
| 程序计数器 (PC Register) | 私有 | 当前指令地址 | 无（唯一不溢出） |
| 虚拟机栈 (JVM Stack) | 私有 | 栈帧（局部变量表等） | `StackOverflowError` / `OutOfMemoryError` |
| 本地方法栈 (Native Stack) | 私有 | native 方法调用 | `StackOverflowError` / `OutOfMemoryError` |
| 堆 (Heap) | 共享 | 对象实例、数组 | `OutOfMemoryError: Java heap space` |
| 方法区 / 元空间 (Metaspace) | 共享 | 类元数据、常量池、静态变量 | `OutOfMemoryError: Metaspace`（JDK7 为 PermGen space） |
| 直接内存 (Direct Memory) | — | NIO `DirectByteBuffer` 使用的堆外内存 | `OutOfMemoryError: Direct buffer memory` |

> 记忆要点：**"栈溢出多为 `StackOverflowError`，其余区满多为 `OutOfMemoryError`；PC 寄存器永不溢出。"**

## 参考

1. 周志明. 《深入理解 Java 虚拟机：JVM 高级特性与最佳实践（第 3 版）》. 机械工业出版社, 2019.
2. Oracle. *The Java Virtual Machine Specification (Java SE)*. <https://docs.oracle.com/javase/specs/jvms/se21/html/index.html>
3. Oracle. *HotSpot Virtual Machine Garbage Collection Tuning Guide*. <https://docs.oracle.com/en/java/javase/21/gctuning/index.html>
4. JEP 122: *Remove the Permanent Generation*. <https://openjdk.org/jeps/122>
5. Microsoft for Java Developers. *How Tiered Compilation works in OpenJDK*. <https://devblogs.microsoft.com/java/how-tiered-compilation-works-in-openjdk/>
6. Baeldung. *Tiered Compilation in JVM*. <https://www.baeldung.com/jvm-tiered-compilation>
7. GraalVM Documentation. *Native Image*. <https://www.graalvm.org/latest/reference-manual/native-image/>
</content>
</invoke>
