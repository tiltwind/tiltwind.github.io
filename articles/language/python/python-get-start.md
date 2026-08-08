<!---
markmeta_author: tiltwind
markmeta_date: 2023-09-26
markmeta_title: Python 入门
markmeta_categories: 编程语言
markmeta_tags: python
-->

# Python 入门

**摘要**: 
本文简要介绍了python语言的发展历史，结合源代码介绍python语言基本语法、开发工具、并发模型、垃圾回收机制等。
本文作为python语言的入门资料，读者可以通过本文快速了解python语言的基本用法。


## 1. Python 介绍

关于Python的起源，吉多·范罗苏姆(Guido van Rossum) 在1996年写到：

> 六年前，在1989年12月，我在寻找一门“课余”编程项目来打发圣诞节前后的时间。我的办公室会关门，但我有一台家用电脑，而且没有太多其它东西。我决定为当时我正构思的一个新的脚本语言写一个解释器，它是ABC语言的后代，对UNIX / C程序员会有吸引力。作为一个略微有些无关想法的人，和一个蒙提·派森(Monty Python)的飞行马戏团的狂热爱好者，我选择了Python作为项目的标题。

历史:
- 1989年, 开始研发Python，作为ABC语言的后继者，它也可以被视为采用了叫做M-表达式的中缀表示法的一种LISP方言。
- 1991年, 首次发布 Python 0.9.0。
- 2000年, Python 2.0 发布并引入了新功能。
- 2008年, Python 3.0 发布，它是该语言的主要修订版，并非完全向后兼容。
- 2020年, Python 2 随2.7.18版发布宣布停止支持。


Python（英国发音：/ˈpaɪθən/；美国发音：/ˈpaɪθɑːn/），是一种广泛使用的**解释型**、高级和通用的编程语言。Python解释器本身几乎可以在所有的操作系统中运行，官方直译器CPython是用C语言编写的。

Python支持多种编程范型，包括结构化、过程式、反射式、面向对象和函数式编程。它拥有**动态类型系统**和**垃圾回收**功能，垃圾回收器采用引用计数和环检测相结合。

Python是一个由社群驱动的自由软件，目前由Python软件基金会管理。Python 拥有一个巨大而广泛的标准库。

Python的设计哲学，强调代码的**可读性**和**简洁的语法**，尤其是使用空格缩进来划分代码块。
相比于C语言或Java，Python让开发者能够用更少的代码表达想法。

Python的设计理念是“优雅”、“明确”、“简单”，它的一些重要准则被合称为“Python之禅”。

- 优美优于丑陋。明了优于隐晦。
- 简单优于复杂。复杂优于凌乱。
- 扁平优于嵌套。稀疏优于稠密。
- 可读性很重要。

参考:
- https://zh.wikipedia.org/zh-hans/Python


## 2. Python 安装

去  https://www.python.org/downloads/ 下载安装

mac install:
```bash

# check the latest version from https://www.python.org/downloads/
curl -O https://www.python.org/ftp/python/3.13.2/python-3.13.2-macos11.pkg
open python-3.13.2-macos11.pkg


which python3
#  /usr/local/bin/python3
```

install pip:
```bash
python3 -m pip --version
# pip 24.3.1 from /Library/Frameworks/Python.framework/Versions/3.13/lib/python3.13/site-packages/pip (python 3.13)


# sudo vi /etc/profile
alias python=python3
alias pip=pip3
export PATH=$PATH:/Library/Frameworks/Python.framework/Versions/3.13/bin

which python
# python: aliased to python3
which pip
# pip: aliased to pip3

ls -l /usr/local/bin/python3
# lrwxr-xr-x  1 root  wheel  70 Sep 27 09:57 /usr/local/bin/python3 -> ../../../Library/Frameworks/Python.framework/Versions/3.13/bin/python3

cd /Library/Frameworks/Python.framework/Versions
ls -l
# drwxrwxr-x  11 root  admin  352 Sep 27 09:57 3.11
# lrwxr-xr-x   1 root  wheel    4 Sep 27 09:57 Current -> 3.13

# 设置
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
# Writing to /Users/hk/.config/pip/pip.conf

pip install --trusted-host pypi.tuna.tsinghua.edu.cn certifi

# sudo vi /etc/profile
export REQUESTS_CA_BUNDLE=$(python -c "import certifi; print(certifi.where())")
```



linux install:
```bash

# check the latest version from https://www.python.org/downloads/
wget https://www.python.org/ftp/python/3.12.0/Python-3.12.0.tgz
tar -xvf Python-3.12.0.tgz

# support ssl module for python 
# AVOID ERROR: pip is configured with locations that require TLS/SSL, however the ssl module in Python is not available.
yum install openssl-devel

cd Python-3.12.0
./configure
make
make install

ln -sf /usr/local/bin/python3 /usr/local/bin/python
ln -sf /usr/local/bin/pip3 /usr/local/bin/pip

```


### 2.1. Python 解释器

整个Python语言从规范到解释器都是开源的, 存在多种Python解释器, 使用最广泛的还是CPython。

- CPython: 官方版本的解释器, c语言开发, 所以叫CPython。在命令行下运行python就是启动CPython解释器。
- IPython: 基于CPython之上的一个交互式解释器，也就是说，IPython只是在交互方式上有所增强.
- PyPy: 它的目标是执行速度, 采用JIT技术，对Python代码进行动态编译。绝大部分Python代码都可以在PyPy下运行，但有一些是不同的 https://doc.pypy.org/en/latest/cpython_differences.html
- Jython: 运行在Java平台上的Python解释器，可以直接把Python代码编译成Java字节码执行。
- IronPython: 运行在微软.Net平台上的Python解释器，可以直接把Python代码编译成.Net的字节码。

> 注: 如果要和Java或.Net平台交互，最好的办法不是用Jython或IronPython，而是通过网络调用来交互，确保各程序之间的独立性。


## 3. Hello World 范例

交互模式:
```bash
python
# Python 3.11.5 (v3.11.5:cce6ba91b3, Aug 24 2023, 10:50:31) [Clang 13.0.0 (clang-1300.0.29.30)] on darwin
# Type "help", "copyright", "credits" or "license" for more information.
>>> print('hello, world')
# hello, world
```

命令行模式:
```bash
cat hello.py
# print('hello world')

python hello.py
# hello world
```

直接运行 hello.py:
```python
#!/usr/bin/env python3
 
print('hello world')
```

```bash
chmod +x hello.py

./hello.py
# hello world
```


## 4. Python 关键字

Python有如下关键字：

```
False      await      else       import     pass
None       break      except     in         raise
True       class      finally    is         return
and        continue   for        lambda     try
as         def        from       nonlocal   while
assert     del        global     not        with
async      elif       if         or         yield
```

软关键字:`match, case 和 _`

- `_*`: 不会被 `from module import *` 所导入。
- `_` : 在 match 语句内部的 case 模式中，`_`是一个 软关键字，它表示`通配符`。
- `__*__`: 系统定义的名称，通常简称为 "dunder" 。这些名称由解释器及其实现（包括标准库）定义。
- `__*`: 类的私有名称。类定义时，此类名称以一种混合形式重写，以避免基类及派生类的 "私有" 属性之间产生名称冲突。

## 5. Python 类型

```python
# 整数
i1 = 100
i2 = 0xff00
i3 = 0xa1b2_c3d4
i4 = 10_000_000_000

# 浮点数
f1 = 1.23
f2 = -7.89
f3 = 1.23e9  # 1.23 * 10^9
f4 = 1.2e-5  # 0.000012

# 字符串: 以单引号'或双引号"括起来的任意文本
s1 = 'abc'
s2 = "xyz"
s3 = "I'm OK"
s4 = 'I\'m OK' # 转义字符 \
s5 = 'This is \nnew line'
s6 = '\\\t\\'  # 结果: \	\
s7 = r'\\\t\\' # r'' 表示单引号内部不转义, 结果: \\\t\\
s8 = 'This string will not include \
backslashes or newline characters.'  #  行尾添加一个反斜杠来忽略换行符
s9 = '''line1
line2
line3'''  # 三个单引号支持多行内容

# 布尔
b1 = True
b2 = False
b3 = 3 > 2
b4 = 3 > 5

# 空值
o1 = None  # None不能理解为0，因为0是有意义的，而None是一个特殊的空值
```

### 5.1. 列表List 和 元组Tuple

```python
# 列表 list 可变的有序表
squares = [1, 4, 9, 16, 25]
len(squares) = 5 # 列表长度
squares[0]   # 1, 正向索引
squares[-1]  # 25, 负向索引
squares[-3:] # 【9, 16, 25], 切片操作, 返回一个新列表
squares[:]   # [1, 4, 9, 16, 25], 列表浅拷贝
squares.append(36)  # 追加元素 [1, 4, 9, 16, 25, 36]
squares.insert(1,3) # 指定索引插入元素 [1, 3, 4, 9, 16, 25, 36]
squares.pop()       # 删除末尾元素 [1, 3, 4, 9, 16, 25]
squares.pop(1)      # 删除指定索引元素 [1, 4, 9, 16, 25]
squares.index(9)      # 查找值为9的索引位置
squares.count(9)      # 查找9出现的次数
squares + [49, 64, 81, 100]  # 列表合并, [1, 4, 9, 16, 25, 49, 64, 81, 100]
squares[2:5] = [3,3,3] # 替换部分值 , [1, 4, 3, 3, 3, 49, 64, 81, 100]
squares[2:5] = [] # 删除部分值, [1, 4, 49, 64, 81, 100]
squares[:] = []   # 清空列表
del squares[:]    # 清空列表


a = ['c', 'b', 'a']
a.sort()     # 列表排序 ['a', 'b', 'c']
a.reverse()  # 反转列表 ['c', 'b', 'a']

# 列表嵌套
a = ['a', 'b', 'c']
n = [1, 2, 3]
x = [a, n]
x            # [['a', 'b', 'c'], [1, 2, 3]]
x[0]         # ['a', 'b', 'c']
x[0][1]      # 'b'


# 元组 tuple 不可变列表, 没有append()，insert()
t = ('a', 'b', 'c')

# 元组内嵌可变列表
t = ('a', 'b', ['A', 'B'])
t[2][0] = 'X'
t[2][1] = 'Y'
t
#  ('a', 'b', ['X', 'Y'])

# 遍历序列, enumerate() 函数可以同时取出位置索引和对应的值
for i, v in enumerate(['tic', 'tac', 'toe']):
    print(i, v)
```


`collections.namedtuple` 提供了一种轻量级的结构体实现：

```python
from collections import namedtuple

# 定义命名元组结构体
Person = namedtuple('Person', ['name', 'age', 'city'])

# 创建实例
p1 = Person('Alice', 25, 'Beijing')

print(p1.name)   # Alice
print(p1.age)    # 25

# 命名元组是不可变的
# p1.age = 26    # 报错: AttributeError: can't set attribute

# 可以使用 _replace 方法创建新实例
p3 = p1._replace(age=26)
print(p3)        # Person(name='Alice', age=26, city='Beijing')
```

### 5.2. 字典 Dict 和 Set

dict全称dictionary，在其他语言中也称为map，使用键-值（key-value）存储.
```python
d = {'Michael': 95, 'Bob': 75, 'Tracy': 85}
d['Michael']         # 95

d['Adam'] = 67
d['Adam']            # 67

d['Thomas']          # KeyError: 'Thomas'
'Thomas' in d        # False

d.get('Thomas')      # None
d.get('Thomas', -1)  # -1 , default if None

d.pop('Bob')         # 75, and also deleted from dict

for k, v in d.items():  # 遍历字典
    print(k, v)
```


set可以看成数学意义上的无序和无重复元素的集合:
```python
s = set([1, 1, 2, 2, 3, 3])  # 重复元素在set中自动被过滤
# {1, 2, 3}

s.add(4)      # {1, 2, 3, 4}
s.add(4)      # {1, 2, 3, 4}
s.remove(4)   # {1, 2, 3}


s1 = set([1, 2, 3])
s2 = set([2, 3, 4])
s1 & s2   # 交集 {2, 3}
s1 | s2   # 并集 {1, 2, 3, 4}

fs = frozenset([1,2,3])   # 创建不可变集合 
```

> 注: set的原理和dict一样，所以，同样不可以放入可变对象，因为无法判断两个可变对象是否相等


### 5.3. 枚举

```python
from enum import Enum

# 枚举变量
Month = Enum('Month', ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'))
for name, member in Month.__members__.items():
    print(name, '=>', member, ',', member.value)


# 枚举类
class Color(Enum):
    RED = 'red'
    GREEN = 'green'
    BLUE = 'blue'

color = Color(input("Enter your choice of 'red', 'blue' or 'green': "))

match color:
    case Color.RED:
        print("I see red!")
    case Color.GREEN:
        print("Grass is green")
    case Color.BLUE:
        print("I'm feeling the blues :(")


from enum import Enum, unique

@unique  # <-- @unique装饰器可以帮助我们检查保证没有重复值。
class Weekday(Enum):
    Sun = 0 # Sun的value被设定为0
    Mon = 1
    Tue = 2
    Wed = 3
    Thu = 4
    Fri = 5
    Sat = 6

day1 = Weekday.Mon
print(day1)               # Weekday.Mon
print(Weekday.Tue)        # Weekday.Tue
print(Weekday['Tue'])     # Weekday.Tue
print(Weekday.Tue.value)  # 2
print(day1 == Weekday.Mon)# True
print(day1 == Weekday.Tue)# False
print(Weekday(1))         # Weekday.Mon
print(day1 == Weekday(1)) # True
Weekday(7)
# Traceback (most recent call last):
#   ...
# ValueError: 7 is not a valid Weekday
for name, member in Weekday.__members__.items():
    print(name, '=>', member)

# Sun => Weekday.Sun
# Mon => Weekday.Mon
# Tue => Weekday.Tue
# Wed => Weekday.Wed
# Thu => Weekday.Thu
# Fri => Weekday.Fri
# Sat => Weekday.Sat  
```



## 6. Python  变量

### 6.1. 变量命名

构成: `a-zA-Z0-9_`，但首字不可以用数字。

如下命名约定为“保留标识符"：

- `_spam`（单下划线开头）：弱“内部使用”标识。对于`from M import *`，将不导入所有以下划线开头的对象。
- `spam_`（单下划线结尾）：为了避免与python关键字的命名冲突。
- `__spam`（双下划线开头）：在命名一个类特性的时候，采用名字修饰，比如在类SpamEggs内，`__spam`将变成 `_SpamEggs__spam`。
- `__spam__`（双下划线开头双下划线结尾）：指那些包含在用户控制的命名空间中的“魔术”方法或特性，比如 `__delattr__`、`__dir__`、`__doc__`、`__getattribute__`、`__init__`、`__new__`、`__repr__`、`__setattr__`、`__sizeof__` 等。建议永远不要将这样的命名方式应用于自己的变量或函数。


类和函数的命名要一致；按惯例，命名类用 UpperCamelCase，命名函数与方法用 lowercase_with_underscores。


```python
# 通常用全部大写的变量名表示常量, 事实上PI仍然是一个变量，Python根本没有任何机制保证PI不会被改变。
PI = 3.14159265359 


```


## 7. 运算符

运算符  |	描述
-------| --------
`(表达式...)，[表达式...]，{键: 值...}，{表达式...}`	| 加圆括号表达式，列表显示，字典显示，集合显示
`x[索引]，x[索引:索引]，x(参数...)，x.特性`	| 下标，分片，调用，特性引用
`await x`	| await表达式
`**`		| 指数
`+x，-x，~x`	| 取原数，相反数，逐位NOT
`*，@，/，//，%`		| 乘法，矩阵乘法，除法，下取整除法，余数
`+，-`		| 加法和减法
`<<，>>`		| 移位
`&`		| 逐位AND
`^`	| 逐位XOR
`|`		| 逐位OR
`in，not in，is，is not，<，<=，>，>=，!=，==`	| 包含成员关系测试，同一测试，各种比较
`not x`		| 布尔NOT
`and`		| 布尔AND
`or`		| 布尔OR
`if – else`		| 条件表达式
`lambda`		| lambda表达式
`:=`	| 赋值表达式


