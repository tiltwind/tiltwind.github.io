<!---
markmeta_author: tiltwind
markmeta_date: 2026-07-18
markmeta_title: JVM 垃圾回收器原理详解
markmeta_categories: program-language
markmeta_tags: java,jvm,gc,g1,zgc,cms,shenandoah,garbage-collection
-->

# JVM 垃圾回收器原理详解

**摘要**: 本文系统梳理 HotSpot JVM 的垃圾回收 (Garbage Collection, GC) 体系。先讲清 GC 的基础理论——判活算法、引用类型、三大回收算法、分代收集理论、三色标记与并发漏标问题；再逐个剖析从 Serial 到 ZGC 的每一款回收器的**工作区域、算法、并发模型、停顿特征、适用场景与开启参数**，并标注它们在各 JDK 版本中的状态演进（如 CMS 已于 JDK 14 移除、ZGC 自 JDK 21 引入分代化）。文末以对比表和选型建议收尾。理解 GC 的关键不在记住参数，而在理解「用什么代价换什么收益」：吞吐量 (Throughput)、延迟 (Latency)、内存占用 (Footprint) 三者不可兼得。

---

## 1. GC 基础理论

### 1.1 为什么需要 GC 与判活算法

GC 要解决的核心问题：**哪些对象还"活着"，哪些是垃圾**。判活有两种思路。

**引用计数法 (Reference Counting)**：给对象加一个计数器，被引用时 +1，引用失效时 -1，计数为 0 即可回收。原理简单、判定实时，但 HotSpot **不采用**它，根本原因是**循环引用 (Circular Reference)**：两个对象互相引用，即使外部已无法访问，计数也永远不为 0，导致内存泄漏。

```java
a.ref = b;
b.ref = a;
a = null; b = null; // a、b 互相引用，计数都为 1，但已是垃圾
```

**可达性分析 (Reachability Analysis)**：以一系列称为 **GC Roots** 的对象为起点向下搜索引用链，凡是从 GC Roots 不可达的对象即为垃圾。这是 HotSpot 实际采用的算法，天然免疫循环引用。GC Roots 包括：

- 虚拟机栈（栈帧中的局部变量表）引用的对象
- 方法区中类静态属性、常量引用的对象
- 本地方法栈中 JNI（Native 方法）引用的对象
- 被同步锁 (`synchronized`) 持有的对象、JVM 内部引用（如基本类型 Class、系统类加载器）等

### 1.2 四种引用强度

判活并非"非活即死"。JDK 1.2 后将引用分为四级，强度递减：

| 引用类型 | 回收时机 | 典型用途 |
|---|---|---|
| 强引用 (Strong Reference) | 只要可达就绝不回收 | 普通 `new` 出来的对象 |
| 软引用 (Soft Reference) | 内存不足（将 OOM）时回收 | 内存敏感缓存 |
| 弱引用 (Weak Reference) | 下次 GC 必被回收 | `WeakHashMap`、`ThreadLocal` 的 key |
| 虚引用 (Phantom Reference) | 无法通过它取得对象，仅在被回收时收到通知 | 管理堆外内存 (Cleaner) |

### 1.3 垃圾收集算法

回收器的实现都建立在三种基础算法之上：

1. **标记-清除 (Mark-Sweep)**：标记出所有存活对象，再清除未标记的。缺点是产生**内存碎片 (Fragmentation)**，且标记、清除两个阶段效率都随对象数量下降。
2. **标记-复制 (Mark-Copy)**：将内存分两块，只用一块；回收时把存活对象复制到另一块，然后整块清空。无碎片、分配快（指针碰撞），但**浪费一半空间**。新生代 (Young Generation) 广泛采用其优化版——**Appel 式回收**（Eden + 2 个 Survivor，默认 8:1:1，只浪费 10%）。
3. **标记-整理 (Mark-Compact)**：标记后让存活对象向一端移动，清理边界外内存。无碎片、不浪费空间，但移动对象需**更新引用并 STW**，成本高，适合老年代 (Old Generation)。

### 1.4 分代收集理论

现代回收器大多基于**分代收集 (Generational Collection)**，其依据两条经验假说：

- **弱分代假说 (Weak Generational Hypothesis)**：绝大多数对象朝生夕灭。
- **强分代假说 (Strong Generational Hypothesis)**：熬过越多次 GC 的对象越难消亡。

据此将堆划分为**新生代**与**老年代**：新生代对象存活率低，用标记-复制、回收频繁快速（Minor GC）；老年代对象存活率高，用标记-清除或标记-整理、回收缓慢（Major/Full GC）。

