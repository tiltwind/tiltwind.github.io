<!---
markmeta_author: tiltwind
markmeta_date: 2026-07-18
markmeta_title: Java 类加载机制详解
markmeta_categories: program-language
markmeta_tags: java,jvm,classloader,class-loading,parent-delegation,spi
-->

# Java 类加载机制详解

**摘要**: Java 的类加载机制 (Class Loading) 是 JVM 在运行期把 `.class` 字节流动态载入内存、并转化为可被虚拟机直接使用的运行时数据结构的过程。相比 C/C++ 在编译期完成的静态链接，Java 把加载、连接、初始化推迟到运行期，换来了极高的灵活性——热部署、动态代理、插件化、面向接口的 SPI 扩展都建立在此之上。本文自底向上梳理类的**生命周期七阶段**、**类加载器体系**、**双亲委派模型 (Parent Delegation Model)** 及其打破场景 (SPI/Tomcat/JDBC/OSGi/JPMS)，并给出可运行的被动引用与自定义类加载器示例。核心结论：**类的唯一性由「类加载器实例 + 全限定名」共同决定**。

## 1. 类的生命周期

一个类型 (类或接口) 从被加载进内存到卸载出内存，经历七个阶段。其中**验证、准备、解析**三步合称**连接 (Linking)**。

```
加载 → [验证 → 准备 → 解析] → 初始化 → 使用 → 卸载
Load    Verify  Prepare Resolve  Init      Use    Unload
        └────── Linking ──────┘
```

阶段顺序需注意两点：

1. 加载、验证、准备、初始化的**开始顺序**是确定的，但它们是**交叉进行**的，往往在一个阶段执行过程中调用或激活另一阶段。
2. **解析阶段可以在初始化之后**再开始，这是为了支持 Java 的运行时绑定 (动态绑定/晚期绑定)。

《Java 虚拟机规范》并未强制约定"加载"何时开始，交由虚拟机实现自由把握；但对**初始化**的触发时机做了严格规定 (见 §5)。

## 2. 加载 (Loading)

加载阶段虚拟机完成三件事：

1. 通过一个类的**全限定名**获取定义此类的**二进制字节流**；
2. 将字节流所代表的静态存储结构转化为方法区 (JDK8 后为**元空间 Metaspace**) 的**运行时数据结构**；
3. 在堆中生成一个代表该类的 `java.lang.Class` 对象，作为方法区这些数据的访问入口。

规范没有限定"字节流从哪里来"，这一开放性催生了大量玩法：

- 从 **ZIP/JAR/WAR** 包读取——最常见；
- 从**网络**读取——Applet 的经典场景；
- **运行时计算生成**——动态代理 `java.lang.reflect.Proxy` 用 `ProxyGenerator` 生成 `$Proxy` 类的字节码；
- 由**其他文件生成**——JSP 编译为 Servlet 的 `.class`；
- 从**数据库**读取等。

数组类比较特殊：它不由类加载器创建，而是由 JVM 直接在内存中动态构造；但数组的**元素类型**仍要靠类加载器加载。

## 3. 验证 (Verification)

验证是连接的第一步，目的是确保 `Class` 字节流符合《Java 虚拟机规范》的全部约束，**不会危害虚拟机自身安全**。因为字节流不一定来自 Java 编译器 (可以手写字节码)，必须防御恶意或错误的输入。分四个校验动作：

| 验证类型 | 校验内容 |
|---|---|
| 文件格式验证 | 是否以魔数 `0xCAFEBABE` 开头、版本号是否在处理范围、常量池常量类型是否合法 |
| 元数据验证 | 语义分析：是否有父类、是否继承了 `final` 类、抽象方法是否实现等 |
| 字节码验证 | 最复杂：通过数据流与控制流分析，确定程序语义合法 (如跳转不会跳到方法体外、类型转换有效) |
| 符号引用验证 | 发生在**解析**阶段，校验符号引用能否找到对应的类/字段/方法及访问权限 |

对已确认可靠的代码，可用 `-Xverify:none` (JDK13 起废弃) 关闭大部分验证以缩短加载时间，但会牺牲安全性。

## 4. 准备 (Preparation)

为**类变量 (static 变量)** 在方法区分配内存并设置**零值 (默认值)**。关键点：

- 只处理 `static` 变量，不含实例变量 (实例变量随对象在堆中分配)；
- 初始零值是数据类型的默认值 (`int`→0、`boolean`→false、引用→null)，**而非代码里写的初值**。

