<!---
markmeta_author: tiltwind
markmeta_date: 2025-12-09
markmeta_title: Rust 入门
markmeta_categories: program-language
markmeta_tags: rust
-->

# Rust 入门

**摘要**:
本文简要介绍了Rust语言的发展历史，通过文字和源代码形式介绍Rust语言基本语法、开发工具、所有权模型、并发编程等。
本文作为Rust语言的入门资料，读者可以通过本文快速了解Rust语言的基本用法。


## 1. Rust 介绍

Rust 是一门系统编程语言，专注于安全、并发和性能。它由 Mozilla 研究员 Graydon Hoare 于 2006 年作为个人项目开始开发。

### 1.1. 发展历史

- 2006年，Graydon Hoare 开始设计 Rust 语言
- 2009年，Mozilla 开始赞助该项目
- 2010年，Rust 首次公开发布
- 2015年5月15日，发布 Rust 1.0 稳定版
- 2018年，Rust 2018 Edition 发布，引入了许多新特性
- 2021年，Rust 2021 Edition 发布
- 2021年2月，Rust 基金会成立，由 AWS、华为、谷歌、微软和 Mozilla 联合创立
- 2024年，Rust 2024 Edition 发布

### 1.2. Rust 的特点

Rust 的设计目标是提供内存安全、并发安全和高性能：

**内存安全**：
- 无需垃圾回收器(GC)即可保证内存安全
- 通过所有权(Ownership)系统在编译时防止内存错误
- 避免空指针、悬垂指针、数据竞争等常见错误

**零成本抽象**：
- 高级抽象不会带来运行时开销
- 性能可以媲美 C/C++

**并发安全**：
- 编译器在编译时检查并发代码的安全性
- 防止数据竞争

**实用性**：
- 优秀的包管理器 Cargo
- 友好的编译器错误信息
- 完善的文档和工具链
- 强大的类型系统和模式匹配

Rust 被广泛应用于：
- 系统编程：操作系统、设备驱动
- Web 服务：高性能后端服务
- 命令行工具：ripgrep、fd、bat 等
- WebAssembly：前端性能关键代码
- 嵌入式开发：IoT 设备
- 区块链：Polkadot、Solana 等

![](images/rust-logo.png)

> Rust 的吉祥物是一只名为 Ferris 的螃蟹。