**跨代引用 (Cross-Generational Reference)** 带来难题：老年代对象可能引用新生代对象，若做 Minor GC 就必须扫描整个老年代作为 GC Roots，代价太高。解决方案是**记忆集 (Remembered Set)**——在新生代维护一个数据结构，记录"老年代中哪些区域存在跨代引用"，Minor GC 时只需把这些区域也加入 GC Roots，无需全扫老年代。

记忆集的具体实现是**卡表 (Card Table)**：把老年代内存按固定大小（HotSpot 中为 512 字节）划分为"卡页 (Card Page)"，卡表是一个字节数组，每个元素对应一个卡页。当卡页内某对象存在跨代引用时，该字节被置为 1（称"变脏 Dirty"）。Minor GC 只扫描变脏的卡页即可。卡表的维护由**写屏障**（见 1.6）在赋值时完成。

### 1.5 STW 与三色标记

**Stop-The-World (STW)**：GC 某些阶段必须暂停所有用户线程，以保证对象引用关系不在分析过程中变化。STW 时长直接决定应用的**延迟**，是低延迟回收器优化的核心目标。

**三色标记法 (Tri-color Marking)** 是并发标记的理论模型，把对象按标记进度染成三色：

- **白色 (White)**：尚未被访问。分析结束时仍为白色 = 垃圾。
- **灰色 (Gray)**：自身已被访问，但其引用的对象还没访问完。
- **黑色 (Black)**：自身及其所有引用都已访问完，安全存活。

### 1.6 并发标记的漏标问题与写屏障

若标记与用户线程**并发**执行，用户线程可能在标记途中修改引用，导致**漏标 (Missing Mark)**——把本应存活的对象错标为白色而被误回收。理论已证明，漏标当且仅当**同时满足**两个条件：

1. 用户线程**插入**了一条从黑色对象到某白色对象的新引用；
2. 用户线程**删除**了所有从灰色对象到该白色对象的直接或间接引用。

只要破坏其一即可保证正确。对应两种方案，都靠**写屏障 (Write Barrier)**（对象引用赋值时插入的一小段 AOP 式代码）实现：

- **增量更新 (Incremental Update)**：破坏条件一。当黑色对象**新增**指向白色对象的引用时，记录下来，标记结束后再以这些黑色对象为根**重新扫描**。**CMS** 采用此方案。
- **原始快照 (Snapshot At The Beginning, SATB)**：破坏条件二。当灰色对象要**删除**指向白色对象的引用时，把这个"即将断开"的旧引用记录下来，按标记开始那一刻的"快照"继续标记。**G1、Shenandoah** 采用此方案；对应地还有**读屏障 (Load/Read Barrier)** 用于 ZGC/Shenandoah 的并发转移。

> SATB 更"保守"：会让本应死亡的对象在本轮存活（产生"浮动垃圾 Floating Garbage"），但省去重新扫描、效率更高，适合 Region 数量庞大的 G1/ZGC。

---

## 2. 回收器总览

HotSpot 提供了多款回收器，可按新生代/老年代搭配使用（连线表示可组合，虚线组合已废弃）。下面逐一讲解，每款按"原理 → 区域/算法 → 特点 → 场景 → 参数"展开。

---

## 3. Serial / Serial Old——最古老的单线程回收器

- **原理**：最基础的回收器。进行 GC 时**必须暂停全部用户线程 (STW)**，并且只用**单条** GC 线程完成回收，"单线程"不仅指只用一个 CPU，更强调它工作时世界完全停止。
- **区域/算法**：Serial 负责**新生代**，标记-复制算法；Serial Old 负责**老年代**，标记-整理算法。
- **特点**：实现简单，没有线程交互开销，**单核环境下额外内存占用最小、效率反而最高**。缺点是堆一大 STW 就明显。
- **场景**：客户端模式、微服务/容器中数百 MB 的小堆；也是其它回收器发生失败时的"后备 (Fallback)"。
- **参数**：

```bash
-XX:+UseSerialGC   # 同时启用 Serial（新生代）+ Serial Old（老年代）
```

---

## 4. ParNew——Serial 的多线程版