```java
public static int value = 123;
```

准备阶段后 `value` 是 **0**，赋值为 123 的 `putstatic` 指令被放在 `<clinit>()` 中，直到**初始化**阶段才执行。

**特例：`static final` 常量。** 若字段同时被 `static final` 修饰且值是编译期可确定的常量，则在准备阶段就会被赋为**指定值**：

```java
public static final int value = 123; // 准备阶段 value 即为 123
```

编译器为它生成 `ConstantValue` 属性，准备阶段直接依此赋值。

## 5. 解析 (Resolution)

将常量池内的**符号引用 (Symbolic Reference)** 替换为**直接引用 (Direct Reference)**。

- **符号引用**：一组以字面量描述目标的符号 (如类的全限定名、字段名+描述符)，与内存布局无关，目标不必已加载入内存。
- **直接引用**：直接指向目标的指针、相对偏移量或能间接定位到目标的句柄，与内存布局相关，引用目标必已在内存中。

解析动作作用于类/接口、字段、类方法、接口方法、方法类型、方法句柄、调用点限定符等 7 类符号引用。对同一符号引用可能被多次解析，虚拟机通常会缓存首次解析结果 (`invokedynamic` 除外)。

## 6. 初始化 (Initialization)

初始化是类加载过程的最后一步，此前除加载阶段可由用户自定义类加载器介入外，其余都由虚拟机主导。到了初始化，才真正开始**执行类中编写的 Java 代码 (字节码)**。

### 6.1 `<clinit>()` 类构造器

初始化即执行**类构造器 `<clinit>()`** 方法：

- 由编译器自动收集类中所有**类变量的赋值动作**和**静态语句块 `static{}`** 合并产生，收集顺序按源码中出现的顺序；
- 静态语句块只能访问定义在它之前的变量，定义在其后的变量可赋值但不可访问；
- `<clinit>()` **无需显式调用父类构造器**，虚拟机保证子类 `<clinit>()` 执行前，**父类 `<clinit>()` 已执行完毕**——因此第一个被执行 `<clinit>()` 的一定是 `java.lang.Object`；
- 若类无静态变量赋值也无静态块，编译器可以不生成 `<clinit>()`；
- **接口**也会生成 `<clinit>()` (用于初始化接口中的常量)，但接口初始化时**不要求先初始化父接口**，只有真正用到父接口中定义的变量时才初始化父接口；
- 虚拟机保证 `<clinit>()` 在**多线程环境下被正确加锁同步**，同一类只会初始化一次，其余线程阻塞等待——这也是懒汉式单例可以借助静态内部类实现线程安全的原理。

### 6.2 触发初始化的六种主动引用

《规范》严格规定，**有且仅有**下列六种情况会触发初始化 (主动引用)：

1. 遇到 `new`、`getstatic`、`putstatic`、`invokestatic` 四条字节码指令：即 new 对象、读取/设置类的静态字段 (非编译期常量)、调用静态方法；
2. 使用 `java.lang.reflect` 包对类型进行**反射调用**时；
3. 初始化类时发现其**父类还未初始化**，则先触发父类初始化；
4. 虚拟机启动时，用户指定的**主类 (含 `main()`)** 先被初始化；
5. 使用 JDK7 的**动态语言支持**，`MethodHandle` 实例最终解析结果为 `REF_getStatic`/`REF_putStatic`/`REF_invokeStatic` 的方法句柄，且句柄对应的类未初始化时；
6. 一个接口定义了 JDK8 的**默认方法 (default)**，若该接口的实现类初始化，则接口要在其之前初始化。

### 6.3 被动引用不触发初始化

除上述六种外的引用都是**被动引用**，不会触发初始化。经典例子：

```java
class SuperClass {
    static { System.out.println("SuperClass init!"); }
    public static int value = 123;
    public static final String HELLO = "hello"; // 编译期常量
}
class SubClass extends SuperClass { }

public class Demo {
    public static void main(String[] args) {
        // 1) 通过子类引用父类的静态字段，只会初始化父类 SuperClass，不会初始化 SubClass
        System.out.println(SubClass.value);      // 输出: SuperClass init! / 123

        // 2) 通过数组定义引用类，不会触发该类初始化 (触发的是 [LSuperClass 数组类)
        SuperClass[] arr = new SuperClass[10];   // 无 "SuperClass init!" 输出

        // 3) 引用编译期常量，常量在编译期已存入调用方常量池，与定义类无关
        System.out.println(SuperClass.HELLO);    // 无 "SuperClass init!" 输出
    }
}
```