参考:
1. [Rust 官网](https://www.rust-lang.org/)
2. [The Rust Programming Language Book](https://doc.rust-lang.org/book/)
3. [Rust Wikipedia](https://zh.wikipedia.org/wiki/Rust)


## 2. Rust 安装

### 2.1. 使用 rustup 安装

rustup 是 Rust 的官方安装器和版本管理工具。

Mac/Linux 安装:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 配置环境变量（安装程序会自动添加到 shell 配置文件）
source $HOME/.cargo/env
```

Windows 安装:
- 访问 https://rustup.rs/ 下载 rustup-init.exe 并运行
- 或使用 winget: `winget install Rustlang.Rustup`

验证安装:
```bash
rustc --version
# rustc 1.75.0 (82e1608df 2023-12-21)

cargo --version
# cargo 1.75.0 (1d8b05cdd 2023-11-20)
```

### 2.2. 更新和卸载

```bash
# 更新 Rust
rustup update

# 查看已安装的工具链
rustup show

# 卸载 Rust
rustup self uninstall
```

### 2.3. 配置国内镜像源

创建或编辑 `~/.cargo/config` 文件:

```bash
mkdir -p ~/.cargo
cat > ~/.cargo/config << 'EOF'
[source.crates-io]
replace-with = 'tuna'

[source.tuna]
registry = "https://mirrors.tuna.tsinghua.edu.cn/git/crates.io-index.git"
EOF
```

或使用字节跳动的镜像:
```toml
[source.crates-io]
replace-with = 'rsproxy'

[source.rsproxy]
registry = "https://rsproxy.cn/crates.io-index"
```

### 2.4. Rust 工具链

Rust 工具链包含：

- **rustc**: Rust 编译器
- **cargo**: 包管理器和构建工具
- **rustup**: 工具链管理器
- **rustfmt**: 代码格式化工具
- **clippy**: 代码检查工具
- **rust-analyzer**: LSP 语言服务器（IDE 支持）

安装额外工具:
```bash
# 安装 rustfmt 和 clippy
rustup component add rustfmt clippy

# 安装 rust-analyzer
rustup component add rust-analyzer
```


## 3. Hello World 范例

创建新项目:
```bash
cargo new hello_world
cd hello_world
```

项目结构:
```
hello_world/
├── Cargo.toml    # 项目配置文件
└── src/
    └── main.rs   # 源代码
```

`src/main.rs`:
```rust
fn main() {
    println!("Hello, world!");
}
```

编译并运行:
```bash
# 编译并运行
cargo run
# Hello, world!

# 只编译
cargo build
# 编译生成的二进制文件在 target/debug/hello_world

# 发布版本编译（开启优化）
cargo build --release
# 生成文件在 target/release/hello_world

# 检查代码是否能编译（不生成可执行文件，速度更快）
cargo check
```

直接使用 rustc 编译:
```bash
# 创建单文件
echo 'fn main() { println!("Hello, world!"); }' > hello.rs

# 编译
rustc hello.rs

# 运行
./hello
# Hello, world!
```


## 4. Rust 关键字

Rust 有 **53 个关键字**，分为严格关键字和保留关键字。

**严格关键字**（已被使用）:
```
as          break       const       continue    crate
else        enum        extern      false       fn
for         if          impl        in          let
loop        match       mod         move        mut
pub         ref         return      self        Self
static      struct      super       trait       true
type        unsafe      use         where       while
async       await       dyn
```

**保留关键字**（保留供未来使用）:
```
abstract    become      box         do          final
macro       override    priv        try         typeof
unsized     virtual     yield
```

**原始标识符**: 如果需要使用关键字作为标识符，可以使用 `r#` 前缀：
```rust
let r#match = "match"; // 使用 match 关键字作为变量名
```


## 5. Rust 类型

### 5.1. 标量类型

**整数类型**:

| 长度    | 有符号  | 无符号   |
|---------|---------|----------|
| 8-bit   | i8      | u8       |
| 16-bit  | i16     | u16      |
| 32-bit  | i32     | u32      |
| 64-bit  | i64     | u64      |
| 128-bit | i128    | u128     |
| arch    | isize   | usize    |

```rust
let x: i32 = 42;
let y: u64 = 100;
let z = 98_222;        // 使用下划线分隔，提高可读性
let hex = 0xff;        // 十六进制
let octal = 0o77;      // 八进制
let binary = 0b1111_0000; // 二进制
let byte = b'A';       // 字节（仅限 u8）
```

**浮点类型**:
```rust
let x: f32 = 2.0;      // f32
let y: f64 = 3.0;      // f64（默认类型）
```

**布尔类型**:
```rust
let t: bool = true;
let f: bool = false;
```

**字符类型**:
```rust
let c: char = 'z';
let emoji: char = '😻';  // char 是 4 字节 Unicode 标量值
```

### 5.2. 复合类型

**元组 (Tuple)**:
```rust
let tup: (i32, f64, u8) = (500, 6.4, 1);

// 解构
let (x, y, z) = tup;
println!("y = {}", y);

// 索引访问
let five_hundred = tup.0;
let six_point_four = tup.1;
```

**数组 (Array)**:
```rust
let a: [i32; 5] = [1, 2, 3, 4, 5];  // 固定长度
let first = a[0];
let second = a[1];

// 初始化相同值
let a = [3; 5];  // [3, 3, 3, 3, 3]
```

**切片 (Slice)**:
```rust
let a = [1, 2, 3, 4, 5];
let slice = &a[1..3];  // [2, 3]
```


## 6. Rust 变量

### 6.1. 变量声明

```rust
fn main() {
    // 不可变变量（默认）
    let x = 5;
    // x = 6;  // 错误！不能修改不可变变量

    // 可变变量
    let mut y = 5;
    println!("y = {}", y);
    y = 6;
    println!("y = {}", y);

    // 常量（必须标注类型，使用大写字母和下划线）
    const MAX_POINTS: u32 = 100_000;
}
```

### 6.2. 遮蔽 (Shadowing)

```rust
let x = 5;
let x = x + 1;    // 遮蔽前一个 x
let x = x * 2;    // 再次遮蔽
println!("x = {}", x);  // 12

// 可以改变类型
let spaces = "   ";
let spaces = spaces.len();  // 从 &str 变为 usize
```

### 6.3. 类型推断和显式类型

```rust
let guess = "42".parse().expect("Not a number!");  // 错误！无法推断类型

let guess: i32 = "42".parse().expect("Not a number!");  // 正确

// 使用 turbofish 语法
let guess = "42".parse::<i32>().expect("Not a number!");
```


## 7. 控制流

### 7.1. if 表达式

```rust
let number = 6;

if number % 4 == 0 {
    println!("能被 4 整除");
} else if number % 3 == 0 {
    println!("能被 3 整除");
} else {
    println!("不能被 4 或 3 整除");
}

// if 是表达式，可以赋值
let condition = true;
let number = if condition { 5 } else { 6 };
```

### 7.2. loop 循环

```rust
// 无限循环
loop {
    println!("again!");
    break;  // 退出循环
}

// 从循环返回值
let mut counter = 0;
let result = loop {
    counter += 1;
    if counter == 10 {
        break counter * 2;  // 返回值
    }
};
println!("结果：{}", result);  // 20

// 循环标签
'outer: loop {
    loop {
        break 'outer;  // 跳出外层循环
    }
}
```

### 7.3. while 循环

```rust
let mut number = 3;

while number != 0 {
    println!("{}!", number);
    number -= 1;
}
println!("LIFTOFF!!!");
```

### 7.4. for 循环

```rust
// 遍历数组
let a = [10, 20, 30, 40, 50];
for element in a {
    println!("值：{}", element);
}

// Range
for number in 1..4 {  // 不包含 4
    println!("{}", number);
}

for number in 1..=4 {  // 包含 4
    println!("{}", number);
}

// 倒序
for number in (1..4).rev() {
    println!("{}", number);
}

// 带索引
for (index, value) in a.iter().enumerate() {
    println!("索引 {} 的值是 {}", index, value);
}
```

### 7.5. match 表达式

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter,
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => 1,
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter => 25,
    }
}

// 带绑定的模式
match some_value {
    Some(x) => println!("值：{}", x),
    None => println!("没有值"),
}

// 通配符
let dice_roll = 9;
match dice_roll {
    3 => println!("特殊值 3"),
    7 => println!("特殊值 7"),
    _ => println!("其他值"),  // _ 匹配所有其他情况
}
```

### 7.6. if let 简化语法

```rust
let some_value = Some(3);

// 使用 match
match some_value {
    Some(3) => println!("three"),
    _ => (),
}

// 使用 if let
if let Some(3) = some_value {
    println!("three");
}
```


## 8. 所有权 (Ownership)

所有权是 Rust 最独特的特性，使得 Rust 无需垃圾回收器即可保证内存安全。

### 8.1. 所有权规则

1. Rust 中的每一个值都有一个被称为其**所有者**(owner)的变量
2. 值在任一时刻有且只有一个所有者
3. 当所有者（变量）离开作用域，这个值将被丢弃

### 8.2. 移动语义

```rust
let s1 = String::from("hello");
let s2 = s1;  // s1 的所有权移动到 s2

// println!("{}", s1);  // 错误！s1 已失效
println!("{}", s2);  // 正确
```

### 8.3. 克隆

```rust
let s1 = String::from("hello");
let s2 = s1.clone();  // 深拷贝

println!("s1 = {}, s2 = {}", s1, s2);  // 都有效
```

### 8.4. Copy trait

栈上的简单类型实现了 Copy trait，赋值时会自动复制：

```rust
let x = 5;
let y = x;  // x 被复制

println!("x = {}, y = {}", x, y);  // 都有效
```

实现 Copy 的类型：
- 所有整数类型
- 布尔类型
- 所有浮点类型
- 字符类型
- 元组（仅当其包含的类型也都实现 Copy 时）

### 8.5. 引用和借用

```rust
fn main() {
    let s1 = String::from("hello");
    let len = calculate_length(&s1);  // 借用
    println!("'{}' 的长度是 {}", s1, len);  // s1 仍然有效
}

fn calculate_length(s: &String) -> usize {
    s.len()
}  // s 离开作用域，但因为它没有所有权，所以不会释放
```

### 8.6. 可变引用

```rust
fn main() {
    let mut s = String::from("hello");
    change(&mut s);
    println!("{}", s);  // hello, world
}

fn change(s: &mut String) {
    s.push_str(", world");
}
```

**可变引用的限制**：

1. 同一作用域中，特定数据只能有一个可变引用
2. 不能同时拥有可变引用和不可变引用

```rust
let mut s = String::from("hello");

let r1 = &s;      // 没问题
let r2 = &s;      // 没问题
// let r3 = &mut s;  // 错误！不能同时有不可变和可变引用

println!("{} and {}", r1, r2);
// r1 和 r2 的作用域到此结束

let r3 = &mut s;  // 现在没问题
```

### 8.7. 悬垂引用

Rust 编译器保证引用永远不会成为悬垂引用：

```rust
fn dangle() -> &String {  // 错误！
    let s = String::from("hello");
    &s  // 返回 s 的引用
}  // s 离开作用域并被丢弃，其内存被释放

// 正确做法：返回所有权
fn no_dangle() -> String {
    let s = String::from("hello");
    s  // 返回 s，所有权被移出
}
```


## 9. 结构体 (Struct)

### 9.1. 定义和实例化

```rust
struct User {
    username: String,
    email: String,
    sign_in_count: u64,
    active: bool,
}

fn main() {
    let mut user1 = User {
        email: String::from("someone@example.com"),
        username: String::from("someusername123"),
        active: true,
        sign_in_count: 1,
    };

    user1.email = String::from("anotheremail@example.com");
}
```

### 9.2. 字段初始化简写

```rust
fn build_user(email: String, username: String) -> User {
    User {
        email,     // 简写
        username,  // 简写
        active: true,
        sign_in_count: 1,
    }
}
```

### 9.3. 结构体更新语法

```rust
let user2 = User {
    email: String::from("another@example.com"),
    ..user1  // 其余字段使用 user1 的值
};
```

### 9.4. 元组结构体

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

let black = Color(0, 0, 0);
let origin = Point(0, 0, 0);
```

### 9.5. 方法

```rust
#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 方法
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    // 关联函数（类似静态方法）
    fn square(size: u32) -> Rectangle {
        Rectangle {
            width: size,
            height: size,
        }
    }
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("面积：{}", rect1.area());

    let sq = Rectangle::square(3);
}
```


## 10. 枚举 (Enum)

### 10.1. 定义枚举

```rust
enum IpAddrKind {
    V4,
    V6,
}

let four = IpAddrKind::V4;
let six = IpAddrKind::V6;
```

### 10.2. 枚举值

```rust
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}

let home = IpAddr::V4(127, 0, 0, 1);
let loopback = IpAddr::V6(String::from("::1"));
```

### 10.3. Option 枚举

```rust
enum Option<T> {
    Some(T),
    None,
}

let some_number = Some(5);
let some_string = Some("a string");
let absent_number: Option<i32> = None;
```

### 10.4. 枚举方法

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(i32, i32, i32),
}