- **原理**：本质就是 Serial 的**多线程并行**版本，回收时同样 STW，但用多条 GC 线程同时工作，缩短停顿。除线程数外，其余行为、参数与 Serial 几乎一致。
- **区域/算法**：仅**新生代**，标记-复制算法。
- **特点**：历史上是**唯一能与 CMS 配合**工作的新生代回收器，因此在 CMS 时代非常常用。随着 CMS 被 G1 取代，ParNew 也走向落幕：JDK 9 起 ParNew 只能与 CMS 搭配（单独使用的组合被废弃），CMS 移除后 ParNew 亦退出历史舞台。
- **场景**：JDK 8 及更早、搭配 CMS 的低延迟服务端应用。
- **参数**：

```bash
-XX:+UseParNewGC    # 启用 ParNew（新生代），通常与 CMS 搭配
-XX:ParallelGCThreads=N  # 并行 GC 线程数
```

---

## 5. Parallel Scavenge / Parallel Old——吞吐量优先

- **原理**：同样是并行、STW 的回收器，但设计目标独树一帜——**吞吐量 (Throughput) 优先**。吞吐量 = 用户代码运行时间 /（用户代码 + GC 时间）。它不追求单次停顿短，而追求**单位时间内干活最多**，适合后台批处理这类"不需要太强交互"的场景。
- **区域/算法**：Parallel Scavenge 负责**新生代**，标记-复制；Parallel Old 负责**老年代**，标记-整理。
- **特点**：独有**自适应调节策略 (Adaptive Sizing / GC Ergonomics)**——开启 `-XX:+UseAdaptiveSizePolicy` 后，JVM 自动调整新生代大小、Eden/Survivor 比例、晋升阈值等，使用者只需给出吞吐量或停顿目标。它**不与 CMS 兼容**（未使用可插拔的分代框架），也因此难以配合并发老年代回收。
- **场景**：科学计算、数据分析、批处理等注重吞吐、可容忍较长停顿的任务。它是 **JDK 8 的默认回收器**。
- **参数**：

```bash
-XX:+UseParallelGC          # 启用 Parallel Scavenge + Parallel Old
-XX:MaxGCPauseMillis=N      # 期望的最大停顿毫秒（越小吞吐可能越低）
-XX:GCTimeRatio=N           # 吞吐量目标，GC 时间占比上限约为 1/(1+N)
-XX:+UseAdaptiveSizePolicy  # 开启自适应调节
```

---

## 6. CMS (Concurrent Mark Sweep)——第一款并发低延迟回收器

- **原理**：CMS 是 HotSpot 第一款真正意义上**让 GC 线程与用户线程并发**运行的回收器，目标是**尽可能减少停顿**。它作用于**老年代**，采用**标记-清除**算法，把回收过程拆成四个阶段：

  1. **初始标记 (Initial Mark)**：**STW**，仅标记 GC Roots 能**直接**关联的对象，速度极快。
  2. **并发标记 (Concurrent Mark)**：**与用户线程并发**，从初始标记的对象出发遍历整个引用图，耗时最长但不停顿。
  3. **重新标记 (Remark)**：**STW**，用**增量更新**修正并发标记期间因用户线程改动而产生的标记变动，停顿比初始标记略长。
  4. **并发清除 (Concurrent Sweep)**：**与用户线程并发**，清理被判定为垃圾的对象。

- **特点与缺点**：并发、低停顿是其优点，但代价明显：
  - **对 CPU 敏感**：并发阶段占用 CPU，吞吐量下降。
  - **浮动垃圾 (Floating Garbage)**：并发清除时用户线程仍在产生新垃圾，只能留待下次；且必须预留空间给并发期间的分配，一旦预留不足触发 **Concurrent Mode Failure**，退化为 Serial Old 做一次长时间 Full GC，停顿反而暴增。
  - **内存碎片**：标记-清除天然产生碎片，大对象无法分配时也会触发 Full GC（可用 `-XX:+UseCMSCompactAtFullCollection` 在 Full GC 时整理，但会拉长停顿）。
- **状态**：JDK 9 起被**废弃 (Deprecated, JEP 291)**，JDK 14 起被**正式移除 (JEP 363)**。现代应替换为 G1/ZGC/Shenandoah。
- **参数**：

```bash
-XX:+UseConcMarkSweepGC   # 启用 CMS（老年代），需搭配 ParNew（JDK 8 及更早）
-XX:CMSInitiatingOccupancyFraction=68  # 老年代占用达此比例即触发 CMS
```

---

## 7. G1 (Garbage First)——面向服务端的主流回收器