## 7. 类加载器体系

**类加载器 (ClassLoader)** 负责"通过全限定名获取字节流"这一动作。JVM 内置三层加载器，配合用户自定义加载器构成层次结构。

### 7.1 三层加载器

| 类加载器 | 实现 | 加载范围 (JDK8) |
|---|---|---|
| 启动类加载器 (Bootstrap ClassLoader) | C++ 实现，非 Java 类，`getClassLoader()` 返回 `null` | `<JAVA_HOME>/lib` 下、或被 `-Xbootclasspath` 指定、且被虚拟机识别的核心类库 (如 `rt.jar`) |
| 扩展类加载器 (Extension ClassLoader) | `sun.misc.Launcher$ExtClassLoader` (Java) | `<JAVA_HOME>/lib/ext` 目录，或 `java.ext.dirs` 指定的路径 |
| 应用程序类加载器 (Application ClassLoader) | `sun.misc.Launcher$AppClassLoader` (Java)，`getSystemClassLoader()` 返回它 | 用户 classpath 上的类，是程序默认的类加载器 |

### 7.2 JDK9 的变化 (JPMS 模块化)

Java 9 引入模块系统 (Project Jigsaw)，类加载器体系随之调整：

- **扩展类加载器 (Extension)** 被**平台类加载器 (Platform ClassLoader)** 取代；`lib/ext` 扩展机制被移除；
- `rt.jar`、`tools.jar` 被删除，核心类以 **JIMAGE** 格式存放于 `lib/modules`；启动类加载器仅加载最核心的模块，其余核心模块下放给平台类加载器；
- Platform 与 Application 类加载器**不再继承 `URLClassLoader`**，改为内部类 `jdk.internal.loader.ClassLoaders$*`，依赖 `URLClassLoader` 特有 API 的旧代码会失效；
- 委派关系在标准的 `Application → Platform → Bootstrap` 之外，还增加了到模块系统的委派逻辑 (加载器先判断类属于哪个模块，再定位到负责该模块的加载器)。

## 8. 双亲委派模型 (Parent Delegation Model)

### 8.1 为什么需要

若没有委派，用户自己写一个 `java.lang.Object` 放到 classpath，就可能被应用加载器加载，系统中出现多个 `Object`，基础类型体系彻底混乱，甚至留下安全后门。双亲委派解决两个核心问题：

- **唯一性**：越基础的类越由越顶层的加载器加载，保证同一个类在各加载器环境中是同一个 `Class`；
- **安全性**：核心类库无法被应用层同名类**篡改/覆盖**——即便你写了 `java.lang.String`，请求也会一路上抛到启动类加载器，最终加载的仍是官方 `String`，你的类根本没机会被加载 (且 `java.*` 包有额外保护)。

### 8.2 工作过程

一个类加载器收到加载请求时，**先把请求委派给父加载器**，逐层向上直到启动类加载器；只有**父加载器反馈无法完成 (在其搜索范围内找不到)** 时，子加载器才尝试自己加载。

```
                 ┌─────────────────────────────┐
                 │  Bootstrap ClassLoader       │  ← 最先尝试加载
                 └──────────────▲──────────────┘
                                │ 找不到才下放
                 ┌──────────────┴──────────────┐
                 │  Extension/Platform Loader   │
                 └──────────────▲──────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │  Application ClassLoader     │
                 └──────────────▲──────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │  Custom ClassLoader          │  ← 请求从这里发起，先向上委派
                 └─────────────────────────────┘

  加载请求 ↑ 向上委派 (先问父)      加载动作 ↓ 父不行才自己加载
```

这里的"双亲/父子"是**组合关系而非继承**：子加载器持有父加载器引用 (`parent` 字段)，而不是继承父加载器。

### 8.3 源码逻辑

委派逻辑集中在 `java.lang.ClassLoader.loadClass()`：

```java
protected Class<?> loadClass(String name, boolean resolve)
        throws ClassNotFoundException {
    synchronized (getClassLoadingLock(name)) {
        // 1. 检查该类是否已被当前加载器加载过
        Class<?> c = findLoadedClass(name);
        if (c == null) {
            try {
                if (parent != null) {
                    // 2. 有父加载器，委派给父加载器
                    c = parent.loadClass(name, false);
                } else {
                    // 3. 无父加载器 (自身就是最顶层)，委派给启动类加载器
                    c = findBootstrapClassOrNull(name);
                }
            } catch (ClassNotFoundException e) {
                // 父加载器无法加载，忽略异常继续
            }
            if (c == null) {
                // 4. 父加载器都失败，才调用自身 findClass() 尝试加载
                c = findClass(name);
            }
        }
        if (resolve) resolveClass(c);
        return c;
    }
}
```