impl Message {
    fn call(&self) {
        // 方法体
    }
}

let m = Message::Write(String::from("hello"));
m.call();
```


## 11. 泛型 (Generics)

### 11.1. 泛型函数

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let number_list = vec![34, 50, 25, 100, 65];
    let result = largest(&number_list);
    println!("最大值：{}", result);

    let char_list = vec!['y', 'm', 'a', 'q'];
    let result = largest(&char_list);
    println!("最大值：{}", result);
}
```

### 11.2. 泛型结构体

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }
}

// 只为特定类型实现方法
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

### 11.3. 泛型枚举

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```


## 12. Trait

Trait 类似于其他语言中的接口。

### 12.1. 定义 Trait

```rust
pub trait Summary {
    fn summarize(&self) -> String;

    // 默认实现
    fn summarize_author(&self) -> String {
        String::from("(Read more...)")
    }
}
```

### 12.2. 实现 Trait

```rust
pub struct NewsArticle {
    pub headline: String,
    pub location: String,
    pub author: String,
    pub content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

pub struct Tweet {
    pub username: String,
    pub content: String,
    pub reply: bool,
    pub retweet: bool,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

### 12.3. Trait 作为参数

```rust
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}

// Trait Bound 语法
pub fn notify<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}

// 多个 Trait Bound
pub fn notify<T: Summary + Display>(item: &T) {
    // ...
}

// where 子句
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{
    // ...
}
```

### 12.4. 返回实现 Trait 的类型

```rust
fn returns_summarizable() -> impl Summary {
    Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course, as you probably already know, people"),
        reply: false,
        retweet: false,
    }
}
```

### 12.5. 常用 Trait

```rust
// Debug - 格式化打印
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

// Clone - 克隆
#[derive(Clone)]
struct MyStruct;

// Copy - 复制
#[derive(Copy, Clone)]
struct MySmallStruct;

// PartialEq, Eq - 相等比较
#[derive(PartialEq, Eq)]
struct Coordinate {
    x: i32,
    y: i32,
}
```


## 13. 错误处理

### 13.1. panic! 宏

```rust
fn main() {
    panic!("crash and burn");
}
```

### 13.2. Result 枚举

```rust
use std::fs::File;

fn main() {
    let f = File::open("hello.txt");

    let f = match f {
        Ok(file) => file,
        Err(error) => panic!("打开文件出错：{:?}", error),
    };
}
```

### 13.3. ? 运算符

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_username_from_file() -> Result<String, io::Error> {
    let mut f = File::open("hello.txt")?;
    let mut s = String::new();
    f.read_to_string(&mut s)?;
    Ok(s)
}

// 链式调用
fn read_username_from_file() -> Result<String, io::Error> {
    let mut s = String::new();
    File::open("hello.txt")?.read_to_string(&mut s)?;
    Ok(s)
}
```

### 13.4. unwrap 和 expect

```rust
let f = File::open("hello.txt").unwrap();

let f = File::open("hello.txt")
    .expect("无法打开 hello.txt");
```


## 14. 集合类型

### 14.1. Vector

```rust
// 创建 vector
let v: Vec<i32> = Vec::new();
let v = vec![1, 2, 3];

// 添加元素
let mut v = Vec::new();
v.push(5);
v.push(6);
v.push(7);

// 读取元素
let v = vec![1, 2, 3, 4, 5];
let third: &i32 = &v[2];
println!("第三个元素：{}", third);

match v.get(2) {
    Some(third) => println!("第三个元素：{}", third),
    None => println!("没有第三个元素"),
}

// 遍历
let v = vec![100, 32, 57];
for i in &v {
    println!("{}", i);
}

// 可变遍历
let mut v = vec![100, 32, 57];
for i in &mut v {
    *i += 50;
}
```

### 14.2. String

```rust
// 创建字符串
let mut s = String::new();
let s = "initial contents".to_string();
let s = String::from("initial contents");

// 更新字符串
let mut s = String::from("foo");
s.push_str("bar");
s.push('l');

// 拼接
let s1 = String::from("Hello, ");
let s2 = String::from("world!");
let s3 = s1 + &s2;  // s1 被移动了，不能再使用

// format! 宏
let s1 = String::from("tic");
let s2 = String::from("tac");
let s3 = String::from("toe");
let s = format!("{}-{}-{}", s1, s2, s3);

// 遍历字符串
for c in "नमस्ते".chars() {
    println!("{}", c);
}

for b in "नमस्ते".bytes() {
    println!("{}", b);
}
```

### 14.3. HashMap

```rust
use std::collections::HashMap;

// 创建
let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Yellow"), 50);

// 访问
let team_name = String::from("Blue");
let score = scores.get(&team_name);

match score {
    Some(s) => println!("分数：{}", s),
    None => println!("队伍不存在"),
}

// 遍历
for (key, value) in &scores {
    println!("{}: {}", key, value);
}

// 只在键不存在时插入
scores.entry(String::from("Blue")).or_insert(50);

// 根据旧值更新
let text = "hello world wonderful world";
let mut map = HashMap::new();

for word in text.split_whitespace() {
    let count = map.entry(word).or_insert(0);
    *count += 1;
}
```


## 15. 并发编程

### 15.1. 线程

```rust
use std::thread;
use std::time::Duration;

fn main() {
    thread::spawn(|| {
        for i in 1..10 {
            println!("子线程：{}", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("主线程：{}", i);
        thread::sleep(Duration::from_millis(1));
    }
}
```

### 15.2. join 句柄

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("子线程：{}", i);
        }
    });

    for i in 1..5 {
        println!("主线程：{}", i);
    }

    handle.join().unwrap();  // 等待子线程结束
}
```

### 15.3. move 闭包

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("vector: {:?}", v);
    });

    handle.join().unwrap();
}
```

### 15.4. 消息传递

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
    });

    let received = rx.recv().unwrap();
    println!("收到：{}", received);
}
```

### 15.5. 共享状态

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("结果：{}", *counter.lock().unwrap());
}
```


## 16. 模块系统

### 16.1. 包和 Crate

- **包 (Package)**: Cargo 的功能，包含一个 Cargo.toml 文件
- **Crate**: 模块的树形结构，产生一个库或可执行文件
- **模块 (Module)**: 控制作用域和私有性
- **路径 (Path)**: 命名项的方式

### 16.2. 定义模块

```rust
// src/lib.rs
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}

        fn seat_at_table() {}
    }

    mod serving {
        fn take_order() {}

        fn serve_order() {}

        fn take_payment() {}
    }
}