- **原理**：G1 开创了**面向局部收集 (Region)** 与**可预测停顿模型 (Predictable Pause Model)** 的新思路。它把堆划分为大量大小相等的**独立区域 (Region)**（默认 2048 个，每个 1~32MB），每个 Region 可**动态**扮演 Eden、Survivor 或 Old 角色——因此 G1 是**逻辑分代、物理不分代**。回收时 G1 跟踪每个 Region 的回收价值（可回收空间 / 所需时间），维护一个优先级列表，在用户设定的停顿时间预算内**优先回收价值最高的 Region**（"Garbage First"由此得名），从而在停顿可控和吞吐间取得平衡。
- **区域/算法**：整堆（新生代 + 老年代统一 Region 化）。从整体看是**标记-整理**，从两个 Region 间看是**标记-复制**，因此**不产生碎片**。
- **关键机制**：
  - **Humongous 区域**：超过 Region 一半大小的**大对象**直接分配到连续的 Humongous Region，避免在新生代反复复制。
  - **记忆集与卡表**：每个 Region 都有自己的 Remembered Set 记录其他 Region 指向本 Region 的引用，解决跨 Region 引用；配合卡表，使得回收单个 Region 时无需扫描全堆。这也是 G1 内存占用较高的原因（RSet 可占堆的 10%~20%）。
  - **SATB**：并发标记采用原始快照解决漏标，配合写屏障维护 RSet。
- **回收过程（Mixed GC 的四阶段）**：
  1. **初始标记 (Initial Mark)**：STW，标记 GC Roots 直达对象，借 Minor GC 顺带完成。
  2. **并发标记 (Concurrent Mark)**：并发遍历引用图，SATB 记录变动。
  3. **最终标记 (Final/Remark)**：STW，处理 SATB 遗留记录。
  4. **筛选回收 (Live Data Counting & Evacuation)**：STW，按回收价值排序，选定一批 Region 将存活对象**复制**到空 Region，再清空原 Region。
- **GC 模式**：Young GC（只收新生代 Region）、**Mixed GC**（收全部新生代 + 部分高价值老年代 Region，这是 G1 取代 Full GC 的核心）。回退时才用单线程 Full GC。
- **场景**：**大堆（6GB 以上）、要求停顿可控（如 200ms 内）**的服务端应用。是 **JDK 9 起的默认回收器**。
- **参数**：

```bash
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200     # 期望最大停顿（软目标，默认 200ms）
-XX:G1HeapRegionSize=16m     # Region 大小（1~32MB，2 的幂）
-XX:InitiatingHeapOccupancyPercent=45  # 整堆占用达此比例启动并发标记周期
```

---

## 8. ZGC——亚毫秒停顿的低延迟回收器

- **原理**：ZGC 的目标极致——**无论堆多大（TB 级），STW 停顿都控制在亚毫秒（<1ms）**。实现关键是把最昂贵的"对象转移 (Relocation/Compaction)"也做成**与用户线程并发**，其核心武器是两项：

  - **染色指针 (Colored Pointers)**：ZGC 把 GC 的元数据**直接存进对象指针的几个空闲位**（64 位指针中原本未用的高位），用这些"颜色位"（如 Marked0、Marked1、Remapped、Finalizable）标记对象的 GC 状态。信息随指针走，无需访问对象头，也无需卡表式的额外结构。
  - **读屏障 (Load Barrier)**：每当用户线程**读取一个对象引用**时，读屏障检查指针的颜色位。若发现对象正被移动（指向了旧地址），屏障当场把引用**自愈 (Self-Healing)** 为新地址，再返回给用户——这就是"**并发整理**"能成立的原因：用户线程读到旧引用会被即时纠正，无需 STW 等待整个转移完成。

- **区域/算法**：整堆，基于 Region（ZGC 称 ZPage，分小/中/大三类）的**并发标记-整理**，无碎片。
- **特点**：停顿时间**不随堆大小、存活对象数量增长**（几乎只与 GC Roots 数量相关），支持 8MB~16TB 超大堆。代价是读屏障带来的运行开销和一定的吞吐损失、内存占用偏高。早期基于**多重映射 (Multi-mapping)** 将同一物理内存映射到多个虚拟地址来解释颜色位。
- **分代化演进（重点）**：最初的 ZGC 是**非分代**的（每次都收整堆），面对"多数对象朝生夕灭"的规律效率不佳。**Generational ZGC (JEP 439) 于 JDK 21 引入**，将堆分为年轻代与老年代**独立并发回收**，大幅降低了 CPU 与内存开销、提升了分配尖峰下的表现。JDK 21 中需 `-XX:+ZGenerational` 显式开启；**JDK 23 起分代 ZGC 成为默认（JEP 474）**，非分代模式被废弃。
- **状态**：JDK 11 实验性引入（JEP 333），**JDK 15 转正为生产可用（JEP 377）**。
- **场景**：超大堆、对延迟极其敏感（金融交易、实时服务）的应用。
- **参数**：