## 8. 控制语句

```python

# ---- if 判断
age = 20
if age >= 6:
    print('teenager')
elif age >= 18:
    print('adult')
else:
    print('kid')


# ---- for 循环
names = ['Michael', 'Bob', 'Tracy']
for name in names:
    print(name)

# range(101)就可以生成0-100的整数序列
sum = 0
for x in range(101):
    sum = sum + x
print(sum)


# ---- while 循环
sum = 0
n = 99
while n > 0:
    sum = sum + n
    n = n - 2
print(sum)


# ---- match
def http_error(status):
    match status:
        case 400:
            return "Bad request"
        case 401 | 403 | 404:
    		return "Not allowed"
        case 404:
            return "Not found"
        case 418:
            return "I'm a teapot"
        case _:
            return "Something's wrong with the internet"

# point is an (x, y) tuple
match point:
    case (0, 0):
        print("Origin")
    case (0, y):
        print(f"Y={y}")
    case (x, 0):
        print(f"X={x}")
    case (x, y):
        print(f"X={x}, Y={y}")
    case _:
        raise ValueError("Not a point")
```

### 8.1. break、continue、pass

```python
# ---- break、continue 的使用
n = 0
while n < 100:
    if n > 10:
        break
    
    n = n + 1

    if n % 2 == 0:
        continue
    print(n)

# pass 语句不执行任何动作。语法上需要一个语句，但程序毋需执行任何动作时，可以使用该语句。
while True:
    pass  # Busy-wait for keyboard interrupt (Ctrl+C)
```

### 8.1. range 函数

```python
list(range(5, 10))      # 5-10 范围
# [5, 6, 7, 8, 9]

list(range(0, 10, 3))   # 0-10 范围，步长为3
# [0, 3, 6, 9]

list(range(-10, -100, -30))  # -10到-100, 步长为-30
# [-10, -40, -70]

range(10)              # range()和列表不一样,只有在被迭代时才一个一个地返回列表项，并没有真正生成过一个含有全部项的列表，从而节省了空间。
#  range(0, 10)

# 这种对象称为可迭代对象 iterable，适合作为需要获取一系列值的函数或程序构件的参数。for语句就是这样的程序构件；以可迭代对象作为参数的函数例如 sum()：
sum(range(4))  # 0 + 1 + 2 + 3
# 6
```

### 8.2. 生成器 generator

一边循环一边计算的机制称为生成器(generator), 可节省大量的空间，

```python
L = [x * x for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

g = (x * x for x in range(10))
# <generator object <genexpr> at 0x1022ef630>
# 中括号改为小括号则创建一个生成器

# 通过 next 获取下一个值
next(g)  # 0
next(g)  # 1
next(g)  # 4

# 也可以通过循环遍历
for n in g:
    print(n)

```

generator 函数, 通过 `yield` 返回下一个数, 在每次调用next()的时候执行，遇到yield语句就中断返回，再次执行时从上次返回的yield语句处继续执行。


```python
def fib(max):
    n, a, b = 0, 0, 1
    while n < max:
        yield b
        a, b = b, a + b
        n = n + 1
    return 'done'

f = fib(6)
# <generator object fib at 0x104feaaa0>

next(f)
next(f)
next(f)
# Traceback (most recent call last):
#   File "<stdin>", line 1, in <module>
# StopIteration
```

> 注：generator拿不到return语句的返回值。如果想要拿到返回值，必须捕获StopIteration错误，返回值包含在StopIteration的value中。


### 8.3. 迭代器 Iterator

可以直接作用于for循环的对象统称为**可迭代对象**：`Iterable`，包括：
- 集合数据类型，如list、tuple、dict、set、str等；
- 生成器generator，包括带yield的generator function；

可以使用`isinstance()`判断一个对象是否是`Iterable`对象。

```python
from collections.abc import Iterable
isinstance([], Iterable)          # True
isinstance({}, Iterable)          # True
isinstance('abc', Iterable)       # True
isinstance((x for x in range(10)), Iterable)       # True
isinstance(100, Iterable)         # False
```

能被`next()`函数调用并不断返回下一个值的对象称为`迭代器`：`Iterator`。可以使用`isinstance()`判断一个对象是否是`Iterator`对象：

```python
from collections.abc import Iterator
isinstance((x for x in range(10)), Iterator)   # True
isinstance([], Iterator)                       # False
isinstance({}, Iterator)                       # False
isinstance('abc', Iterator)                    # False
```

> 注意： 生成器都是Iterator对象，但list、dict、str虽然是Iterable，却不是Iterator.

把list、dict、str等Iterable变成Iterator可以使用`iter()`函数：
```python
isinstance(iter([]), Iterator)            # True
isinstance(iter('abc'), Iterator)         # True
```

> 注：for循环本质上就是通过不断调用`next()`函数实现的。


## 9. 字符串

### 9.1 字符编码

Python 3版本中，字符串是以Unicode编码的，内存中以Unicode表示，一个字符对应若干个字节。
```python

ord('A')         # 65
ord('中')        # 20013
chr(66)          # 'B'
chr(25991)       #'文'
'\u4e2d\u6587'   # '中文'

b'ABC'                     # bytes类型的数据用带b前缀的单引号或双引号表示
'ABC'.encode('ascii')      # b'ABC'
'中文'.encode('utf-8')     # b'\xe4\xb8\xad\xe6\x96\x87'

b'ABC'.decode('ascii')     # 'ABC'
b'\xe4\xb8\xad\xe6\x96\x87'.decode('utf-8')   # '中文'

# 字符数
len('ABC')   # 3
len('中文')   # 2

# 字节数
len(b'ABC')                         # 3
len(b'\xe4\xb8\xad\xe6\x96\x87')    # 6
len('中文'.encode('utf-8'))         # 6
```


### 9.2. 字符串格式化

```python
print('%2d-%02d' % (3, 1)) # 3-01
print('%.2f' % 3.1415926) #  3.14

'Hello, %s' % 'world'   
#  'Hello, world'

'Hi, %s, you have $%d.' % ('Michael', 1000000)
#  'Hi, Michael, you have $1000000.'

# ---- 用%%来表示一个%
'growth rate: %d %%' % 7
# 'growth rate: 7 %'   

# ---- 使用 format()方法格式化, 参数依次替换字符串内的占位符{0}、{1}
'Hello, {0}, 成绩提升了 {1:.1f}%'.format('小明', 17.125)
#  'Hello, 小明, 成绩提升了 17.1%' 

# ---- 使用以f开头的字符串，称之为f-string，字符串中{xxx}, 会以对应的变量替换.
r = 2.5
s = 3.14 * r ** 2
print(f'The area of a circle with radius {r} is {s:.2f}')
# The area of a circle with radius 2.5 is 19.62

```

### 9.3. 字符串操作

```python
a = 'abc'
b = a.replace('a', 'A')   # 替换'Abc'

```



## 10. 函数

```python
# 使用 def 定义函数
def fib(n):    # write Fibonacci series up to n
    """Print a Fibonacci series up to n."""
    a, b = 0, 1
    while a < n:
        print(a, end=' ')
        a, b = b, a+b
    print()

fib(2000)  # Now call the function we just defined:
```

- 函数内的第一条语句是字符串时，该字符串就是文档字符串，也称为 docstring。 利用文档字符串可以自动生成在线文档或打印版文档，还可以让开发者在浏览代码时直接查阅文档。
	- 第一行应以大写字母开头，以句点结尾。
	- 文档字符串为多行时，第二行应为空白行，在视觉上将摘要与其余描述分开。后面的行可包含若干段落，描述对象的调用约定、副作用等。
- 函数在 执行 时使用函数局部变量符号表，所有函数变量赋值都存在局部符号表中；引用变量时，首先，在局部符号表里查找变量，然后，是外层函数局部符号表，再是全局符号表，最后是内置名称符号表。
- 在调用函数时会将实际参数（实参）引入到被调用函数的局部符号表中；因此，实参是使用 按**值**调用 来传递的（其中的**值**始终是对象的**引用**而不是对象的值）。 当一个函数调用另外一个函数时，会为该调用创建一个新的局部符号表。
- 函数定义在当前符号表中把函数名与函数对象关联在一起。解释器把函数名指向的对象作为用户自定义函数。还可以使用其他名称指向同一个函数对象，并访问访该函数。

```python
fib
# <function fib at 10042ed0>
f = fib  
f(100)
# 0 1 1 2 3 5 8 13 21 34 55 89
```

> 注意: **函数本身也可以赋值给变量，即：变量可以指向函数。函数名其实就是指向函数的变量**。

没有 return 语句的函数也返回值，只不过这个值是 None.
```python
fib(0)
print(fib(0)) 
# None
```

定义一个带返回值的函数:
```python
def fib2(n):  # return Fibonacci series up to n
    """Return a list containing the Fibonacci series up to n."""
    result = []
    a, b = 0, 1
    while a < n:
        result.append(a)    # see below
        a, b = b, a+b
    return result

f100 = fib2(100)    # call it
f100                # write the result
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
```

函数参数默认值及关键字参数:
```python
def ask_ok(prompt, retries=4, reminder='Please try again!'):
	# function body

ask_ok('Do you really want to quit?')   # 只给出必选实参
ask_ok('OK to overwrite the file?', 2)  # 给出一个可选实参
ask_ok('OK to overwrite the file?', 2, 'Come on, only yes or no!')  # 给出所有实参
ask_ok(prompt='OK')                           # 1关键字实参
ask_ok('OK', retries=2 )                      # 1位置参数 
ask_ok('OK', reminder='Come on' )             # 1位置参数 + 1关键字实参
ask_ok('OK', reminder='Come on', retries=2)   # 1位置参数 + 2关键字实参

ask_ok('OK', prompt='OK')                     # 1位置参数 + 1关键字实参， 重复报错
```

一个函数可以接收另一个函数作为参数:
```python
def add(x, y, f):
    return f(x) + f(y)

print(add(-5, 6, abs))
```

### 10.1. 限制参数传递形式

默认情况下，参数可以按位置或显式关键字传递给 Python 函数。
为了让代码易读、高效，最好限制参数的传递方式，这样，开发者只需查看函数定义，即可确定参数项是仅按位置、按位置或关键字，还是仅按关键字传递。

```
def f(pos1, pos2, /, pos_or_kwd, *, kwd1, kwd2):
      -----------    ----------     ----------
        |             |                  |
        |        Positional or keyword   |
        |                                - Keyword only
         -- Positional only
```

- 仅位置参数: 应放在 `/` （正斜杠）前
- 仅限关键字参数: 应在参数列表中第一个 仅限关键字 形参前添加 `*`。

```python
def standard_arg(arg):
    print(arg)

def pos_only_arg(arg, /):
    print(arg)

def kwd_only_arg(*, arg):
    print(arg)

def combined_example(pos_only, /, standard, *, kwd_only):
    print(pos_only, standard, kwd_only)
```

说明:
- 使用仅限位置形参，可以让用户无法使用形参名。形参名没有实际意义时，强制调用函数的实参顺序时，或同时接收位置形参和关键字时，这种方式很有用。
- 当形参名有实际意义，且显式名称可以让函数定义更易理解时，阻止用户依赖传递实参的位置时，才使用关键字。
- 对于 API，使用仅限位置形参，可以防止未来修改形参名时造成破坏性的 API 变动。


### 10.2. 可变参数

variadic可变参数 `*name` 形参接收一个元组包含形参列表之外的位置参数。

```python
def concat(*args, sep="/"):
    return sep.join(args)

concat("earth", "mars", "venus")
# 'earth/mars/venus'
concat("earth", "mars", "venus", sep=".")
# 'earth.mars.venus'
```


 最后一个形参为 `**name` 形式时，接收一个字典. 
`**name` 形参可以与 `*name` 形参组合使用（`*name`必须在 `**name` 前面）.

```python
def f(p1, *arguments, **keywords):
	print(p1)
	for arg in arguments:
        print(arg)
    print("-" * 40)
    for kw in keywords:
        print(kw, ":", keywords[kw])

f("a", "b", "c", n1="x", n2="y")
# a
# b
# c
# ----------------------------------
# n1:x
# n2:y
```

> 注意，关键字参数在输出结果中的顺序与调用函数时的顺序一致。


### 10.3. 解包实参列表

函数调用要求独立的位置参数，但实参在列表或元组里时，要通过`*`执行解包操作。如果是字典使用`**`进行解包操作。

```python
list(range(3, 6))            # normal call with separate arguments
# [3, 4, 5]
args = [3, 6]
list(range(*args))           # call with arguments unpacked from a list
# [3, 4, 5]


def f(p1, p2='a', p3='b'):
    pass

d = {"p1": "x", "p2": "y", "p3": "z"}
f(**d)
```

### 10.4. Lambda 匿名函数

lambda 关键字用于创建小巧的匿名函数。
`lambda a, b: a+b` 函数返回两个参数的和。
Lambda 函数可用于任何需要函数对象的地方。
在语法上，匿名函数只能是单个表达式。
**在语义上，它只是常规函数定义的语法糖**。
与嵌套函数定义一样，lambda 函数可以**引用包含作用域中的变量**.

```python
def make_incrementor(n):
    return lambda x: x + n

f = make_incrementor(42)
f(0)  # 42
f(1)  # 43
```

还可以把匿名函数用作传递的实参：

```python
pairs = [(1, 'one'), (2, 'two'), (3, 'three'), (4, 'four')]
pairs.sort(key=lambda pair: pair[1])  # 按元组第2个元素排序
pairs
# [(4, 'four'), (1, 'one'), (3, 'three'), (2, 'two')]
```

### 10.5. 函数注解

- 注解以字典的形式存放在函数的 `__annotations__` 属性中，并且不会影响函数的任何其他部分。 
- 形参标注的定义方式是在形参名后加冒号，后面跟一个表达式，该表达式会被求值为标注的值。 
- 返回值标注的定义方式是加组合符号 `->`，后面跟一个表达式，该标注位于形参列表和表示 def 语句结束的冒号之间。 

```python
def f(ham: str, eggs: str = 'eggs') -> str:
    print("Annotations:", f.__annotations__)
    print("Arguments:", ham, eggs)
    return ham + ' and ' + eggs

f('spam')
# Annotations: {'ham': <class 'str'>, 'return': <class 'str'>, 'eggs': <class 'str'>}
# Arguments: spam eggs
# 'spam and eggs'
```

### 10.6. 递归

```python
def fact(n):
    if n==1:
        return 1
    return n * fact(n - 1)

fact(5)       # 120
fact(1000)    # 栈溢出, RuntimeError: maximum recursion depth exceeded in comparison

# 所有的递归函数都可以写成循环的方式
def fact(n):
	sum = 1
	while n > 1: 
		sum = sum * n
		n = n -1
	return sum
```

### 10.7. 闭包

使用闭包，就是内层函数引用了外层函数的局部变量。当返回了一个函数后，其内部的局部变量还能被新函数引用。

```python
def inc():
    x = 0
    def fn():
        nonlocal x
        # 把x看作外层函数的局部变量，它已经被初始化了
        # 如果不加上面这一句, 下面则会报错: UnboundLocalError: cannot access local variable 'x' where it is not associated with a value
        x = x + 1
        return x
    return fn

f = inc()

print(f()) # 1
print(f()) # 2
```

### 10.8. 装饰器

在代码运行期间动态增加功能的方式，称之为“装饰器”（Decorator）。


```python
def log(func):
    def wrapper(*args, **kw):
        print('call %s():' % func.__name__)
        return func(*args, **kw)
    return wrapper

@log
def now():
    print('2023-09-29')

now()
# call now():
# 2023-09-29
```

带参装饰器:
```python
def log(text):
    def decorator(func):
    	@functools.wraps(func)
        def wrapper(*args, **kw):
            print('%s %s():' % (text, func.__name__))
            return func(*args, **kw)
        return wrapper
    return decorator

@log("execute")
def now():
    print('2023-09-29')

now()
# execute now():
# 2023-09-29
```

- `@functools.wraps(func)` 的作用是把原始函数的 `__name__` 等属性复制到 `wrapper()` 函数中