pub fn eat_at_restaurant() {
    // 绝对路径
    crate::front_of_house::hosting::add_to_waitlist();

    // 相对路径
    front_of_house::hosting::add_to_waitlist();
}
```

### 16.3. use 关键字

```rust
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
    }
}

use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}

// 使用 as 重命名
use std::io::Result as IoResult;

// 导出名称
pub use crate::front_of_house::hosting;
```

### 16.4. 文件分离

```
src/
├── main.rs
├── lib.rs
└── front_of_house/
    ├── mod.rs
    └── hosting.rs
```

`src/lib.rs`:
```rust
mod front_of_house;

pub use crate::front_of_house::hosting;
```

`src/front_of_house/mod.rs`:
```rust
pub mod hosting;
```

`src/front_of_house/hosting.rs`:
```rust
pub fn add_to_waitlist() {}
```


## 17. 测试

### 17.1. 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }

    #[test]
    #[should_panic]
    fn another() {
        panic!("Make this test fail");
    }

    #[test]
    fn it_works_with_result() -> Result<(), String> {
        if 2 + 2 == 4 {
            Ok(())
        } else {
            Err(String::from("two plus two does not equal four"))
        }
    }
}
```

运行测试:
```bash
cargo test

# 运行特定测试
cargo test test_name

# 显示输出
cargo test -- --show-output

# 并行或串行
cargo test -- --test-threads=1
```