```bash
-XX:+UseZGC                 # 启用 ZGC
-XX:+ZGenerational          # JDK 21~22 显式开启分代 ZGC；JDK 23+ 已默认
-XX:+UseZGC -XX:-ZGenerational  # JDK 23+ 如需退回非分代（已不推荐）
```

---

## 9. Shenandoah——Red Hat 的并发整理回收器

- **原理**：Shenandoah 与 ZGC 目标相同（停顿不随堆大小增长），也做**并发整理**，但技术路线不同。早期版本用 **Brooks Pointers（转发指针 / Forwarding Pointer）**：在每个对象头前额外加一个转发指针，正常时指向对象自身，对象被并发复制后则指向新副本。用户线程通过这个"多一次间接跳转"总能访问到对象的最新位置，从而支持并发移动。较新版本改进为基于**读屏障 + 转发表**的方案，思路与 ZGC 趋同。
- **区域/算法**：与 G1 类似的 **Region 分区**，并发标记-整理。
- **与 ZGC 对比**：
  - **相同**：都追求亚毫秒级、与堆大小无关的停顿；都做并发标记 + 并发转移。
  - **不同**：ZGC 靠**染色指针 + 读屏障**（元数据存于指针）；Shenandoah 早期靠**转发指针**（元数据存于对象头），并复用了 G1 的部分基础设施（如 Region、部分连接矩阵替代 RSet）。历史上 Shenandoah 更早支持 32 位/较小堆，ZGC 更侧重超大堆与后来的分代化。
  - **归属**：Shenandoah 由 Red Hat 主导（JEP 189/379），ZGC 由 Oracle 主导。部分 Oracle 官方 JDK 早期不含 Shenandoah，需用 OpenJDK 发行版。
- **状态**：JDK 12 实验性引入（JEP 189），**JDK 15 转正为生产可用（JEP 379）**。
- **场景**：低延迟、需在 OpenJDK 生态获得并发整理能力的应用。
- **参数**：

```bash
-XX:+UseShenandoahGC
```

---

## 10. Epsilon——无操作 (No-Op) 回收器

- **原理**：Epsilon 是一款**只负责分配内存、完全不做任何回收**的回收器。当堆耗尽时，它不回收，直接让 JVM **退出（OutOfMemoryError）**。它把 GC 的"回收"部分彻底关掉，只保留分配路径。
- **区域/算法**：整堆，无回收算法。
- **特点/场景**：不是给生产业务用的。用途包括：
  - **性能基准测试**：排除 GC 干扰，精确测量程序本身开销。
  - **极短生命周期任务**：明确知道内存够用、进程很快结束，用它省去 GC 开销。
  - **内存压力测试 / GC 接口测试**：验证程序的分配行为、测试新回收器的框架接口。
- **状态**：JDK 11 实验性引入（JEP 318）。
- **参数**：

```bash
-XX:+UnlockExperimentalVMOptions -XX:+UseEpsilonGC
```

---

## 11. 各 JDK 默认回收器演进

| JDK 版本 | 默认回收器 | 说明 |
|---|---|---|
| JDK 8 及更早 | Parallel Scavenge + Parallel Old | 吞吐量优先 |
| JDK 9 ~ 至今 | **G1** | JEP 248 起 G1 成为默认（Server 模式） |
| JDK 14 | G1（CMS 移除） | JEP 363 移除 CMS |
| JDK 21 | G1（分代 ZGC 可选） | Generational ZGC 引入，需显式开启 |
| JDK 23+ | G1（ZGC 默认即分代） | JEP 474，ZGC 分代成默认模式 |

> 注意：默认仍是 **G1**——ZGC 的"分代默认"指的是**当你选用 ZGC 时**默认走分代模式，而非 ZGC 取代 G1 成为 JVM 全局默认。

---

## 12. 回收器对比总结