### 10.9. 偏函数

`functools.partial` 的作用就是，把一个函数的某些参数给固定住（也就是设置默认值），返回一个新的函数，调用这个新函数会更简单。

```python
import functools
int2 = functools.partial(int, base=2)  #  base 原本默认为10, 偏函数将其固定为2
int2('1000000')
# 64

# 相当于如下调用
kw = { 'base': 2 }
int('1000000', **kw)

```

创建偏函数时，实际上可以接收函数对象、`*args`和`**kw`这3个参数.

```python
max2 = functools.partial(max, 10)
# 实际上会把10作为*args的一部分自动加到左边

max2(5, 6, 7)
# 相当于：
args = (10, 5, 6, 7)
max(*args)
```


### 10.10. 常用内置函数

Python内建了map()和reduce()函数，可参考 Google的论文 [MapReduce: Simplified Data Processing on Large Clusters](http://research.google.com/archive/mapreduce.html).

**`map()`函数**:  接收两个参数，一个是函数，一个是Iterable，map将传入的函数依次作用到序列的每个元素，并把结果作为新的Iterator返回。

```python
def f(x):
    return x * x

r = map(f, [1, 2, 3, 4, 5, 6, 7, 8, 9])
list(r)  # [1, 4, 9, 16, 25, 36, 49, 64, 81]
```

**`reduce()` 数接**:  接收两个参数，一个是函数，一个是Iterable，这个函数接收两个参数，reduce把结果继续和序列的下一个元素做累积计算.

```python
from functools import reduce
def add(x, y):
    return x + y

reduce(add, [1, 3, 5, 7, 9])    # 25
```

**`filter()`函数**: 接收一个函数和一个序列, 将函数依次作用于每个元素，然后根据返回值是True还是False决定保留还是丢弃该元素。

```python
def is_odd(n):
    return n % 2 == 1

list(filter(is_odd, [1, 2, 4, 5, 6, 9, 10, 15]))
# 结果: [1, 5, 9, 15]
```

**`sorted()`函数**: 排序函数

```python
sorted([36, 5, -12, 9, -21])    # [-21, -12, 5, 9, 36]
sorted([36, 5, -12, 9, -21], key=abs)   # 接收一个key函数来实现自定义的排序， [5, 9, -12, -21, 36]

sorted(['bob', 'about', 'Zoo', 'Credit'])                                 # ['Credit', 'Zoo', 'about', 'bob']
sorted(['bob', 'about', 'Zoo', 'Credit'], key=str.lower)                  # ['about', 'bob', 'Credit', 'Zoo']
sorted(['bob', 'about', 'Zoo', 'Credit'], key=str.lower, reverse=True)    # ['Zoo', 'Credit', 'bob', 'about']


```



## 11. 模块

## 11.1. 模块引用
demo.py 文件:
```python
def f1():
	print("f1")

def f2():
	print("f2")
```

main1.py 文件:
```python
import demo

demo.f1()  # f1
demo.f2()  # f2

demo.__name__   # demo
```

main2.py 文件, 明确导入指定名称函数:
```python
from demo import f1, f2

f1()  # f1
f2()  # f2
```

main3.py 文件, 所有不以下划线`_`开头的名称, 一般情况下，不建议从模块或包内导入 `*` :
```python
from demo import *

f1()  # f1
f2()  # f2
```

main4.py 文件:
- 第1行注释可以让这个hello.py文件直接在Unix/Linux/Mac上运行
- 第2行注释表示.py文件本身使用标准UTF-8编码；
- 第4行是一个字符串，表示模块的文档注释，任何模块代码的第一个字符串都被视为模块的文档注释；
- 第6行使用 `__author__` 变量把作者写进去，这样当你公开源代码后别人就可以瞻仰你的大名；
- 当在命令行运行模块文件时，Python解释器把一个特殊变量`__name__`置为`__main__`.

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

' a test module '

__author__ = 'Michael Liao'

import sys

def test():
    args = sys.argv
    if len(args)==1:
        print('Hello, world!')
    elif len(args)==2:
        print('Hello, %s!' % args[1])
    else:
        print('Too many arguments!')

if __name__=='__main__':
    test()
```

模块包含可执行语句及函数定义。这些语句用于初始化模块，且仅在 import 语句 第一次 遇到模块名时执行


### 11.2. 模块搜索路径

解释器搜索模块名称的路径先后顺序: 
- `sys.builtin_module_names` 指定的路径, 如果未找到，它将在变量 `sys.path` 所给出的目录列表中搜索
- `sys.path` 是从这些位置初始化的:
	- 被命令行直接运行的脚本所在的目录
	- `PYTHONPATH` 指定目录
	- 依赖于安装的默认值

```python
import sys

# 增加搜索路径 
sys.path.append('/ufs/guido/lib/python')
```

### 11.3. 模块编译缓存

为了快速加载模块，Python 把模块的编译版本缓存在 `__pycache__` 目录中，文件名为 `module.version.pyc`，version 对编译文件格式进行编码，一般是 Python 的版本号。
例如，CPython 的 3.3 发行版中，spam.py 的编译版本缓存为 `__pycache__/spam.cpython-33.pyc`。
这种命名惯例让不同 Python 版本编译的模块可以共存。

Python 对比编译版与源码的修改日期，查看编译版是否已过期，是否要重新编译。此进程完全是自动的。
此外，编译模块与平台无关，因此，可在不同架构的系统之间共享相同的库。

Python 在两种情况下不检查缓存。
- 从命令行直接载入的模块，每次都会重新编译，且不储存编译结果；
- 没有源模块，就不会检查缓存。

为了让一个库能以隐藏源代码的形式分发（通过将所有源代码变为编译后的版本），编译后的模块必须放在源目录而非缓存目录中，并且源目录绝不能包含同名的未编译的源模块。

### 11.4. 包


- 必须要有 `__init__.py` 文件才能让 Python 将包含该文件的目录当作包来处理. `__init__.py` 可以只是一个空文件

```
sound/                          Top-level package
      __init__.py               Initialize the sound package
      formats/                  Subpackage for file format conversions
              __init__.py
              wavread.py
              wavwrite.py
              aiffread.py
              aiffwrite.py
              auread.py
              auwrite.py
              ...
      effects/                  Subpackage for sound effects
              __init__.py
              echo.py
              surround.py
              reverse.py
              ...
      filters/                  Subpackage for filters
              __init__.py
              echo.py
              equalizer.py
              vocoder.py
              karaoke.py
              ...
```

引用说明:

```python
# 这将加载子模块 sound.effects.echo。 它必须通过其全名来引用。
import sound.effects.echo
sound.effects.echo.echofilter(input, output, delay=0.7, atten=4)

# 加载子模块 echo，并使其不必加包前缀，因此可按如下方式使用
from sound.effects import echo
echo.echofilter(input, output, delay=0.7, atten=4)
from sound.filters import echo as filtersecho

# 直接导入所需的函数或变量：
from sound.effects.echo import echofilter
echofilter(input, output, delay=0.7, atten=4)


# sound/effects/__init__.py 文件可以包含以下代码：
__all__ = ["echo", "surround", "reverse"]
from sound.effects import *         # 将导入 sound.effects 包的三个命名子模块。

```

### 11.5. 作用域

3类变量:
- 私有(private): 以`_`为前缀，类似`_xxx`和`__xxx`, “不应该”被外部引用（**可以引用但习惯上不应该, Python并没有一种方法可以完全限制访问private**）
- 公开(public): 可以被直接引用，比如：abc，x123，PI等
- 系统(system): 类似 `__xxx__` 的系统变量, 可以被直接引用，一般有特殊用途

```python
def _private_1(name):
    return 'Hello, %s' % name

def _private_2(name):
    return 'Hi, %s' % name

# 公开greeting()函数，而把内部逻辑用private函数隐藏起来
def greeting(name):
    if len(name) > 3:
        return _private_1(name)
    else:
        return _private_2(name)

```

## 12. 错误处理

Python的错误其实也是class, 所有的错误都是从`BaseException`类派生的，常见的错误类型和继承关系看这里：

https://docs.python.org/3/library/exceptions.html#exception-hierarchy

捕获一个错误就是捕获到该class的一个实例。如果要抛出错误，首先根据需要，可以定义一个错误的class，选择好继承关系，然后，用raise语句抛出一个错误的实例：
**尽量使用Python内置的错误类型, 只有在必要的时候才定义自己的错误类型。**

```python
class FooError(ValueError):
    pass

def foo(s):
    n = int(s)
    if n==0:
        raise FooError('invalid value: %s' % s)   # 抛出错误
    return 10 / n

foo('0')
```

错误拦截:

```python
try:
    print('try...')
    r = 10 / int('2')
    print('result:', r)
except ValueError as e:
    print('ValueError:', e)
except ZeroDivisionError as e:
    print('ZeroDivisionError:', e)
else:
    print('no error!')
finally:
    print('finally...')
print('END')
```

- int()函数可能会抛出 `ValueError`
- 除0可能抛出 `ZeroDivisionError`
- 在except语句块后面加一个else，当没有错误发生时，会自动执行else语句
- 如果有finally，则一定会被执行


还可以再次将异常抛出:

```python
try:
    # ...
except ValueError as e:
    print('ValueError!')
    raise   # 记录异常后再次将错误抛出
```

### 12.1. 调用栈

如果错误没有被捕获，它就会一直往上抛，最后被Python解释器捕获，打印一个错误信息，然后程序退出。

```python
# err.py:
def foo(s):
    return 10 / int(s)

def bar(s):
    return foo(s) * 2

def main():
    bar('0')

main()
```

执行，结果如下：

```
$ python3 err.py
Traceback (most recent call last):           <------  错误的跟踪信息
  File "err.py", line 11, in <module>        <------  在代码文件err.py的第11行代码
    main()                                   <------  调用 main 出错
  File "err.py", line 9, in main
    bar('0')
  File "err.py", line 6, in bar
    return foo(s) * 2
  File "err.py", line 3, in foo
    return 10 / int(s)                       <------ 错误产生的源头
ZeroDivisionError: division by zero          <------ 错误消息
```

### 12.2. 断言

```python
def foo(s):
    n = int(s)
    assert n != 0, 'n is zero!'   # 如果 n=0 则抛出AssertionError
    return 10 / n
```

启动Python解释器时可以用`-O`参数来关闭assert.


## 13. 类

### 13.1. 作用域

```python
def scope_test():
    def do_local():
        spam = "local spam"     # <---- 局部 赋值（这是默认状态）不会改变 scope_test 对 spam 的绑定

    def do_nonlocal():
        nonlocal spam           
        spam = "nonlocal spam"  # <---- nonlocal 赋值会改变 scope_test 对 spam 的绑定

    def do_global():
        global spam
        spam = "global spam"    # <---- global 赋值会改变模块层级的绑定

    spam = "test spam"
    do_local()
    print("After local assignment:", spam)
    do_nonlocal()
    print("After nonlocal assignment:", spam)
    do_global()
    print("After global assignment:", spam)

scope_test()
print("In global scope:", spam)


# After local assignment: test spam
# After nonlocal assignment: nonlocal spam
# After global assignment: nonlocal spam
# In global scope: global spam
```

### 13.2. 类定义

```python
class MyClass:
    """A simple example class"""   # <---- 文档字符, MyClass.__doc__
    i = 12345                      # <---- 类变量, 所有实例共享, 通 java static 变量

	def __init__(self, name, sex):      # <---- 类初始化函数
	    self.name = name                # <---- 类实例变量
	    self.__sex = sex                # <---- 类实例变量(私有)

    def f(self):                   # <---- 方法的第一个参数常常被命名为 self。 这是一个约定: self 这一名称在 Python 中没有特殊含义。 
        return 'hello world'


x = MyClass("wongoo", "male")
xf = x.f     # MyClass.f 是函数对象, xf (或 x.f) 叫“方法对象”

x.name              # wongoo
x.__sex             # 错误 AttributeError: 'Student' object has no attribute '__name'
x._MyClass__sex     # male, 解释器把内部变量名称改为_MyClass__sex了
x.__sex = "female"  # 这里不是访问class 内部属性,而是额外增加了一个属性
x.__sex             # female
```

> **方法对象**:打包两者"实例对象"和"函数对象"的指针到一个抽象对象，这个抽象对象就是**方法对象**。
> 当用参数列表调用方法对象时，将基于实例对象和参数列表构建一个新的参数列表，并用这个新参数列表调用相应的函数对象。
> 调用 `x.f()` 其实就相当于 `MyClass.f(x)`,调用一个具有 n 个参数的方法就相当于调用再多一个参数的对应函数。


使用__slots__限制属性绑定:
```python
class Student(object):
    __slots__ = ('name', 'age') # 用tuple定义允许绑定的属性名称

s = Student() 
s.name = 'Michael'
s.age = 25 
s.score = 99 # 绑定属性'score' 将报错
# Traceback (most recent call last):
#   File "<stdin>", line 1, in <module>
# AttributeError: 'Student' object has no attribute 'score'
```

### 13.3. 继承和多态

通过继承子类获得了父类的全部功能。

```python
class Animal(object):
    def run(self):
        print('Animal is running...')

class Dog(Animal):
    def run(self):                   # <---- 子类的run()覆盖了父类的run()，实现多态
        print('Dog is running...')

    def eat(self):
        print('Eating meat...')

class Cat(Animal):
    def run(self):
        print('Cat is running...')


a = Animal()
b = Dog()
c = Cat()

isinstance(a, Animal)  # True
isinstance(b, Animal)  # True
isinstance(c, Animal)  # True

isinstance(b, Dog)  # True

```


**“鸭子类型”**:  Python是动态语言来，不一定需要传入Animal类型，它并不要求严格的继承体系，一个对象只要“看起来像鸭子，走起路来像鸭子”，那它就可以被看做是鸭子。

```python
class Tortoise(object):
    def run(self):
        print('Tortoise is running slowly...')

t = Tortoise()
isinstance(t, Animal)  # True
```

**多重继承**：
```python
class Bird(object):
	def fly(self):
		print("Bird flying ...")

class Eagle(Animal, Bird):  # <--- 多重继承, 依次从 Animal, Bird中查找属性
	pass
```

### 13.4. 数据项捆绑

```python
from dataclasses import dataclass

@dataclass
class Employee:
    name: str
    dept: str
    salary: int

john = Employee('john', 'computer lab', 1000)
john.dept
# 'computer lab'
john.salary
# 1000
```


### 13.5. 获取对象信息

```python
# 通过 type 判断
type(123)==int
type('abc')==str
type(b'a')==bytes
type(fn)==types.FunctionType
type(abs)==types.BuiltinFunctionType
type(lambda x: x)==types.LambdaType
type((x for x in range(10)))==types.GeneratorType


# 使用dir()获得一个对象的所有属性和方法
dir('ABC')
# ['__add__', '__class__',..., '__subclasshook__', 'capitalize', 'casefold',..., 'zfill']
len('ABC')       # 3
'ABC'.__len__()  # 3

class MyDog(object):
    def __len__(self):   # <---- 自己写一个__len__()方法，也可以使用 len() 方法
        return 100

dog = MyDog()
len(dog)

# 配合getattr()、setattr()以及hasattr()，可以直接操作一个对象的状态
hasattr(obj, 'x') # 有属性'x'吗？ True
obj.x             # 9
hasattr(obj, 'y') # 有属性'y'吗？ False
setattr(obj, 'y', 19) # 设置一个属性'y'
hasattr(obj, 'y') # 有属性'y'吗？ True
getattr(obj, 'y') # 获取属性'y' 19
obj.y             # 获取属性'y'  19
```


### 13.6. property使用

Python内置的`@property`装饰器就是负责把一个方法变成属性调用的。

```python
class Student(object):

    @property
    def score(self):
        return self._score

    @score.setter       # <---- @property本身又创建了另一个装饰器@score.setter负责把一个setter方法变成属性赋值
    def score(self, value):
        if not isinstance(value, int):
            raise ValueError('score must be an integer!')
        if value < 0 or value > 100:
            raise ValueError('score must between 0 ~ 100!')
        self._score = value	


s = Student()
s.score = 60 # OK，实际转化为s.set_score(60)
s.score      # OK，实际转化为s.get_score()
s.score = 9999
# Traceback (most recent call last):
#   ...
# ValueError: score must between 0 ~ 100!
```

> 注意：属性的方法名不要和实例变量重名。


### 13.7. 抽象基类 (ABC)

使用`abc`模块可以定义抽象基类，强制子类实现特定的方法：

```python
from abc import ABC, abstractmethod

# 定义抽象基类
class Shape(ABC):
    """图形抽象基类"""
    
    @abstractmethod
    def area(self):
        """计算面积的抽象方法"""
        pass
    
    @abstractmethod
    def perimeter(self):
        """计算周长的抽象方法"""
        pass
    
    # 可以包含具体方法
    def description(self):
        return f"这是一个{self.__class__.__name__}图形"

# 实现抽象基类
class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height
    
    def area(self):
        return self.width * self.height
    
    def perimeter(self):
        return 2 * (self.width + self.height)

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius
    
    def area(self):
        return 3.14159 * self.radius ** 2
    
    def perimeter(self):
        return 2 * 3.14159 * self.radius

# 使用示例
rect = Rectangle(5, 3)
circle = Circle(4)

print(rect.area())          # 15
print(rect.perimeter())     # 16
print(rect.description())   # 这是一个Rectangle图形

print(circle.area())        # 50.26544
print(circle.perimeter())   # 25.13272

# 尝试直接实例化抽象类会报错
# shape = Shape()  # TypeError: Can't instantiate abstract class Shape with abstract methods area, perimeter
```

### 13.8. 协议 (Protocol)

Python 3.8+ 引入了`typing.Protocol`，支持结构化子类型（鸭子类型的静态版本）：

```python
from typing import Protocol

class Drawable(Protocol):
    """可绘制对象协议"""
    def draw(self) -> str:
        ...
    
    def get_area(self) -> float:
        ...

# 实现协议的类（不需要显式继承）
class Square:
    def __init__(self, side):
        self.side = side
    
    def draw(self) -> str:
        return f"绘制边长为{self.side}的正方形"
    
    def get_area(self) -> float:
        return self.side ** 2

class Triangle:
    def __init__(self, base, height):
        self.base = base
        self.height = height
    
    def draw(self) -> str:
        return f"绘制底边{self.base}高{self.height}的三角形"
    
    def get_area(self) -> float:
        return 0.5 * self.base * self.height

# 使用协议的函数
def render_shape(shape: Drawable) -> None:
    """渲染图形"""
    print(shape.draw())
    print(f"面积: {shape.get_area()}")

# 使用示例
square = Square(5)
triangle = Triangle(6, 4)

render_shape(square)    # 绘制边长为5的正方形\n面积: 25
render_shape(triangle)  # 绘制底边6高4的三角形\n面积: 12.0
```

### 13.9. 定制类

一个类实现以下定制方法可以实现对应特殊功能:

定制方法 |  使用方式
--------|----------
`__str__`  | print() 的时候调用该方法
`__repr__`   | 直接控制台显示
`__iter__`   | 可用于for ... in循环
`__next__`   | 可用于for ... in循环
`__getitem__` | 参数可能是一个int，也可能是一个切片对象slice , 用于类似列表索引或切片操作
`__getattr__`  | 当调用不存在的属性时，Python解释器会试图调用__getattr__(self, 'xxx')来尝试获得属性
`__call__`  | 实现该方法后, 可以像函数一样调用 `myclass()`

## 14. 泛型 

Python 3.12 引入了更简洁的泛型语法：

```python
# 新语法（Python 3.12+）函数泛型
def lookup_name[X, Y](mapping: dict[X, Y], key: X, default: Y) -> Y:
    try:
        return mapping[key]
    except KeyError:
        return default

# 类泛型
class Stack[T]:
    def __init__(self):
        self._items: list[T] = []
```
总结：Python 确实支持泛型，但它主要服务于静态类型检查和开发时的代码提示，而不是运行时的类型安全保证。

## 15. IO 

### 15.1. 文件读写

文件读写都有可能产生IOError，一旦出错，后面的f.close()就不用调用。

```python
try:
    f = open('/path/to/file', 'r', encoding='utf-8')
    print(f.read())
finally:
    if f:
        f.close()
```

Python引入了with语句来自动帮我们调用close()方法：

```python
with open('/path/to/file', 'r') as f:
    print(f.read())
```
`read()`一次性读取文件的全部内容, `read(size)` 可指定读取大小。`readline()`每次读取一行.


像open()函数返回的这种有个read()方法的对象，在Python中统称为`file-like Object`。
除了file外，还可以是内存的字节流，网络流，自定义流等等。
`file-like Object`不要求从特定类继承，只要写个read()方法就行。

写文件: 

```python
with open('/Users/michael/test.txt', 'w') as f:
    f.write('Hello, world!')
```

文件模式包括: `r`: 读, `w`: 写, `a`: 追加, 更多[参考](https://docs.python.org/3/library/functions.html#open)

StringIO:
```python
from io import StringIO

f = StringIO()
f.write('hello')
f.write(' ')
f.write('world!')
print(f.getvalue())
# hello world!

f = StringIO('Hello!\nHi!\nGoodbye!')
while True:
    s = f.readline()
    if s == '':
        break
    print(s.strip())
```

BytesIO:
```python
from io import BytesIO
f = BytesIO()
f.write('中文'.encode('utf-8'))
print(f.getvalue())
# b'\xe4\xb8\xad\xe6\x96\x87'

f = BytesIO(b'\xe4\xb8\xad\xe6\x96\x87')
f.read()
b'\xe4\xb8\xad\xe6\x96\x87'
```


## 16. 并发

Python既支持多进程，又支持多线程。


### 16.1. 多进程

创建单个子进程:
```python
from multiprocessing import Process
import os

# 子进程要执行的代码
def run_proc(name):
    print('Run child process %s (%s)...' % (name, os.getpid()))

if __name__=='__main__':
    print('Parent process %s.' % os.getpid())
    p = Process(target=run_proc, args=('test',))
    print('Child process will start.')
    p.start()  # 创建一个Process实例，用start()方法启动
    p.join()   # join()方法可以等待子进程结束后再继续往下运行
    print('Child process end.')

# Parent process 928.
# Child process will start.
# Run child process test (929)...
# Process end.
```


创建多个异步子进程:

```python
from multiprocessing import Pool
import os, time, random

def long_time_task(name):
    print('Run task %s (%s)...' % (name, os.getpid()))
    start = time.time()
    time.sleep(random.random() * 3)
    end = time.time()
    print('Task %s runs %0.2f seconds.' % (name, (end - start)))

if __name__=='__main__':
    print('Parent process %s.' % os.getpid())
    
    p = Pool(4)   # Pool 进程池

    for i in range(5):
        p.apply_async(long_time_task, args=(i,))
    print('Waiting for all subprocesses done...')
    p.close()  # 调用join()之前必须先调用close(), 之后就不能继续添加新的Process了
    p.join()   # 等待所有子进程执行完毕
    print('All subprocesses done.')


# Parent process 669.
# Waiting for all subprocesses done...
# Run task 0 (671)...
# Run task 1 (672)...
# Run task 2 (673)...
# Run task 3 (674)...
# Task 2 runs 0.14 seconds.
# Run task 4 (673)...
# Task 1 runs 0.27 seconds.
# Task 3 runs 0.86 seconds.
# Task 0 runs 1.41 seconds.
# Task 4 runs 1.91 seconds.
# All subprocesses done.
```


调用外部程序:

```python
import subprocess

print('$ nslookup')
p = subprocess.Popen(['nslookup'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
output, err = p.communicate(b'set q=mx\npython.org\nexit\n')
print(output.decode('utf-8'))
print('Exit code:', p.returncode)

# $ nslookup
# Server:		192.168.19.4
# Address:	192.168.19.4#53
# 
# Non-authoritative answer:
# python.org	mail exchanger = 50 mail.python.org.
# 
# Authoritative answers can be found from:
# mail.python.org	internet address = 82.94.164.166
# mail.python.org	has AAAA address 2001:888:2000:d::a6
# 
# 
# Exit code: 0
```


进程间通信：

```python
from multiprocessing import Process, Queue
import os, time, random

# 写数据进程执行的代码:
def write(q):
    print('Process to write: %s' % os.getpid())
    for value in ['A', 'B', 'C']:
        print('Put %s to queue...' % value)
        q.put(value)
        time.sleep(random.random())

# 读数据进程执行的代码:
def read(q):
    print('Process to read: %s' % os.getpid())
    while True:
        value = q.get(True)
        print('Get %s from queue.' % value)

if __name__=='__main__':
    
    q = Queue()  # 父进程创建Queue，并传给各个子进程：
    pw = Process(target=write, args=(q,))
    pr = Process(target=read, args=(q,))
    
    pw.start()  # 启动子进程pw，写入
    pr.start()  # 启动子进程pr，读取
    pw.join()   # 等待pw结束
    pr.terminate()  # pr进程里是死循环，无法等待其结束，只能强行终止



# Process to write: 50563
# Put A to queue...
# Process to read: 50564
# Get A from queue.
# Put B to queue...
# Get B from queue.
# Put C to queue...
# Get C from queue.
```

### 16.2. 多线程

Python的标准库提供了两个模块：`_thread`和`threading`，`_thread`是低级模块，`threading`是高级模块，对`_thread`进行了封装。绝大多数情况下，我们只需要使用`threading`这个高级模块。

```python
import time, threading

balance = 0  # 银行存款

def change_it(n):
    # 先存后取，结果应该为0
    global balance
    balance = balance + n
    balance = balance - n

lock = threading.Lock()

def run_thread(n):
    for i in range(100000):
        
        lock.acquire()       # 先要获取锁
        try:
            change_it(n)     # 放心地改吧
        finally:
            lock.release()   # 改完了一定要释放锁:


t1 = threading.Thread(target=run_thread, args=(5,))
t2 = threading.Thread(target=run_thread, args=(8,))
t1.start()
t2.start()
t1.join()
t2.join()
print(balance)
```

> Python的线程虽然是真正的线程，但解释器执行代码时，有一个GIL锁：Global Interpreter Lock，任何Python线程执行前，必须先获得GIL锁，然后，每执行100条字节码，解释器就自动释放GIL锁，让别的线程有机会执行。这个GIL全局锁实际上把所有线程的执行代码都给上了锁，所以，多线程在Python中只能交替执行，即使100个线程跑在100核CPU上，也只能用到1个核。GIL是Python解释器设计的历史遗留问题，通常我们用的解释器是官方实现的CPython，要真正利用多核，除非重写一个不带GIL的解释器。


ThreadLocal:
```python
import threading
    
# 创建全局ThreadLocal对象:
tlocal = threading.local()

def process_student():
    std = tlocal.student  # 获取当前线程关联的student
    print('Hello, %s (in %s)' % (std, threading.current_thread().name))

def process_thread(name):
    tlocal.student = name  # 绑定ThreadLocal的student
    process_student()

t1 = threading.Thread(target= process_thread, args=('Alice',), name='Thread-A')
t2 = threading.Thread(target= process_thread, args=('Bob',), name='Thread-B')

t1.start()
t2.start()
t1.join()
t2.join()

# Hello, Alice (in Thread-A)
# Hello, Bob (in Thread-B)

```


### 16.3. 协程

Python对协程的支持是通过`generator`实现的。

```python
def consumer():
    r = ''
    while True:
        n = yield r   # 生产者生产消息后，直接通过yield跳转到消费者开始执行，待消费者执行完毕后，切换回生产者继续生产
        if not n:
            return
        print('Consuming %s...' % n)
        r = '200 OK'

def produce(c):
    c.send(None)
    n = 0
    while n < 5:
        n = n + 1
        r = c.send(n)  # 发送消息
    c.close()

c = consumer()
produce(c)
```

`asyncio` 的编程模型就是一个消息循环:

```python
import threading
import asyncio

@asyncio.coroutine  # 标记协程
def hello():
    print('Hello world! (%s)' % threading.currentThread())  
    yield from asyncio.sleep(1)    # yield from 调用另一个generator
    print('Hello again! (%s)' % threading.currentThread())

loop = asyncio.get_event_loop()
tasks = [hello(), hello()]
loop.run_until_complete(asyncio.wait(tasks))
loop.close()

# Hello world! (<_MainThread(MainThread, started 140735195337472)>)
# Hello world! (<_MainThread(MainThread, started 140735195337472)>)
# (暂停约1秒)
# Hello again! (<_MainThread(MainThread, started 140735195337472)>)
# Hello again! (<_MainThread(MainThread, started 140735195337472)>)
```

**coroutine是由同一个线程并发执行的**。从Python 3.5开始引入了新的语法`async`和`await`,也是推荐的协程使用方式:
- 把`@asyncio.coroutine`替换为`async`；
- 把`yield from`替换为`await`。

```python
async def hello():
    print("Hello world!")
    r = await asyncio.sleep(1)
    print("Hello again!")

main()   # 简单地调用一个协程并不会使其被调度执行
# <coroutine object main at 0x1053bb7c8>  <--- 表明其为一个协程对象

asyncio.run(main())
```


### 16.4. 任务

协程包装为任务后，支持直接调用和取消。

```python
import asyncio
 
async def mytask():
    print('in mytask, sleeping')
    try:
        await asyncio.sleep(1)
    except asyncio.CancelledError:
        print('mytask was canceled')
        raise
    return 'result'
 
 
def task_canceller(t):
    print('in task_canceller')
    t.cancel()
    print('canceled the task')
 
 
async def main(loop):
    print('creating task')
    task = loop.create_task(mytask())
    
    # await task  # <---- task 可以直接调用

    loop.call_soon(task_canceller, task)
    try:
        await task
    except asyncio.CancelledError:
        print('main() also sees task as canceled')
 
 
event_loop = asyncio.get_event_loop()
try:
    event_loop.run_until_complete(main(event_loop))
finally:
    event_loop.close()

# creating task
# in mytask, sleeping
# in task_canceller
# canceled the task
# mytask was canceled
# main() also sees task as canceled
```

任务分组:
```python
async def main():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(mytask1(...))
        task2 = tg.create_task(mytask2(...))
    print("Both tasks have completed now.")
```

任务超时控制:
```python
async def main():
    try:
        async with asyncio.timeout(10):
            await long_running_task()  # <---- 超过10s将取消该任务并抛出 TimeoutError
    except TimeoutError:
        print("The long operation timed out, but we've handled it.")

# 或者使用 wait_for
async def main():
    try:
        await asyncio.wait_for(long_running_task(), timeout=10)
    except TimeoutError:
        print('timeout!')
```

避免任务被取消:
```python
task = asyncio.create_task(something())
try:
    res = await shield(task)  # <---- something 不会被取消, 但调用者已被取消，await仍然会引发 CancelledError。
except CancelledError:
    res = None
```

任务回调函数:
```python
def callback(task):         # 回调函数包含 task 参数
    print(task.result())    # 获得 task 返回值

async def work():
    await asyncio.sleep(1)
    return "ok"

async def run():
    task = asyncio.create_task(work())
    task.add_done_callback(callback)  # 添加任务回调函数
    await task
```


## 17. Python 标准库

### 17.1. os - 操作系统接口

```python
import os

# 获取当前工作目录
current_dir = os.getcwd()
print(f"当前目录: {current_dir}")

# 列出目录内容
files = os.listdir('.')
print(f"当前目录文件: {files}")

# 创建目录
os.makedirs('test_dir', exist_ok=True)

# 环境变量操作
path = os.environ.get('PATH')
print(f"PATH环境变量: {path[:100]}...")  # 只显示前100个字符

# 路径操作
file_path = os.path.join('test_dir', 'test.txt')
print(f"拼接路径: {file_path}")
```

### 17.2. sys - 系统相关参数和函数

```python
import sys

# 获取Python版本信息
print(f"Python版本: {sys.version}")
print(f"版本信息: {sys.version_info}")

# 获取命令行参数
print(f"命令行参数: {sys.argv}")

# 获取模块搜索路径
print(f"模块路径: {sys.path[:3]}...")  # 只显示前3个路径

# 退出程序
# sys.exit(0)  # 正常退出
```

### 17.3. json - JSON数据处理

```python
import json

# 字典转JSON字符串
data = {"name": "张三", "age": 30, "city": "北京"}
json_str = json.dumps(data, ensure_ascii=False, indent=2)
print(f"JSON字符串:\n{json_str}")

# JSON字符串转字典
parsed_data = json.loads(json_str)
print(f"解析后的数据: {parsed_data}")

# 读写JSON文件
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open('data.json', 'r', encoding='utf-8') as f:
    loaded_data = json.load(f)
    print(f"从文件加载的数据: {loaded_data}")
```

### 17.4. datetime - 日期时间处理

```python
from datetime import datetime, date, time, timedelta

# 获取当前时间
now = datetime.now()
print(f"当前时间: {now}")
print(f"格式化时间: {now.strftime('%Y-%m-%d %H:%M:%S')}")

# 创建特定日期时间
specific_date = datetime(2024, 1, 1, 12, 0, 0)
print(f"特定日期: {specific_date}")

# 时间计算
tomorrow = now + timedelta(days=1)
print(f"明天: {tomorrow.strftime('%Y-%m-%d')}")

# 字符串解析为日期
date_str = "2024-01-01"
parsed_date = datetime.strptime(date_str, "%Y-%m-%d")
print(f"解析的日期: {parsed_date}")
```

### 17.5. re - 正则表达式

```python
import re

# 基本匹配
text = "我的邮箱是 example@email.com，电话是 138-1234-5678"

# 查找邮箱
email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
email = re.search(email_pattern, text)
if email:
    print(f"找到邮箱: {email.group()}")

# 查找所有数字
numbers = re.findall(r'\d+', text)
print(f"所有数字: {numbers}")

# 替换操作
masked_text = re.sub(r'\d{3}-\d{4}-\d{4}', '***-****-****', text)
print(f"脱敏后: {masked_text}")
```

### 17.6. urllib - URL处理

```python
from urllib.parse import urlparse, urljoin, quote, unquote
from urllib.request import urlopen

# URL解析
url = "https://www.example.com/path?param=value#fragment"
parsed = urlparse(url)
print(f"协议: {parsed.scheme}")
print(f"域名: {parsed.netloc}")
print(f"路径: {parsed.path}")
print(f"参数: {parsed.query}")

# URL编码/解码
chinese_text = "你好世界"
encoded = quote(chinese_text)
print(f"编码后: {encoded}")
decoded = unquote(encoded)
print(f"解码后: {decoded}")

# URL拼接
base_url = "https://api.example.com/"
full_url = urljoin(base_url, "users/123")
print(f"拼接URL: {full_url}")
```

## 18. 常用第三方库

### 18.1. requests - HTTP客户端

```python
import requests

# GET请求
response = requests.get('https://httpbin.org/get')
print(f"状态码: {response.status_code}")
print(f"响应内容: {response.json()}")

# POST请求
data = {'key': 'value', 'name': '张三'}
response = requests.post('https://httpbin.org/post', json=data)
print(f"POST响应: {response.json()['json']}")

# 带参数的请求
params = {'page': 1, 'size': 10}
response = requests.get('https://httpbin.org/get', params=params)
print(f"请求URL: {response.url}")

# 设置请求头
headers = {'User-Agent': 'My App 1.0'}
response = requests.get('https://httpbin.org/headers', headers=headers)
print(f"请求头信息: {response.json()['headers']}")
```

### 18.2. pandas - 数据分析

```python
import pandas as pd
import numpy as np

# 创建DataFrame
data = {
    'name': ['张三', '李四', '王五', '赵六'],
    'age': [25, 30, 35, 28],
    'city': ['北京', '上海', '广州', '深圳'],
    'salary': [8000, 12000, 15000, 10000]
}
df = pd.DataFrame(data)
print("原始数据:")
print(df)

# 基本统计信息
print(f"\n数据描述:\n{df.describe()}")

# 数据筛选
high_salary = df[df['salary'] > 10000]
print(f"\n高薪员工:\n{high_salary}")

# 数据分组
city_avg_salary = df.groupby('city')['salary'].mean()
print(f"\n各城市平均薪资:\n{city_avg_salary}")

# 保存到CSV
df.to_csv('employees.csv', index=False, encoding='utf-8')
print("\n数据已保存到 employees.csv")
```

### 18.3. numpy - 数值计算

```python
import numpy as np

# 创建数组
arr1 = np.array([1, 2, 3, 4, 5])
arr2 = np.array([[1, 2], [3, 4], [5, 6]])
print(f"一维数组: {arr1}")
print(f"二维数组:\n{arr2}")

# 数组运算
print(f"数组加法: {arr1 + 10}")
print(f"数组乘法: {arr1 * 2}")
print(f"数组平方: {arr1 ** 2}")

# 统计函数
print(f"平均值: {np.mean(arr1)}")
print(f"标准差: {np.std(arr1)}")
print(f"最大值: {np.max(arr1)}")
print(f"最小值: {np.min(arr1)}")

# 生成特殊数组
zeros = np.zeros((3, 3))  # 零矩阵
ones = np.ones((2, 4))    # 全1矩阵
random_arr = np.random.rand(3, 3)  # 随机数组
print(f"\n零矩阵:\n{zeros}")
print(f"\n随机数组:\n{random_arr}")
```

### 18.4. matplotlib - 数据可视化

```python
import matplotlib.pyplot as plt
import numpy as np

# 设置中文字体支持
plt.rcParams['font.sans-serif'] = ['SimHei']  # 用来正常显示中文标签
plt.rcParams['axes.unicode_minus'] = False   # 用来正常显示负号

# 创建数据
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# 创建图表
plt.figure(figsize=(10, 6))
plt.plot(x, y1, label='sin(x)', linewidth=2)
plt.plot(x, y2, label='cos(x)', linewidth=2)

# 添加标题和标签
plt.title('三角函数图像', fontsize=16)
plt.xlabel('x轴', fontsize=12)
plt.ylabel('y轴', fontsize=12)
plt.legend()
plt.grid(True, alpha=0.3)

# 保存图片
plt.savefig('trigonometric_functions.png', dpi=300, bbox_inches='tight')
print("图表已保存为 trigonometric_functions.png")

# 显示图表（在Jupyter中使用）
# plt.show()
```

### 18.5. sqlite3 - 轻量级数据库

```python
import sqlite3
from datetime import datetime

# 连接数据库（如果不存在会自动创建）
conn = sqlite3.connect('example.db')
cursor = conn.cursor()

# 创建表
cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')

# 插入数据
users_data = [
    ('张三', 'zhangsan@example.com'),
    ('李四', 'lisi@example.com'),
    ('王五', 'wangwu@example.com')
]

cursor.executemany('INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)', users_data)

# 查询数据
cursor.execute('SELECT * FROM users')
results = cursor.fetchall()
print("用户列表:")
for row in results:
    print(f"ID: {row[0]}, 姓名: {row[1]}, 邮箱: {row[2]}, 创建时间: {row[3]}")

# 更新数据
cursor.execute('UPDATE users SET email = ? WHERE name = ?', ('zhangsan_new@example.com', '张三'))

# 删除数据
# cursor.execute('DELETE FROM users WHERE name = ?', ('王五',))

# 提交事务并关闭连接
conn.commit()
conn.close()
print("数据库操作完成")
```

## 19. Web开发相关

### 19.1. Flask - 轻量级Web框架

```python
from flask import Flask, request, jsonify

# 创建Flask应用
app = Flask(__name__)

# 路由定义
@app.route('/')
def home():
    """首页路由"""
    return '<h1>欢迎使用Flask!</h1>'

@app.route('/api/users', methods=['GET'])
def get_users():
    """获取用户列表API"""
    users = [
        {'id': 1, 'name': '张三', 'email': 'zhangsan@example.com'},
        {'id': 2, 'name': '李四', 'email': 'lisi@example.com'}
    ]
    return jsonify({'users': users, 'total': len(users)})

@app.route('/api/users', methods=['POST'])
def create_user():
    """创建用户API"""
    data = request.get_json()
    # 这里应该有数据验证和数据库操作
    new_user = {
        'id': 3,
        'name': data.get('name'),
        'email': data.get('email')
    }
    return jsonify({'message': '用户创建成功', 'user': new_user}), 201

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """获取单个用户API"""
    # 模拟从数据库获取用户
    user = {'id': user_id, 'name': f'用户{user_id}', 'email': f'user{user_id}@example.com'}
    return jsonify(user)

if __name__ == '__main__':
    # 开发模式运行
    app.run(debug=True, host='0.0.0.0', port=5000)
```

### 19.2. FastAPI - 现代高性能Web框架

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

# 创建FastAPI应用
app = FastAPI(title="用户管理API", version="1.0.0")

# 数据模型定义
class User(BaseModel):
    id: Optional[int] = None
    name: str
    email: str
    age: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    age: Optional[int] = None

# 模拟数据库
users_db = [
    {"id": 1, "name": "张三", "email": "zhangsan@example.com", "age": 25},
    {"id": 2, "name": "李四", "email": "lisi@example.com", "age": 30}
]

@app.get("/")
async def root():
    """根路径"""
    return {"message": "欢迎使用FastAPI用户管理系统"}

@app.get("/users", response_model=List[UserResponse])
async def get_users():
    """获取所有用户"""
    return users_db

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """根据ID获取用户"""
    user = next((user for user in users_db if user["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user

@app.post("/users", response_model=UserResponse)
async def create_user(user: User):
    """创建新用户"""
    new_id = max([u["id"] for u in users_db]) + 1 if users_db else 1
    new_user = {"id": new_id, **user.dict()}
    users_db.append(new_user)
    return new_user

@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user: User):
    """更新用户信息"""
    existing_user = next((u for u in users_db if u["id"] == user_id), None)
    if not existing_user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    existing_user.update(user.dict(exclude_unset=True))
    return existing_user

@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    """删除用户"""
    global users_db
    users_db = [user for user in users_db if user["id"] != user_id]
    return {"message": "用户删除成功"}

# 运行命令: uvicorn main:app --reload
```

## 20. 数据科学相关

### 20.1. scikit-learn - 机器学习

```python
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np
import matplotlib.pyplot as plt

# 生成示例数据
np.random.seed(42)
X = np.random.rand(100, 1) * 10  # 特征
y = 2 * X.ravel() + 1 + np.random.randn(100) * 2  # 目标值（带噪声的线性关系）

# 分割训练集和测试集
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 创建并训练模型
model = LinearRegression()
model.fit(X_train, y_train)

# 预测
y_pred = model.predict(X_test)

# 评估模型
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"均方误差 (MSE): {mse:.2f}")
print(f"决定系数 (R²): {r2:.2f}")
print(f"模型参数 - 斜率: {model.coef_[0]:.2f}, 截距: {model.intercept_:.2f}")

# 可视化结果
plt.figure(figsize=(10, 6))
plt.scatter(X_test, y_test, color='blue', label='实际值', alpha=0.6)
plt.scatter(X_test, y_pred, color='red', label='预测值', alpha=0.6)
plt.plot(X_test, y_pred, color='red', linewidth=2)
plt.xlabel('特征值')
plt.ylabel('目标值')
plt.title('线性回归预测结果')
plt.legend()
plt.grid(True, alpha=0.3)
plt.savefig('linear_regression_result.png', dpi=300, bbox_inches='tight')
print("预测结果图已保存为 linear_regression_result.png")
```

### 20.2. BeautifulSoup - HTML解析

```python
from bs4 import BeautifulSoup
import requests

# 示例HTML内容
html_content = """
<html>
<head>
    <title>示例网页</title>
</head>
<body>
    <div class="container">
        <h1 id="main-title">新闻标题</h1>
        <p class="content">这是第一段新闻内容。</p>
        <p class="content">这是第二段新闻内容。</p>
        <ul class="news-list">
            <li><a href="/news/1">新闻1</a></li>
            <li><a href="/news/2">新闻2</a></li>
            <li><a href="/news/3">新闻3</a></li>
        </ul>
    </div>
</body>
</html>
"""

# 解析HTML
soup = BeautifulSoup(html_content, 'html.parser')

# 查找元素
title = soup.find('title').text
print(f"页面标题: {title}")

# 通过ID查找
main_title = soup.find('h1', id='main-title').text
print(f"主标题: {main_title}")

# 通过class查找所有段落
content_paragraphs = soup.find_all('p', class_='content')
print("\n内容段落:")
for i, p in enumerate(content_paragraphs, 1):
    print(f"{i}. {p.text}")

# 查找所有链接
links = soup.find_all('a')
print("\n所有链接:")
for link in links:
    href = link.get('href')
    text = link.text
    print(f"链接: {text} -> {href}")

# CSS选择器
news_items = soup.select('.news-list li a')
print("\n使用CSS选择器查找新闻:")
for item in news_items:
    print(f"- {item.text}: {item['href']}")
```



## 21. Python 单元测试

Python 单元测试是确保代码质量和功能正确性的重要手段。Python 提供了内置的 `unittest` 模块，同时也有第三方库如 `pytest` 提供更简洁的测试方式。

### 21.1. unittest 基础测试

```python
import unittest
from unittest.mock import Mock, patch

# 被测试的类
class Calculator:
    def add(self, a, b):
        return a + b
    
    def divide(self, a, b):
        if b == 0:
            raise ValueError("除数不能为零")
        return a / b
    
    def get_data_from_api(self, url):
        # 模拟从API获取数据
        import requests
        response = requests.get(url)
        return response.json()

# 测试类
class TestCalculator(unittest.TestCase):
    
    def setUp(self):
        """每个测试方法执行前调用"""
        self.calc = Calculator()
    
    def tearDown(self):
        """每个测试方法执行后调用"""
        pass
    
    def test_add(self):
        """测试加法功能"""
        result = self.calc.add(2, 3)
        self.assertEqual(result, 5)
    
    def test_divide(self):
        """测试除法功能"""
        result = self.calc.divide(10, 2)
        self.assertEqual(result, 5.0)
    
    def test_divide_by_zero(self):
        """测试除零异常"""
        with self.assertRaises(ValueError):
            self.calc.divide(10, 0)
    
    @patch('requests.get')
    def test_api_call(self, mock_get):
        """测试API调用（使用Mock）"""
        # 设置Mock返回值
        mock_response = Mock()
        mock_response.json.return_value = {'data': 'test'}
        mock_get.return_value = mock_response
        
        result = self.calc.get_data_from_api('http://test.com')
        
        # 验证结果和调用
        self.assertEqual(result, {'data': 'test'})
        mock_get.assert_called_once_with('http://test.com')

if __name__ == '__main__':
    unittest.main()
```

### 21.2. pytest 简洁测试

```python
import pytest
from unittest.mock import patch, Mock

# 被测试的函数
def validate_email(email):
    """验证邮箱格式"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def fetch_user_data(user_id):
    """获取用户数据"""
    if user_id <= 0:
        raise ValueError("用户ID必须大于0")
    # 模拟数据库查询
    return {"id": user_id, "name": f"User{user_id}"}

# pytest 测试函数
def test_validate_email_valid():
    """测试有效邮箱"""
    assert validate_email("test@example.com") == True
    assert validate_email("user.name+tag@domain.co.uk") == True

def test_validate_email_invalid():
    """测试无效邮箱"""
    assert validate_email("invalid-email") == False
    assert validate_email("@domain.com") == False
    assert validate_email("test@") == False

def test_fetch_user_data_valid():
    """测试获取用户数据"""
    result = fetch_user_data(1)
    assert result["id"] == 1
    assert result["name"] == "User1"

def test_fetch_user_data_invalid():
    """测试无效用户ID"""
    with pytest.raises(ValueError, match="用户ID必须大于0"):
        fetch_user_data(0)
    
    with pytest.raises(ValueError):
        fetch_user_data(-1)

# 参数化测试
@pytest.mark.parametrize("email,expected", [
    ("valid@example.com", True),
    ("another.valid@test.org", True),
    ("invalid-email", False),
    ("@invalid.com", False),
    ("", False),
])
def test_email_validation_parametrized(email, expected):
    """参数化测试邮箱验证"""
    assert validate_email(email) == expected
```

### 21.3. 测试夹具和配置

```python
import pytest
import tempfile
import os
from pathlib import Path

# 被测试的文件操作类
class FileManager:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
    
    def create_file(self, filename, content):
        """创建文件"""
        file_path = self.base_path / filename
        file_path.write_text(content, encoding='utf-8')
        return file_path
    
    def read_file(self, filename):
        """读取文件"""
        file_path = self.base_path / filename
        if not file_path.exists():
            raise FileNotFoundError(f"文件 {filename} 不存在")
        return file_path.read_text(encoding='utf-8')
    
    def list_files(self):
        """列出所有文件"""
        return [f.name for f in self.base_path.iterdir() if f.is_file()]

# pytest 夹具
@pytest.fixture
def temp_dir():
    """创建临时目录夹具"""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield tmp_dir

@pytest.fixture
def file_manager(temp_dir):
    """文件管理器夹具"""
    return FileManager(temp_dir)

@pytest.fixture(scope="module")
def sample_data():
    """模块级别的测试数据"""
    return {
        "users": [
            {"id": 1, "name": "Alice", "email": "alice@example.com"},
            {"id": 2, "name": "Bob", "email": "bob@example.com"},
        ]
    }

# 使用夹具的测试
def test_create_and_read_file(file_manager):
    """测试文件创建和读取"""
    content = "Hello, World!"
    filename = "test.txt"
    
    # 创建文件
    file_path = file_manager.create_file(filename, content)
    assert file_path.exists()
    
    # 读取文件
    read_content = file_manager.read_file(filename)
    assert read_content == content

def test_read_nonexistent_file(file_manager):
    """测试读取不存在的文件"""
    with pytest.raises(FileNotFoundError, match="文件 nonexistent.txt 不存在"):
        file_manager.read_file("nonexistent.txt")

def test_list_files(file_manager):
    """测试列出文件"""
    # 创建多个文件
    file_manager.create_file("file1.txt", "content1")
    file_manager.create_file("file2.txt", "content2")
    
    files = file_manager.list_files()
    assert len(files) == 2
    assert "file1.txt" in files
    assert "file2.txt" in files

def test_with_sample_data(sample_data):
    """使用示例数据的测试"""
    users = sample_data["users"]
    assert len(users) == 2
    assert users[0]["name"] == "Alice"
```

### 21.4. Mock 和 Patch 高级用法

```python
import pytest
from unittest.mock import Mock, patch, MagicMock, call
import requests

# 被测试的服务类
class UserService:
    def __init__(self, api_client):
        self.api_client = api_client
    
    def get_user(self, user_id):
        """获取单个用户"""
        response = self.api_client.get(f"/users/{user_id}")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    
    def create_user(self, user_data):
        """创建用户"""
        response = self.api_client.post("/users", json=user_data)
        response.raise_for_status()
        return response.json()
    
    def update_user_batch(self, user_updates):
        """批量更新用户"""
        results = []
        for user_id, data in user_updates.items():
            response = self.api_client.put(f"/users/{user_id}", json=data)
            results.append(response.json())
        return results

class APIClient:
    def __init__(self, base_url):
        self.base_url = base_url
    
    def get(self, path):
        return requests.get(f"{self.base_url}{path}")
    
    def post(self, path, json=None):
        return requests.post(f"{self.base_url}{path}", json=json)
    
    def put(self, path, json=None):
        return requests.put(f"{self.base_url}{path}", json=json)

# Mock 测试
class TestUserService:
    
    def test_get_user_success(self):
        """测试成功获取用户"""
        # 创建Mock API客户端
        mock_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": 1, "name": "Alice"}
        mock_client.get.return_value = mock_response
        
        service = UserService(mock_client)
        result = service.get_user(1)
        
        # 验证结果
        assert result == {"id": 1, "name": "Alice"}
        mock_client.get.assert_called_once_with("/users/1")
    
    def test_get_user_not_found(self):
        """测试用户不存在"""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.status_code = 404
        mock_client.get.return_value = mock_response
        
        service = UserService(mock_client)
        result = service.get_user(999)
        
        assert result is None
    
    def test_create_user(self):
        """测试创建用户"""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.json.return_value = {"id": 1, "name": "Alice", "email": "alice@example.com"}
        mock_client.post.return_value = mock_response
        
        service = UserService(mock_client)
        user_data = {"name": "Alice", "email": "alice@example.com"}
        result = service.create_user(user_data)
        
        assert result["id"] == 1
        mock_client.post.assert_called_once_with("/users", json=user_data)
    
    def test_update_user_batch(self):
        """测试批量更新用户"""
        mock_client = Mock()
        
        # 设置多个返回值
        mock_responses = [
            Mock(json=lambda: {"id": 1, "name": "Alice Updated"}),
            Mock(json=lambda: {"id": 2, "name": "Bob Updated"})
        ]
        mock_client.put.side_effect = mock_responses
        
        service = UserService(mock_client)
        updates = {
            1: {"name": "Alice Updated"},
            2: {"name": "Bob Updated"}
        }
        results = service.update_user_batch(updates)
        
        assert len(results) == 2
        assert results[0]["name"] == "Alice Updated"
        assert results[1]["name"] == "Bob Updated"
        
        # 验证调用次数和参数
        assert mock_client.put.call_count == 2
        expected_calls = [
            call("/users/1", json={"name": "Alice Updated"}),
            call("/users/2", json={"name": "Bob Updated"})
        ]
        mock_client.put.assert_has_calls(expected_calls)

# 使用 patch 装饰器
@patch('requests.get')
def test_api_client_get(mock_get):
    """测试API客户端GET请求"""
    mock_response = Mock()
    mock_response.json.return_value = {"data": "test"}
    mock_get.return_value = mock_response
    
    client = APIClient("https://api.example.com")
    response = client.get("/test")
    
    assert response.json() == {"data": "test"}
    mock_get.assert_called_once_with("https://api.example.com/test")

# 上下文管理器形式的patch
def test_api_client_with_context():
    """使用上下文管理器的patch"""
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.json.return_value = {"id": 1, "status": "created"}
        mock_post.return_value = mock_response
        
        client = APIClient("https://api.example.com")
        response = client.post("/users", json={"name": "test"})
        
        assert response.json()["status"] == "created"
        mock_post.assert_called_once_with(
            "https://api.example.com/users", 
            json={"name": "test"}
        )
```

### 21.5. 测试配置和运行

```python
# conftest.py - pytest 配置文件
import pytest
import os
from pathlib import Path

# 全局夹具
@pytest.fixture(scope="session")
def test_config():
    """测试配置"""
    return {
        "database_url": "sqlite:///:memory:",
        "api_base_url": "https://test-api.example.com",
        "debug": True
    }

@pytest.fixture(autouse=True)
def setup_test_environment():
    """自动使用的测试环境设置"""
    # 设置测试环境变量
    os.environ["TESTING"] = "true"
    yield
    # 清理
    if "TESTING" in os.environ:
        del os.environ["TESTING"]

# 自定义标记
pytest_plugins = []

def pytest_configure(config):
    """pytest 配置"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m "not slow"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )

# 测试用例示例
@pytest.mark.slow
def test_slow_operation():
    """标记为慢速测试"""
    import time
    time.sleep(1)  # 模拟慢速操作
    assert True

@pytest.mark.integration
def test_integration():
    """标记为集成测试"""
    assert True

# 跳过测试
@pytest.mark.skip(reason="功能尚未实现")
def test_future_feature():
    """跳过的测试"""
    pass

@pytest.mark.skipif(os.name == "nt", reason="不支持Windows")
def test_unix_only():
    """条件跳过测试"""
    assert True

# 预期失败
@pytest.mark.xfail(reason="已知的bug")
def test_known_bug():
    """预期失败的测试"""
    assert False
```

### 21.6. 测试运行命令

```bash
# unittest 运行
python -m unittest test_module.py
python -m unittest test_module.TestClass.test_method
python -m unittest discover -s tests -p "test_*.py"

# pytest 运行
pytest                              # 运行所有测试
pytest test_file.py                 # 运行特定文件
pytest test_file.py::test_function  # 运行特定测试
pytest -v                           # 详细输出
pytest -s                           # 显示print输出
pytest -x                           # 第一个失败后停止
pytest --tb=short                   # 简短的错误信息
pytest -m "not slow"                # 排除慢速测试
pytest -k "test_user"               # 运行名称包含test_user的测试
pytest --cov=mymodule               # 代码覆盖率
pytest --cov-report=html            # HTML覆盖率报告
```

### 21.7. 测试最佳实践

1. **测试命名**
   - 使用描述性的测试名称
   - 遵循 `test_[功能]_[场景]_[期望结果]` 模式

2. **测试结构**
   - 遵循 AAA 模式：Arrange（准备）、Act（执行）、Assert（断言）
   - 每个测试只测试一个功能点

3. **测试数据**
   - 使用夹具管理测试数据
   - 避免测试间的数据依赖

4. **Mock 使用**
   - 对外部依赖使用Mock
   - 验证Mock的调用参数和次数

5. **测试覆盖率**
   - 追求高覆盖率但不盲目追求100%
   - 重点测试核心业务逻辑

Python 单元测试是保证代码质量的重要手段，合理使用 unittest 和 pytest 可以构建可靠的测试体系。


## 22. Python 模块管理

### 22.1. pip 

install pip, pip 是 Python 包管理工具，该工具提供了对Python 包的查找、下载、安装、卸载的功能:
```bash
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py

# add /Users/<user>/Library/Python/3.9/bin into PATH
# sudo vi /etc/profile
# export PATH=$PATH:/Users/hk/Library/Python/3.9/bin
export PATH=$PATH:/Users/hk/Library/Python/3.9/bin

# A new release of pip is available: 23.2.1 -> 23.3.1
pip install --upgrade pip

# 设置
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
# Writing to /Users/hk/.config/pip/pip.conf

pip install --trusted-host pypi.tuna.tsinghua.edu.cn certifi
```

在 python 中，安装的第三方包会存放在 python 的安装目录下的 lib/site-packages 文件夹下，比如：`/Users/hk/Library/Python/3.9/lib/python/site-packages`

```bash
# install
pip install SomePackage              # 默认将安装最新版本
pip install SomePackage==1.0.4       # 指定版本
pip install 'SomePackage>=1.0.4'     # 最小版本

# upgrade
pip install --upgrade SomePackage
pip install -U 包名　　#缩写

# uninstall
pip uninstall SomePackage

# show info
pip show -f SomePackage

# list
pip list

# 分析依赖关系输出到 requirements.txt文件
# 列出当前 Python 环境中所有已安装的包及其版本号，包括直接安装的依赖和间接依赖（即依赖的依赖）。
pip freeze > requirements.txt

# 根据requirements.txt 版本安装
pip install -r requirements.txt

# ----------------------------
# 使用 pipreqs 安装依赖
pip install pipreqs

# 使用 pipreqs 分析依赖
# 通过扫描项目目录中的 Python 文件，分析 import 语句，识别项目实际使用的包。然后生成一个 requirements.txt，只包含项目代码中直接引用的依赖。
pipreqs .

```

### 22.2. uv

uv - An extremely fast Python package and project manager, written in Rust.
A single tool to replace pip, pip-tools, pipx, poetry, pyenv, twine, virtualenv, and more. 10-100x faster than pip.

install uv: 
```bash
# https://docs.astral.sh/uv/getting-started/installation/
curl -LsSf https://astral.sh/uv/install.sh | sh

```



## 23. Python 反射

Python 支持反射（Reflection），反射是指程序在运行时能够检查、访问和修改自身结构和行为的能力。Python 提供了丰富的内置函数和模块来实现反射功能。

### 23.1. 基本反射函数

```python
# 检查对象类型和属性
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def greet(self):
        return f"Hello, I'm {self.name}"
    
    def get_info(self):
        return f"Name: {self.name}, Age: {self.age}"

person = Person("Alice", 25)

# hasattr() - 检查对象是否有指定属性
print(hasattr(person, 'name'))      # True
print(hasattr(person, 'salary'))    # False

# getattr() - 获取对象属性值
name = getattr(person, 'name')
print(f"Name: {name}")              # Name: Alice

# 使用默认值
salary = getattr(person, 'salary', 0)
print(f"Salary: {salary}")          # Salary: 0

# setattr() - 设置对象属性值
setattr(person, 'salary', 50000)
print(f"Salary: {person.salary}")   # Salary: 50000

# delattr() - 删除对象属性
setattr(person, 'temp', 'temporary')
print(hasattr(person, 'temp'))      # True
delattr(person, 'temp')
print(hasattr(person, 'temp'))      # False
```

### 23.2. 动态调用方法

```python
# 动态获取和调用方法
class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
    
    def multiply(self, a, b):
        return a * b

calc = Calculator()

# 通过字符串获取方法
method_name = 'add'
if hasattr(calc, method_name):
    method = getattr(calc, method_name)
    result = method(10, 5)
    print(f"{method_name}: {result}")  # add: 15

# 批量调用方法
operations = ['add', 'subtract', 'multiply']
for op in operations:
    if hasattr(calc, op):
        method = getattr(calc, op)
        result = method(10, 5)
        print(f"{op}(10, 5) = {result}")
```

### 23.3. 使用 dir() 和 vars()

```python
# dir() - 列出对象的所有属性和方法
class Sample:
    class_var = "I'm a class variable"
    
    def __init__(self):
        self.instance_var = "I'm an instance variable"
    
    def method(self):
        pass

sample = Sample()

# 查看对象的所有属性和方法
print("Object attributes and methods:")
for attr in dir(sample):
    if not attr.startswith('_'):  # 过滤私有属性
        print(f"  {attr}: {type(getattr(sample, attr))}")

# vars() - 返回对象的 __dict__ 属性
print("\nInstance variables:")
for key, value in vars(sample).items():
    print(f"  {key}: {value}")
```

### 23.4. 动态创建类和对象

```python
# 使用 type() 动态创建类
def init_method(self, name):
    self.name = name

def greet_method(self):
    return f"Hello from {self.name}"

# 动态创建类
# type(name, bases, dict)
DynamicClass = type('DynamicClass', (), {
    '__init__': init_method,
    'greet': greet_method,
    'class_var': 'Dynamic class variable'
})

# 使用动态创建的类
obj = DynamicClass("Dynamic Object")
print(obj.greet())              # Hello from Dynamic Object
print(obj.class_var)            # Dynamic class variable
```

### 23.5. 使用 inspect 模块

```python
import inspect

class ExampleClass:
    """这是一个示例类"""
    
    def __init__(self, value):
        self.value = value
    
    def method_with_args(self, a, b=10, *args, **kwargs):
        """带参数的方法"""
        return a + b

obj = ExampleClass(42)

# 检查对象类型
print(f"Is class: {inspect.isclass(ExampleClass)}")
print(f"Is method: {inspect.ismethod(obj.method_with_args)}")
print(f"Is function: {inspect.isfunction(ExampleClass.method_with_args)}")

# 获取方法签名
sig = inspect.signature(obj.method_with_args)
print(f"Method signature: {sig}")

# 获取参数信息
for param_name, param in sig.parameters.items():
    print(f"Parameter: {param_name}, Default: {param.default}")

# 获取源代码
print("\nSource code:")
print(inspect.getsource(ExampleClass.method_with_args))

# 获取文档字符串
print(f"Docstring: {inspect.getdoc(ExampleClass)}")
```

### 23.6. 实际应用示例

```python
# 简单的插件系统示例
class PluginManager:
    def __init__(self):
        self.plugins = {}
    
    def register_plugin(self, name, plugin_class):
        """注册插件"""
        self.plugins[name] = plugin_class
    
    def get_plugin(self, name):
        """获取插件实例"""
        if name in self.plugins:
            return self.plugins[name]()
        return None
    
    def list_plugins(self):
        """列出所有插件"""
        return list(self.plugins.keys())
    
    def execute_plugin_method(self, plugin_name, method_name, *args, **kwargs):
        """动态执行插件方法"""
        plugin = self.get_plugin(plugin_name)
        if plugin and hasattr(plugin, method_name):
            method = getattr(plugin, method_name)
            return method(*args, **kwargs)
        return None

# 示例插件
class LoggerPlugin:
    def log(self, message):
        print(f"[LOG] {message}")

class EmailPlugin:
    def send(self, to, subject, body):
        print(f"[EMAIL] To: {to}, Subject: {subject}")
        print(f"[EMAIL] Body: {body}")

# 使用插件管理器
manager = PluginManager()
manager.register_plugin('logger', LoggerPlugin)
manager.register_plugin('email', EmailPlugin)

# 动态调用插件方法
manager.execute_plugin_method('logger', 'log', 'System started')
manager.execute_plugin_method('email', 'send', 'admin@example.com', 'Alert', 'System alert message')

print(f"Available plugins: {manager.list_plugins()}")
```

Python 的反射机制非常强大，常用于：
- 框架开发（如 Django ORM）
- 插件系统
- 配置驱动的应用
- 动态 API 调用
- 序列化/反序列化
- 测试框架


## 24. Python GC

Python 的垃圾回收（Garbage Collection，GC）是自动内存管理的核心机制，负责回收不再使用的对象所占用的内存。Python 采用了多种垃圾回收策略的组合来确保内存的有效管理。

### 24.1. Python GC 架构

Python 的垃圾回收系统采用了分层架构，主要包括以下几个组件：

```python
import gc
import sys
import weakref
from collections import defaultdict

# 查看 GC 的基本信息
print("GC 基本信息:")
print(f"GC 是否启用: {gc.isenabled()}")
print(f"GC 阈值: {gc.get_threshold()}")
print(f"GC 统计: {gc.get_stats()}")
print(f"当前 GC 计数: {gc.get_count()}")
```

#### 24.1.1. 内存管理层次

```python
# Python 内存管理的层次结构
"""
应用层对象
    ↓
Python 对象管理器 (PyObject_*)
    ↓
Python 内存分配器 (PyMem_*)
    ↓
C 运行时库 (malloc/free)
    ↓
操作系统内存管理
"""

# 演示对象的内存分配
class MemoryDemo:
    def __init__(self, data):
        self.data = data
        self.ref_count = sys.getrefcount(self)
    
    def __del__(self):
        print(f"对象 {id(self)} 被销毁")

# 创建对象并观察引用计数
obj1 = MemoryDemo("test data")
print(f"obj1 引用计数: {sys.getrefcount(obj1)}")

obj2 = obj1  # 增加引用
print(f"obj1 引用计数: {sys.getrefcount(obj1)}")

del obj2  # 减少引用
print(f"obj1 引用计数: {sys.getrefcount(obj1)}")

del obj1  # 最后一个引用被删除，对象被销毁
```

### 24.2. Python GC 算法

Python 使用多种垃圾回收算法的组合：

#### 24.2.1. 引用计数（Reference Counting）

```python
import sys

# 引用计数是 Python 的主要垃圾回收机制
class RefCountDemo:
    def __init__(self, name):
        self.name = name
    
    def __repr__(self):
        return f"RefCountDemo({self.name})"

def demonstrate_ref_counting():
    # 创建对象
    obj = RefCountDemo("test")
    print(f"创建后引用计数: {sys.getrefcount(obj)}")
    
    # 添加引用
    ref1 = obj
    print(f"添加引用后: {sys.getrefcount(obj)}")
    
    # 放入列表
    lst = [obj]
    print(f"放入列表后: {sys.getrefcount(obj)}")
    
    # 删除引用
    del ref1
    print(f"删除引用后: {sys.getrefcount(obj)}")
    
    # 清空列表
    lst.clear()
    print(f"清空列表后: {sys.getrefcount(obj)}")
    
    return obj

obj = demonstrate_ref_counting()
print(f"函数返回后: {sys.getrefcount(obj)}")
```

#### 24.2.2. 循环引用检测（Cycle Detection）

```python
import gc
import weakref

# 循环引用问题演示
class Node:
    def __init__(self, name):
        self.name = name
        self.children = []
        self.parent = None
    
    def add_child(self, child):
        child.parent = self
        self.children.append(child)
    
    def __repr__(self):
        return f"Node({self.name})"
    
    def __del__(self):
        print(f"Node {self.name} 被销毁")

def create_cycle():
    """创建循环引用"""
    # 禁用 GC 来观察循环引用问题
    gc.disable()
    
    parent = Node("parent")
    child1 = Node("child1")
    child2 = Node("child2")
    
    # 创建循环引用
    parent.add_child(child1)
    parent.add_child(child2)
    
    print(f"创建循环引用前 GC 计数: {gc.get_count()}")
    
    # 删除局部引用，但对象间仍有循环引用
    del parent, child1, child2
    
    print(f"删除引用后 GC 计数: {gc.get_count()}")
    print("注意：对象没有被销毁（没有看到 __del__ 输出）")
    
    # 手动运行 GC
    collected = gc.collect()
    print(f"手动 GC 回收了 {collected} 个对象")
    
    # 重新启用 GC
    gc.enable()

create_cycle()
```

#### 24.2.3. 分代垃圾回收（Generational GC）

```python
import gc
import time

# Python 使用分代垃圾回收优化性能
def demonstrate_generational_gc():
    """演示分代垃圾回收"""
    
    print("分代 GC 信息:")
    print(f"GC 阈值: {gc.get_threshold()}")
    print(f"各代对象数量: {gc.get_count()}")
    
    # 创建大量短生命周期对象（第0代）
    print("\n创建大量短生命周期对象...")
    temp_objects = []
    for i in range(1000):
        temp_objects.append([i] * 100)
    
    print(f"创建后各代对象数量: {gc.get_count()}")
    
    # 删除短生命周期对象
    del temp_objects
    print(f"删除后各代对象数量: {gc.get_count()}")
    
    # 手动触发 GC
    collected = gc.collect()
    print(f"GC 回收了 {collected} 个对象")
    print(f"GC 后各代对象数量: {gc.get_count()}")
    
    # 创建长生命周期对象
    long_lived = []
    for i in range(100):
        long_lived.append({"id": i, "data": "long lived data"})
    
    print(f"\n创建长生命周期对象后: {gc.get_count()}")
    
    # 多次 GC 后，长生命周期对象会被提升到更高代
    for i in range(3):
        gc.collect()
        print(f"第 {i+1} 次 GC 后: {gc.get_count()}")

demonstrate_generational_gc()
```

### 24.3. GC 性能特点

#### 24.3.1. GC 性能测试

```python
import gc
import time
import random
from memory_profiler import profile

class GCPerformanceTest:
    def __init__(self):
        self.objects = []
    
    def test_allocation_performance(self, num_objects=100000):
        """测试对象分配性能"""
        
        # 测试启用 GC 的性能
        gc.enable()
        start_time = time.time()
        
        for i in range(num_objects):
            obj = {"id": i, "data": [random.randint(1, 100) for _ in range(10)]}
            self.objects.append(obj)
        
        gc_enabled_time = time.time() - start_time
        gc_count_enabled = gc.get_count()
        
        # 清理对象
        self.objects.clear()
        gc.collect()
        
        # 测试禁用 GC 的性能
        gc.disable()
        start_time = time.time()
        
        for i in range(num_objects):
            obj = {"id": i, "data": [random.randint(1, 100) for _ in range(10)]}
            self.objects.append(obj)
        
        gc_disabled_time = time.time() - start_time
        gc_count_disabled = gc.get_count()
        
        # 重新启用 GC
        gc.enable()
        
        print(f"对象分配性能测试 ({num_objects} 个对象):")
        print(f"启用 GC 耗时: {gc_enabled_time:.4f}秒")
        print(f"禁用 GC 耗时: {gc_disabled_time:.4f}秒")
        print(f"性能差异: {gc_enabled_time / gc_disabled_time:.2f}x")
        print(f"启用 GC 时对象计数: {gc_count_enabled}")
        print(f"禁用 GC 时对象计数: {gc_count_disabled}")
    
    def test_gc_overhead(self):
        """测试 GC 开销"""
        
        # 创建循环引用对象
        def create_cycles(n):
            cycles = []
            for i in range(n):
                a = {"name": f"obj_a_{i}"}
                b = {"name": f"obj_b_{i}"}
                a["ref"] = b
                b["ref"] = a
                cycles.append((a, b))
            return cycles
        
        print("\nGC 开销测试:")
        
        # 测试不同数量循环引用的 GC 性能
        for n in [1000, 5000, 10000]:
            start_time = time.time()
            cycles = create_cycles(n)
            creation_time = time.time() - start_time
            
            # 删除引用，触发 GC
            del cycles
            
            start_time = time.time()
            collected = gc.collect()
            gc_time = time.time() - start_time
            
            print(f"{n} 个循环引用:")
            print(f"  创建耗时: {creation_time:.4f}秒")
            print(f"  GC 耗时: {gc_time:.4f}秒")
            print(f"  回收对象数: {collected}")
            print(f"  GC 开销比例: {gc_time / creation_time:.2%}")

# 运行性能测试
test = GCPerformanceTest()
test.test_allocation_performance()
test.test_gc_overhead()
```

#### 24.3.2. 内存泄漏检测

```python
import gc
import sys
from collections import defaultdict

def analyze_memory_leaks():
    """分析内存泄漏"""
    
    # 获取所有对象的类型统计
    def get_object_stats():
        stats = defaultdict(int)
        for obj in gc.get_objects():
            stats[type(obj).__name__] += 1
        return stats
    
    print("内存泄漏检测:")
    
    # 记录初始状态
    initial_stats = get_object_stats()
    initial_count = len(gc.get_objects())
    
    print(f"初始对象数量: {initial_count}")
    
    # 模拟可能的内存泄漏
    leaked_objects = []
    
    class LeakyClass:
        def __init__(self, data):
            self.data = data
            self.circular_ref = self  # 自引用
    
    # 创建一些可能泄漏的对象
    for i in range(1000):
        obj = LeakyClass(f"data_{i}")
        leaked_objects.append(obj)
    
    # 删除引用但保留循环引用
    del leaked_objects
    
    # 检查对象增长
    after_stats = get_object_stats()
    after_count = len(gc.get_objects())
    
    print(f"操作后对象数量: {after_count}")
    print(f"对象增长: {after_count - initial_count}")
    
    # 显示增长最多的对象类型
    print("\n对象类型增长统计:")
    for obj_type, count in after_stats.items():
        initial = initial_stats.get(obj_type, 0)
        if count > initial:
            print(f"  {obj_type}: {initial} -> {count} (+{count - initial})")
    
    # 运行 GC 并检查回收情况
    collected = gc.collect()
    final_count = len(gc.get_objects())
    
    print(f"\nGC 回收了 {collected} 个对象")
    print(f"最终对象数量: {final_count}")
    print(f"净增长: {final_count - initial_count}")

analyze_memory_leaks()
```

### 24.4. GC 优化策略

#### 24.4.1. 避免循环引用

```python
import weakref

# 使用弱引用避免循环引用
class Parent:
    def __init__(self, name):
        self.name = name
        self.children = []
    
    def add_child(self, child):
        child.parent = weakref.ref(self)  # 使用弱引用
        self.children.append(child)
    
    def __repr__(self):
        return f"Parent({self.name})"
    
    def __del__(self):
        print(f"Parent {self.name} 被销毁")

class Child:
    def __init__(self, name):
        self.name = name
        self.parent = None
    
    def get_parent(self):
        if self.parent is not None:
            return self.parent()  # 调用弱引用
        return None
    
    def __repr__(self):
        return f"Child({self.name})"
    
    def __del__(self):
        print(f"Child {self.name} 被销毁")

# 测试弱引用
def test_weak_references():
    parent = Parent("parent")
    child = Child("child")
    
    parent.add_child(child)
    
    print(f"Child 的父对象: {child.get_parent()}")
    
    # 删除父对象
    del parent
    
    print(f"删除父对象后，Child 的父对象: {child.get_parent()}")
    
    del child

test_weak_references()
```

#### 24.4.2. 手动内存管理

```python
import gc
from contextlib import contextmanager

@contextmanager
def gc_disabled():
    """临时禁用 GC 的上下文管理器"""
    was_enabled = gc.isenabled()
    gc.disable()
    try:
        yield
    finally:
        if was_enabled:
            gc.enable()

def optimize_bulk_operations():
    """优化批量操作的 GC 性能"""
    
    # 在批量操作时禁用 GC
    with gc_disabled():
        # 执行大量对象创建操作
        large_list = []
        for i in range(100000):
            large_list.append({"id": i, "data": f"item_{i}"})
        
        print(f"批量操作完成，创建了 {len(large_list)} 个对象")
    
    # 操作完成后手动运行 GC
    collected = gc.collect()
    print(f"手动 GC 回收了 {collected} 个对象")

# 自定义 GC 阈值
def tune_gc_thresholds():
    """调优 GC 阈值"""
    
    # 获取当前阈值
    current = gc.get_threshold()
    print(f"当前 GC 阈值: {current}")
    
    # 对于内存敏感的应用，可以降低阈值
    gc.set_threshold(500, 10, 10)
    print(f"调整后 GC 阈值: {gc.get_threshold()}")
    
    # 对于性能敏感的应用，可以提高阈值
    gc.set_threshold(2000, 20, 20)
    print(f"性能优化 GC 阈值: {gc.get_threshold()}")
    
    # 恢复默认阈值
    gc.set_threshold(*current)
    print(f"恢复默认阈值: {gc.get_threshold()}")

optimize_bulk_operations()
tune_gc_thresholds()
```

### 24.5. GC 监控和调试

```python
import gc
import sys
import tracemalloc
from functools import wraps

def gc_monitor(func):
    """GC 监控装饰器"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # 记录执行前状态
        before_count = gc.get_count()
        before_objects = len(gc.get_objects())
        
        # 执行函数
        result = func(*args, **kwargs)
        
        # 记录执行后状态
        after_count = gc.get_count()
        after_objects = len(gc.get_objects())
        
        print(f"\n函数 {func.__name__} GC 监控:")
        print(f"  执行前 GC 计数: {before_count}")
        print(f"  执行后 GC 计数: {after_count}")
        print(f"  对象数量变化: {before_objects} -> {after_objects} ({after_objects - before_objects:+d})")
        
        return result
    return wrapper

@gc_monitor
def memory_intensive_function():
    """内存密集型函数示例"""
    data = []
    for i in range(10000):
        data.append({"id": i, "values": list(range(100))})
    return len(data)

# GC 调试工具
class GCDebugger:
    def __init__(self):
        self.callbacks = []
    
    def add_callback(self, callback):
        """添加 GC 回调函数"""
        self.callbacks.append(callback)
        gc.callbacks.append(callback)
    
    def remove_callbacks(self):
        """移除所有回调函数"""
        for callback in self.callbacks:
            if callback in gc.callbacks:
                gc.callbacks.remove(callback)
        self.callbacks.clear()
    
    @staticmethod
    def gc_callback(phase, info):
        """GC 回调函数"""
        print(f"GC 事件: phase={phase}, info={info}")

# 使用 GC 调试器
debugger = GCDebugger()
debugger.add_callback(GCDebugger.gc_callback)

# 运行测试
result = memory_intensive_function()
print(f"函数返回值: {result}")

# 清理
debugger.remove_callbacks()
```

### 24.6. GC 最佳实践

1. **避免循环引用**
   - 使用弱引用（`weakref`）
   - 及时断开循环引用
   - 使用上下文管理器自动清理

2. **优化对象生命周期**
   - 尽早释放不需要的对象
   - 使用对象池重用对象
   - 避免全局变量持有大对象

3. **批量操作优化**
   - 在批量操作时临时禁用 GC
   - 操作完成后手动触发 GC
   - 调整 GC 阈值适应应用特点

4. **内存监控**
   - 定期监控内存使用情况
   - 使用性能分析工具
   - 建立内存使用基准

5. **特殊场景处理**
   - 长时间运行的服务定期清理
   - 大数据处理时分批处理
   - 多线程环境注意 GC 的线程安全性

Python 的垃圾回收机制虽然自动化程度很高，但了解其工作原理和性能特点对于编写高效的 Python 程序仍然很重要。合理使用 GC 相关的工具和技术可以显著提升应用程序的性能和稳定性。



## 25. Python 项目环境

Python 虚拟环境是一种工具，用于为不同的项目创建独立的 Python 运行环境。
它的主要目的是解决依赖冲突问题，确保每个项目拥有自己的 Python 解释器和依赖库版本，而不会干扰系统的全局 Python 环境或其他项目。

为什么使用虚拟环境？
- 隔离性：不同项目可能需要不同版本的库（例如，项目 A 需要 Django 2.0，项目 B 需要 Django 3.0），虚拟环境可以避免冲突。
- 可移植性：虚拟环境中的依赖可以通过 requirements.txt 文件导出，便于在其他机器上重现环境。
- 清洁性：避免在全局环境中安装过多包，导致环境混乱。

Python 提供了内置工具 venv 来创建和管理虚拟环境，同时也有第三方工具如 virtualenv 和 conda，但本文主要介绍 venv，因为它是 Python 标准库的一部分。

```bash
# 创建虚拟环境
# python -m venv 虚拟环境名称
python -m venv venv

# 进入虚拟环境
source venv/bin/activate

pip install requests
pip list

# 将项目中的依赖写入到 requirements.txt
pip freeze > requirements.txt
# 根据 requirements.txt 指定的版本安装
pip install -r requirements.txt

# 退出虚拟环境
deactivate

```


## 26. Python 性能

Python 是一门解释型、动态类型的高级编程语言，在开发效率和代码可读性方面表现优秀，但在执行性能方面相对较慢。了解 Python 的性能特点和优化方法对于开发高效的应用程序至关重要。

### 26.1. Python 性能特点

**优势：**
- 开发效率高，代码简洁易读
- 丰富的标准库和第三方库生态
- 跨平台兼容性好
- 适合快速原型开发和数据分析

**劣势：**
- 执行速度相对较慢（比 C/C++、Go 等编译型语言慢 10-100 倍）
- 内存占用较高
- GIL（全局解释器锁）限制了多线程性能
- 动态类型检查带来额外开销

### 26.2. 影响 Python 性能的主要因素

#### 26.2.1. 解释执行

```python
# Python 是解释型语言，每次执行都需要解释字节码
import dis

def add_numbers(a, b):
    return a + b

# 查看字节码
print("字节码:")
dis.dis(add_numbers)

# 输出显示了 Python 需要执行的底层操作
# 每个简单的操作都需要多个字节码指令
```

#### 26.2.2. 动态类型检查

```python
import time

# 动态类型检查的开销
def dynamic_typing_overhead():
    start = time.time()
    
    # Python 需要在运行时检查类型
    x = 1
    for i in range(1000000):
        x = x + i  # 每次操作都需要类型检查
    
    end = time.time()
    print(f"动态类型操作耗时: {end - start:.4f}秒")

# 对比：使用类型提示（仅提示，不强制）
def typed_function(a: int, b: int) -> int:
    return a + b

dynamic_typing_overhead()
```

#### 26.2.3. GIL（全局解释器锁）

```python
import threading
import time

# GIL 限制了真正的并行执行
def cpu_bound_task(n):
    """CPU 密集型任务"""
    total = 0
    for i in range(n):
        total += i * i
    return total

def test_gil_impact():
    n = 1000000
    
    # 单线程执行
    start = time.time()
    result1 = cpu_bound_task(n)
    result2 = cpu_bound_task(n)
    single_thread_time = time.time() - start
    
    # 多线程执行（受 GIL 限制）
    start = time.time()
    threads = []
    results = []
    
    def worker(n, results, index):
        results.append(cpu_bound_task(n))
    
    results = [None, None]
    t1 = threading.Thread(target=lambda: worker(n, results, 0))
    t2 = threading.Thread(target=lambda: worker(n, results, 1))
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    multi_thread_time = time.time() - start
    
    print(f"单线程耗时: {single_thread_time:.4f}秒")
    print(f"多线程耗时: {multi_thread_time:.4f}秒")
    print(f"性能提升: {single_thread_time / multi_thread_time:.2f}x")

test_gil_impact()
```

#### 26.2.4. 内存管理开销

```python
import sys

# Python 对象的内存开销
print("基本数据类型内存占用:")
print(f"int(42): {sys.getsizeof(42)} bytes")
print(f"float(3.14): {sys.getsizeof(3.14)} bytes")
print(f"str('hello'): {sys.getsizeof('hello')} bytes")
print(f"list([1,2,3]): {sys.getsizeof([1,2,3])} bytes")
print(f"dict({{'a':1}}): {sys.getsizeof({'a':1})} bytes")

# 对比 C 语言中的基本类型通常只需要 4-8 字节
# Python 对象包含了类型信息、引用计数等额外数据
```

### 26.3. 性能优化方案

#### 26.3.1. 算法和数据结构优化

```python
import time
from collections import deque, defaultdict

# 1. 选择合适的数据结构
def list_vs_deque():
    """列表 vs 双端队列性能对比"""
    n = 100000
    
    # 列表在头部插入效率低
    start = time.time()
    lst = []
    for i in range(n):
        lst.insert(0, i)  # O(n) 操作
    list_time = time.time() - start
    
    # 双端队列在头部插入效率高
    start = time.time()
    dq = deque()
    for i in range(n):
        dq.appendleft(i)  # O(1) 操作
    deque_time = time.time() - start
    
    print(f"列表头部插入耗时: {list_time:.4f}秒")
    print(f"双端队列头部插入耗时: {deque_time:.4f}秒")
    print(f"性能提升: {list_time / deque_time:.2f}x")

# 2. 使用生成器减少内存占用
def generator_vs_list():
    """生成器 vs 列表内存对比"""
    
    # 列表：一次性创建所有元素
    def create_list(n):
        return [x * x for x in range(n)]
    
    # 生成器：按需生成元素
    def create_generator(n):
        return (x * x for x in range(n))
    
    n = 1000000
    
    # 内存使用对比
    lst = create_list(n)
    gen = create_generator(n)
    
    print(f"列表内存占用: {sys.getsizeof(lst)} bytes")
    print(f"生成器内存占用: {sys.getsizeof(gen)} bytes")

list_vs_deque()
print()
generator_vs_list()
```

#### 26.3.2. 使用内置函数和库

```python
import time
import operator
from functools import reduce

# 内置函数通常用 C 实现，性能更好
def builtin_vs_manual():
    """内置函数 vs 手动实现性能对比"""
    numbers = list(range(1000000))
    
    # 手动实现求和
    start = time.time()
    total = 0
    for num in numbers:
        total += num
    manual_time = time.time() - start
    
    # 使用内置 sum 函数
    start = time.time()
    total = sum(numbers)
    builtin_time = time.time() - start
    
    print(f"手动求和耗时: {manual_time:.4f}秒")
    print(f"内置sum耗时: {builtin_time:.4f}秒")
    print(f"性能提升: {manual_time / builtin_time:.2f}x")

# 使用 map, filter, reduce 等函数式编程工具
def functional_programming_example():
    """函数式编程示例"""
    numbers = range(1000000)
    
    # 传统方式
    start = time.time()
    result = []
    for x in numbers:
        if x % 2 == 0:
            result.append(x * x)
    traditional_time = time.time() - start
    
    # 函数式方式
    start = time.time()
    result = list(map(lambda x: x * x, filter(lambda x: x % 2 == 0, numbers)))
    functional_time = time.time() - start
    
    print(f"传统方式耗时: {traditional_time:.4f}秒")
    print(f"函数式方式耗时: {functional_time:.4f}秒")

builtin_vs_manual()
print()
functional_programming_example()
```

#### 26.3.3. 使用 NumPy 进行数值计算

```python
import numpy as np
import time

# NumPy 使用 C 实现，性能远超纯 Python
def numpy_vs_python():
    """NumPy vs 纯 Python 性能对比"""
    size = 1000000
    
    # 纯 Python 列表操作
    python_list1 = list(range(size))
    python_list2 = list(range(size, size * 2))
    
    start = time.time()
    python_result = [a + b for a, b in zip(python_list1, python_list2)]
    python_time = time.time() - start
    
    # NumPy 数组操作
    numpy_array1 = np.arange(size)
    numpy_array2 = np.arange(size, size * 2)
    
    start = time.time()
    numpy_result = numpy_array1 + numpy_array2
    numpy_time = time.time() - start
    
    print(f"Python列表操作耗时: {python_time:.4f}秒")
    print(f"NumPy数组操作耗时: {numpy_time:.4f}秒")
    print(f"性能提升: {python_time / numpy_time:.2f}x")

# 注意：需要安装 NumPy
# pip install numpy
try:
    numpy_vs_python()
except ImportError:
    print("请安装 NumPy: pip install numpy")
```

#### 26.3.4. 缓存和记忆化

```python
from functools import lru_cache
import time

# 使用缓存避免重复计算
def fibonacci_comparison():
    """斐波那契数列：缓存 vs 无缓存"""
    
    # 无缓存版本
    def fib_no_cache(n):
        if n < 2:
            return n
        return fib_no_cache(n-1) + fib_no_cache(n-2)
    
    # 使用 LRU 缓存
    @lru_cache(maxsize=None)
    def fib_with_cache(n):
        if n < 2:
            return n
        return fib_with_cache(n-1) + fib_with_cache(n-2)
    
    n = 35
    
    # 测试无缓存版本
    start = time.time()
    result1 = fib_no_cache(n)
    no_cache_time = time.time() - start
    
    # 测试缓存版本
    start = time.time()
    result2 = fib_with_cache(n)
    cache_time = time.time() - start
    
    print(f"无缓存斐波那契({n})耗时: {no_cache_time:.4f}秒")
    print(f"缓存斐波那契({n})耗时: {cache_time:.4f}秒")
    print(f"性能提升: {no_cache_time / cache_time:.2f}x")
    print(f"缓存信息: {fib_with_cache.cache_info()}")

fibonacci_comparison()
```

#### 26.3.5. 并发和并行处理

```python
import asyncio
import aiohttp
import requests
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing

# 1. 异步编程处理 I/O 密集型任务
async def async_http_example():
    """异步 HTTP 请求示例"""
    urls = [
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/1'
    ]
    
    # 同步请求
    start = time.time()
    for url in urls:
        try:
            response = requests.get(url, timeout=5)
        except:
            pass
    sync_time = time.time() - start
    
    # 异步请求
    async def fetch(session, url):
        try:
            async with session.get(url) as response:
                return await response.text()
        except:
            return None
    
    start = time.time()
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        await asyncio.gather(*tasks)
    async_time = time.time() - start
    
    print(f"同步请求耗时: {sync_time:.2f}秒")
    print(f"异步请求耗时: {async_time:.2f}秒")
    print(f"性能提升: {sync_time / async_time:.2f}x")

# 2. 多进程处理 CPU 密集型任务
def cpu_intensive_task(n):
    """CPU 密集型任务"""
    total = 0
    for i in range(n):
        total += i * i
    return total

def multiprocessing_example():
    """多进程处理示例"""
    tasks = [1000000] * 4
    
    # 单进程处理
    start = time.time()
    results = [cpu_intensive_task(task) for task in tasks]
    single_process_time = time.time() - start
    
    # 多进程处理
    start = time.time()
    with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
        results = list(executor.map(cpu_intensive_task, tasks))
    multi_process_time = time.time() - start
    
    print(f"单进程处理耗时: {single_process_time:.4f}秒")
    print(f"多进程处理耗时: {multi_process_time:.4f}秒")
    print(f"性能提升: {single_process_time / multi_process_time:.2f}x")

# 运行示例
print("多进程示例:")
multiprocessing_example()

# 异步示例需要在异步环境中运行
# asyncio.run(async_http_example())
```

#### 26.3.6. 使用编译器和 JIT

```python
# 使用 Numba JIT 编译器加速数值计算
# pip install numba

try:
    from numba import jit
    import numpy as np
    
    # 普通 Python 函数
    def python_sum_of_squares(arr):
        total = 0
        for x in arr:
            total += x * x
        return total
    
    # 使用 Numba JIT 编译
    @jit(nopython=True)
    def numba_sum_of_squares(arr):
        total = 0
        for x in arr:
            total += x * x
        return total
    
    def numba_comparison():
        arr = np.random.random(1000000)
        
        # 预热 JIT 编译器
        numba_sum_of_squares(arr[:100])
        
        # 测试 Python 版本
        start = time.time()
        result1 = python_sum_of_squares(arr)
        python_time = time.time() - start
        
        # 测试 Numba 版本
        start = time.time()
        result2 = numba_sum_of_squares(arr)
        numba_time = time.time() - start
        
        print(f"Python版本耗时: {python_time:.4f}秒")
        print(f"Numba版本耗时: {numba_time:.4f}秒")
        print(f"性能提升: {python_time / numba_time:.2f}x")
    
    print("\nNumba JIT 编译示例:")
    numba_comparison()
    
except ImportError:
    print("请安装 Numba: pip install numba")
```

### 26.4. 性能分析工具

```python
import cProfile
import pstats
import io
from line_profiler import LineProfiler

# 1. 使用 cProfile 进行性能分析
def profile_example():
    """性能分析示例"""
    
    def slow_function():
        total = 0
        for i in range(100000):
            total += i * i
        return total
    
    def another_function():
        return sum(x * x for x in range(50000))
    
    def main():
        result1 = slow_function()
        result2 = another_function()
        return result1 + result2
    
    # 使用 cProfile 分析
    pr = cProfile.Profile()
    pr.enable()
    
    result = main()
    
    pr.disable()
    
    # 输出分析结果
    s = io.StringIO()
    ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
    ps.print_stats()
    
    print("性能分析结果:")
    print(s.getvalue())

# 2. 内存使用分析
def memory_usage_example():
    """内存使用示例"""
    import tracemalloc
    
    # 开始跟踪内存
    tracemalloc.start()
    
    # 创建一些对象
    data = []
    for i in range(100000):
        data.append({'id': i, 'value': i * 2})
    
    # 获取内存使用情况
    current, peak = tracemalloc.get_traced_memory()
    print(f"当前内存使用: {current / 1024 / 1024:.2f} MB")
    print(f"峰值内存使用: {peak / 1024 / 1024:.2f} MB")
    
    tracemalloc.stop()

print("性能分析示例:")
profile_example()
print("\n内存使用示例:")
memory_usage_example()
```

### 26.5. 性能优化最佳实践

1. **选择合适的数据结构**
   - 使用 `set` 进行成员检查而不是 `list`
   - 使用 `deque` 进行频繁的头尾操作
   - 使用 `dict` 进行快速查找

2. **避免不必要的计算**
   - 使用缓存机制
   - 延迟计算（生成器）
   - 预计算常用值

3. **利用内置函数和库**
   - 优先使用内置函数（`sum`, `max`, `min` 等）
   - 使用 NumPy 进行数值计算
   - 使用 pandas 进行数据处理

4. **合理使用并发**
   - I/O 密集型任务使用异步编程
   - CPU 密集型任务使用多进程
   - 避免在 CPU 密集型任务中使用多线程

5. **性能监控**
   - 定期进行性能分析
   - 监控内存使用
   - 建立性能基准测试

6. **考虑替代方案**
   - 使用 PyPy 替代 CPython
   - 使用 Cython 编写性能关键部分
   - 使用 Rust/C++ 扩展模块

Python 的性能优化是一个持续的过程，需要根据具体应用场景选择合适的优化策略。记住过早优化是万恶之源，应该先确保代码正确性，然后通过性能分析找出瓶颈，再进行针对性优化。


# A. 参考资料

- Python 语言参考手册, python 官网, https://docs.python.org/zh-cn/3/reference/
- Python 教程, python 官网, https://docs.python.org/zh-cn/3/tutorial/
- Python 教程, 廖雪峰, https://www.liaoxuefeng.com/wiki/1016959663602400
- Python, 维基百科, https://zh.wikipedia.org/zh-hans/Python

# A. 编辑历史
1. 2023-09-26, created