因此，**自定义类加载器若想遵守双亲委派，只需重写 `findClass()`，不要重写 `loadClass()`**。

## 9. 打破双亲委派模型

双亲委派不是强制约束，只是"推荐实现"。当基础类库需要**回调用户代码**，或需要**类隔离/热部署**时，就必须打破它。

### 9.1 SPI 与线程上下文类加载器

**SPI (Service Provider Interface)** 场景：接口 (如 JDBC 的 `java.sql.Driver`) 由核心类库定义，因此被**启动/平台类加载器**加载；但其实现 (如 `mysql-connector` 里的 `Driver`) 在 classpath 上，需**应用类加载器**加载。启动类加载器"够不着"用户类路径——委派方向反了。

解法是**线程上下文类加载器 (Thread Context ClassLoader, TCCL)**：通过 `Thread.setContextClassLoader()` 设置 (默认即应用类加载器)。父加载器执行的代码借助 TCCL 去加载子类加载器负责的实现，相当于"父请求子"，逆向打破委派。`java.util.ServiceLoader` (`META-INF/services/` 机制) 正是如此工作：

```java
ServiceLoader<Driver> loaders = ServiceLoader.load(Driver.class);
// 内部使用 Thread.currentThread().getContextClassLoader() 加载各 Driver 实现
```

### 9.2 JDBC

`DriverManager` 位于 `java.sql`，由启动类加载器加载。JDK6 起 `DriverManager` 用 `ServiceLoader` 扫描 `META-INF/services/java.sql.Driver`，借 TCCL 加载具体驱动，本质就是 §9.1 的 SPI 机制。

### 9.3 Tomcat 类加载架构

Web 容器有独特诉求：**多个 Web 应用可能依赖同一库的不同版本**，需相互隔离；同时又要**共享** Servlet/JSP 等公共 API；还需支持 **JSP 热替换**。单一应用类加载器无法满足，故 Tomcat 设计了多层加载器：

```
              Bootstrap
                  │
              System (加载 CLASSPATH)
                  │
              Common  (加载 $CATALINA_HOME/lib，Tomcat 与全部 Web 应用共享)
                 / \
        Catalina   Shared         (Catalina/Server: Tomcat 内部私有类，对 Web 应用不可见)
                     │            (Shared: 所有 Web 应用共享、但对 Tomcat 不可见)
             ┌───────┼────────┐
         WebApp1  WebApp2  WebApp3   ← 每个 Web 应用一个独立加载器
             │
           JasperLoader (加载单个 JSP 编译出的类，JSP 修改后丢弃并新建，实现热替换)
```

关键设计：

- **每个 Web 应用一个 `WebAppClassLoader`**，加载 `WEB-INF/classes` 与 `WEB-INF/lib`。由于类的唯一性由「加载器+类名」决定 (§10)，不同应用即便用同名类的不同版本也彼此隔离、互不冲突；
- `WebAppClassLoader` **打破双亲委派**：对本应用自己的类**优先自己加载**，再委派上层 (`Common`)——这样应用可覆盖公共库版本；但对 JRE 核心基础类仍向上委派，避免核心类被污染；
- **JasperLoader** 只加载一个 JSP 文件生成的类，检测到 JSP 改动即抛弃旧加载器、创建新加载器重新加载，从而实现热部署。

> 注：现代 Tomcat 默认配置中 `Server`(Catalina) 与 `Shared` 加载器存在但为空，公共库统一由 `Common` 加载；可通过 `catalina.properties` 的 `shared.loader`/`server.loader` 启用。

### 9.4 OSGi

OSGi 是模块化热部署的经典框架，它把类加载器组织成**网状结构**而非树状：每个模块 (Bundle) 有自己的类加载器，Bundle 间根据 `Import-Package`/`Export-Package` 声明**平级互相委派**。这彻底颠覆了双亲委派的树形单向模型，换来了模块级别的热插拔能力。

### 9.5 JDK9 模块化的影响

JPMS 并未废弃双亲委派，而是在其上叠加**模块可见性**规则：加载某类前，先依据模块的 `requires`/`exports` 声明确定该类属于哪个模块、由哪个加载器负责，再进入委派流程。委派关系从纯树形演变为**带模块路由的有向图** (如 §7.2 提到的 `Platform → Application` 额外委派)。