| 回收器 | 工作区域 | 算法 | 并发性 | 停顿特征 | 适用场景 | 开启参数 |
|---|---|---|---|---|---|---|
| **Serial** | 新生代 | 标记-复制 | 串行 STW | 小堆停顿短 | 客户端/小堆/容器 | `-XX:+UseSerialGC` |
| **Serial Old** | 老年代 | 标记-整理 | 串行 STW | 堆大则长 | 同上 / 后备 | 同上 |
| **ParNew** | 新生代 | 标记-复制 | 并行 STW | 比 Serial 短 | 配合 CMS（历史） | `-XX:+UseParNewGC` |
| **Parallel Scavenge** | 新生代 | 标记-复制 | 并行 STW | 停顿较长 | 吞吐优先/批处理 | `-XX:+UseParallelGC` |
| **Parallel Old** | 老年代 | 标记-整理 | 并行 STW | 停顿较长 | 同上 | 同上 |
| **CMS**（已移除） | 老年代 | 标记-清除 | 并发 | 低（有碎片/CMF 风险） | JDK<14 低延迟 | `-XX:+UseConcMarkSweepGC` |
| **G1** | 整堆(Region) | 复制+整理 | 部分并发 | 可预测（默认 200ms） | 大堆、停顿可控 | `-XX:+UseG1GC` |
| **ZGC** | 整堆(Region) | 并发标记-整理 | 高度并发 | 亚毫秒(<1ms) | 超大堆、极低延迟 | `-XX:+UseZGC` |
| **Shenandoah** | 整堆(Region) | 并发标记-整理 | 高度并发 | 亚毫秒 | 低延迟(OpenJDK) | `-XX:+UseShenandoahGC` |
| **Epsilon** | 整堆 | 无回收 | 无 | 无 GC | 基准测试/短任务 | `-XX:+UseEpsilonGC` |

---

## 13. 如何选择回收器

选型的本质是在**吞吐量、延迟、内存占用**三角中取舍：

1. **不确定 / 通用服务端**：用默认的 **G1**。它在吞吐与停顿间平衡良好，适配 4GB~数十 GB 的堆，是绝大多数应用的稳妥选择。
2. **追求极致吞吐、可容忍停顿**（批处理、离线计算）：用 **Parallel**。
3. **超大堆 + 对延迟极敏感**（几十 GB 到 TB，停顿要求亚毫秒）：用 **ZGC**（JDK 21+ 优先分代 ZGC）；OpenJDK 生态亦可选 **Shenandoah**。
4. **小内存 / 客户端 / 容器单核**：用 **Serial**，额外开销最小。
5. **性能基准 / 明确短命进程**：用 **Epsilon**。
6. **仍在 JDK 8**：默认 Parallel（吞吐）或 CMS+ParNew（延迟），并尽快规划升级——CMS 已随 JDK 14 移除。

> 经验法则：**先不要过早调优 GC**。多数问题源于代码（对象分配过多、内存泄漏），而非回收器选择。先用默认 G1 观测 GC 日志（`-Xlog:gc*`），确有延迟/吞吐瓶颈时再针对性更换与调参。

---

## 参考

1. 周志明.《深入理解 Java 虚拟机（第 3 版）》. 机械工业出版社, 2019.（第 3 章「垃圾收集器与内存分配策略」）
2. Oracle. *HotSpot Virtual Machine Garbage Collection Tuning Guide (JDK 21)*. https://docs.oracle.com/en/java/javase/21/gctuning/
3. JEP 248: Make G1 the Default Garbage Collector. https://openjdk.org/jeps/248
4. JEP 291: Deprecate the Concurrent Mark Sweep (CMS) Garbage Collector. https://openjdk.org/jeps/291
5. JEP 363: Remove the Concurrent Mark Sweep (CMS) Garbage Collector. https://openjdk.org/jeps/363
6. JEP 333: ZGC: A Scalable Low-Latency Garbage Collector (Experimental). https://openjdk.org/jeps/333
7. JEP 377: ZGC: A Scalable Low-Latency Garbage Collector (Production). https://openjdk.org/jeps/377
8. JEP 439: Generational ZGC. https://openjdk.org/jeps/439
9. JEP 474: ZGC: Generational Mode by Default. https://openjdk.org/jeps/474
10. JEP 379: Shenandoah: A Low-Pause-Time Garbage Collector (Production). https://openjdk.org/jeps/379
11. JEP 318: Epsilon: A No-Op Garbage Collector. https://openjdk.org/jeps/318
12. The Z Garbage Collector (OpenJDK Wiki). https://wiki.openjdk.org/display/zgc/Main
13. Shenandoah GC (OpenJDK Wiki). https://wiki.openjdk.org/display/shenandoah/Main