### 17.2. 集成测试

`tests/integration_test.rs`:
```rust
use my_crate;

#[test]
fn it_adds_two() {
    assert_eq!(4, my_crate::add_two(2));
}
```


## 18. Cargo 和包管理

### 18.1. Cargo.toml

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <you@example.com>"]

[dependencies]
serde = "1.0"
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }

[dev-dependencies]
criterion = "0.5"

[profile.release]
opt-level = 3
```

### 18.2. 常用命令

```bash
# 创建新项目
cargo new project_name
cargo new --lib lib_name

# 构建
cargo build
cargo build --release

# 运行
cargo run
cargo run --release

# 检查
cargo check

# 测试
cargo test

# 文档
cargo doc --open

# 更新依赖
cargo update

# 清理
cargo clean

# 格式化
cargo fmt

# 代码检查
cargo clippy
```


## 19. 智能指针

### 19.1. Box<T>

```rust
fn main() {
    let b = Box::new(5);
    println!("b = {}", b);
}

// 递归类型
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
```

### 19.2. Rc<T> 引用计数

```rust
use std::rc::Rc;

enum List {
    Cons(i32, Rc<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    let a = Rc::new(Cons(5, Rc::new(Cons(10, Rc::new(Nil)))));
    println!("count after creating a = {}", Rc::strong_count(&a));

    let b = Cons(3, Rc::clone(&a));
    println!("count after creating b = {}", Rc::strong_count(&a));

    {
        let c = Cons(4, Rc::clone(&a));
        println!("count after creating c = {}", Rc::strong_count(&a));
    }

    println!("count after c goes out of scope = {}", Rc::strong_count(&a));
}
```

### 19.3. RefCell<T> 内部可变性

```rust
use std::cell::RefCell;

fn main() {
    let x = RefCell::new(5);

    *x.borrow_mut() += 1;

    println!("x = {:?}", x);
}
```


## 20. 生命周期

### 20.1. 生命周期标注

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

### 20.2. 结构体生命周期

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }

    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part
    }
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().expect("Could not find a '.'");
    let i = ImportantExcerpt {
        part: first_sentence,
    };
}
```

### 20.3. 静态生命周期

```rust
let s: &'static str = "I have a static lifetime.";
```


## 21. 异步编程

### 21.1. async/await

```rust
use tokio;

#[tokio::main]
async fn main() {
    let result = fetch_data().await;
    println!("结果：{}", result);
}

async fn fetch_data() -> String {
    // 模拟异步操作
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    String::from("Data")
}
```

### 21.2. 并发执行

```rust
use tokio;

#[tokio::main]
async fn main() {
    let task1 = tokio::spawn(async {
        // 任务 1
        1
    });

    let task2 = tokio::spawn(async {
        // 任务 2
        2
    });

    let result1 = task1.await.unwrap();
    let result2 = task2.await.unwrap();

    println!("结果：{} + {} = {}", result1, result2, result1 + result2);
}
```


## 22. 宏 (Macros)

### 22.1. 声明宏

```rust
#[macro_export]
macro_rules! vec {
    ( $( $x:expr ),* ) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($x);
            )*
            temp_vec
        }
    };
}
```

### 22.2. 过程宏

```rust
use proc_macro;

#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    // 实现
}
```


## 23. 常用 Crates

### 23.1. Web 框架

- **actix-web**: 高性能 Web 框架
- **axum**: 现代 Web 框架
- **rocket**: 易用的 Web 框架
- **warp**: 基于过滤器的 Web 框架

### 23.2. 异步运行时

- **tokio**: 最流行的异步运行时
- **async-std**: 标准库风格的异步运行时

### 23.3. 序列化

- **serde**: 序列化和反序列化框架
- **serde_json**: JSON 支持
- **bincode**: 二进制序列化

### 23.4. 其他

- **clap**: 命令行参数解析
- **reqwest**: HTTP 客户端
- **sqlx**: 异步 SQL 库
- **diesel**: ORM 框架
- **rayon**: 数据并行


## 24. 性能优化

### 24.1. 基准测试

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 1,
        1 => 1,
        n => fibonacci(n-1) + fibonacci(n-2),
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("fib 20", |b| b.iter(|| fibonacci(black_box(20))));
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```

### 24.2. 发布配置

```toml
[profile.release]
opt-level = 3       # 最大优化
lto = true          # 链接时优化
codegen-units = 1   # 减少代码生成单元
strip = true        # 移除符号表
```


## 25. 最佳实践

### 25.1. 命名规范

- 类型、Trait 使用 **UpperCamelCase**
- 函数、变量、模块使用 **snake_case**
- 常量使用 **SCREAMING_SNAKE_CASE**

### 25.2. 错误处理

- 使用 `Result` 和 `Option` 而不是 `panic!`
- 使用 `?` 运算符传播错误
- 为自定义错误实现 `std::error::Error` trait

### 25.3. 文档注释

```rust
/// 计算两个数的和
///
/// # Examples
///
/// ```
/// let result = add(2, 3);
/// assert_eq!(result, 5);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

### 25.4. 使用 Clippy

```bash
cargo clippy
```


## 附录 A: Rust 和其他语言对比

特性 | Rust | C++ | Go | Python
-----|------|-----|----|---------
内存安全 | 编译时保证 | 手动管理 | GC | GC
性能 | 极高 | 极高 | 高 | 低
学习曲线 | 陡峭 | 陡峭 | 平缓 | 平缓
并发模型 | 所有权+类型系统 | 线程+锁 | Goroutine | GIL限制
包管理 | Cargo | 多种 | go modules | pip
编译速度 | 较慢 | 慢 | 快 | 解释执行


## 附录 B: 学习资源

1. [The Rust Programming Language Book](https://doc.rust-lang.org/book/) - 官方教程
2. [Rust By Example](https://doc.rust-lang.org/rust-by-example/) - 示例学习
3. [Rustlings](https://github.com/rust-lang/rustlings) - 练习题
4. [Rust API 文档](https://doc.rust-lang.org/std/)
5. [Awesome Rust](https://github.com/rust-unofficial/awesome-rust) - Rust 资源列表


## 附录 C: 编辑历史

1. 2025-12-09, tiltwind, 初版