## 10. 类的唯一性

**在 JVM 中，判断两个类是否"相等/是同一个类"，前提是它们由同一个类加载器加载。** 即：

> 类的唯一性 = 类加载器实例 + 类的全限定名

即使字节码完全相同、全限定名一致，只要由**两个不同的类加载器**加载，得到的两个 `Class` 就**互不相等**。这体现在 `equals()`、`isAssignableFrom()`、`isInstance()` 以及 `instanceof` 关键字的判定上——用不同加载器加载的同名类之间做 `instanceof`，结果会是 `false`。这正是 Tomcat/OSGi 实现类隔离的底层依据。

## 11. 自定义类加载器

遵守双亲委派时，**只重写 `findClass()`**，把"如何获取字节流"的逻辑放进去，再交给父类 `defineClass()` 生成 `Class`：

```java
public class FileClassLoader extends ClassLoader {
    private final String rootDir;

    public FileClassLoader(String rootDir) {
        this.rootDir = rootDir;
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] data = loadClassData(name);
        if (data == null) {
            throw new ClassNotFoundException(name);
        }
        // defineClass 将字节数组转为 Class 对象 (完成"加载"阶段)
        return defineClass(name, data, 0, data.length);
    }

    private byte[] loadClassData(String name) throws ClassNotFoundException {
        // 全限定名 com.example.Foo -> rootDir/com/example/Foo.class
        String path = rootDir + File.separator
                + name.replace('.', File.separatorChar) + ".class";
        try (InputStream in = new FileInputStream(path);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int len;
            while ((len = in.read(buf)) != -1) {
                out.write(buf, 0, len);
            }
            return out.toByteArray();
        } catch (FileNotFoundException e) {
            return null; // 交由父加载器或抛异常
        } catch (IOException e) {
            throw new ClassNotFoundException(name, e);
        }
    }

    public static void main(String[] args) throws Exception {
        FileClassLoader loader = new FileClassLoader("/tmp/classes");
        Class<?> clazz = loader.loadClass("com.example.Foo");
        System.out.println(clazz.getClassLoader()); // FileClassLoader
        clazz.getDeclaredConstructor().newInstance();
    }
}
```

要点：

- `findClass()` 内调用 `defineClass()` 完成字节流到 `Class` 的转换；
- 若要**打破双亲委派** (如实现隔离)，才重写 `loadClass()` 调整委派顺序，但仍应把 `java.*` 等核心类向上委派；
- 常见自定义加载器应用：热部署、类加密解密、从非标准来源 (网络/数据库) 加载、模块隔离。

## 12. 类的卸载

一个类的 `Class` 对象被回收 (即类被卸载) 需**同时满足**三个条件，条件极为苛刻：

1. 该类的所有**实例**都已被回收 (堆中不存在该类及子类的任何实例)；
2. 加载该类的**类加载器**已被回收；
3. 该类对应的 `java.lang.Class` 对象**没有任何地方被引用**，无法在任何位置通过反射访问该类的方法。

由于**启动/平台/应用类加载器**在 JVM 生命周期内始终存在，由它们加载的类**基本不会被卸载**。类卸载主要发生在**自定义类加载器**场景 (OSGi、Tomcat 热部署、JSP 重载)——只有丢弃整个类加载器，其加载的所有类才可能一并被回收。因此频繁动态生成类而不释放加载器，是**元空间 (Metaspace) 内存泄漏**的常见诱因。

## 参考

1. 周志明. 《深入理解 Java 虚拟机：JVM 高级特性与最佳实践 (第 3 版)》. 机械工业出版社, 2019. (第 7 章"虚拟机类加载机制"、第 8 章)
2. Oracle. *Java Platform SE — `java.lang.ClassLoader`*. <https://docs.oracle.com/javase/8/docs/api/java/lang/ClassLoader.html>
3. Oracle. *ClassLoader (Java SE 9 & JDK 9)*. <https://docs.oracle.com/javase/9/docs/api/java/lang/ClassLoader.html>
4. Oracle. *The Java Virtual Machine Specification, Java SE — Chapter 5. Loading, Linking, and Initializing*. <https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html>
5. Apache Tomcat. *Class Loader How-To*. <https://tomcat.apache.org/tomcat-10.1-doc/class-loader-howto.html>
6. Oracle. *JEP 261: Module System (Project Jigsaw)*. <https://openjdk.org/jeps/261>
