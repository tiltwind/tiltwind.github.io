<!---
markmeta_author: wongoo
markmeta_date: 2020-05-18
markmeta_title: 字符编码
markmeta_categories: cs
markmeta_tags: unicode,charset
-->

# 字符编码

> unicode和UCS是字符集，两者基本一一对应了，每一个字符对应一个码位(code point)。
> UCS-2,UCS-4,UTF-16,UTF-8等为字符编码, 定义了一个码位(code point)的二进制表示。


## 1. unicode

unicode是由 Unicode Consortium 维护的字符编码标准，已和 ISO 制定的 UCS ISO/IEC 10646 保持同步，码位一一对应。

截止 2020年3月, 以发布到 unicode 13.0版本，包含143,859个字符。

unicode的码位范围 `U+0000 - U+10FFFF`, 共17个平面 `0 - 0x10`，每个平面拥有 `0 - 0xFFFF` 即 2^16(65,536) 个码位.

有一些码位没有分配字符，也有一些码位被保留，成为私有的，也有一些码位是永远被保留的，作为无字符的标志。

第一个平面 U+0000 - U+FFFF 成为 BMP (Basic Multilingual Plane) **基本多文种平面**, 其已包含绝大部分常用字符。

其余16号平面 `U+10000 - U+10FFFF` 称为 Supplementary Plane **补充平面**。


参考：
- https://en.wikipedia.org/wiki/Unicode
- https://en.wikipedia.org/wiki/Plane_(Unicode)
- https://en.wikipedia.org/wiki/Code_point


## 2. UCS

UCS (Universal Coded Character Set) 是由 ISO 维护的，以 ISO/IEC 10646 标准发布， 和unicode保持同步，码位一一对应。


UCS-2 和 UCS-4 是 UCS 的一种固定长度编码格式。

UCS-2 用2个字节来表示一个字符，和 0 - 65535 码位的字符一一映射， 所以UCS-2能够表示 BMP 所有码位，但却无法表示操过BMP范围的字符。

UC2-4 用4个字节来表示一个字符(实际只有31位，最高位必须是0)编码。
UCS-4根据最高位为0的最高字节分成2^7=128个group。
每个group再根据次高字节分为256个plane。
每个plane根据第3个字节分为256行 (rows)，
每行包含256个cells。当然同一行的cells只是最后一个字节不同，其余都相同。
UCS-4中高两个字节为0的码位称为BMP; 
UCS-4的BMP去掉前面两个零字节就得到UCS-2; 
UCS-2加上两个零字节就得到UCS-4中的BMP。

理论上UCS-4编码范围能达到U+7FFFFFFF，但是因为iso和unicode达成共识，只会用17个平面内的字符。UTF-32是定长的编码，和UCS-4无论实现和编码都是基本一样的，UTF-32是UCS-4的子集。

当前，Unicode深入人心，且UTF-8大行其道，UCS编码基本被等同于UTF-16，UTF-32了，所以目前UCS基本谈出人们的视野中。（Windows NT用的就是UCS-2）

> ISO 10646 和 Unicode 两个标准都有相同字符，但 unicode更新添加新字符的速度更快。 unicode还定义了一系列规范和规则，ISO 10646 只是一个字符映射表。

参考:
- https://en.wikipedia.org/wiki/Universal_Coded_Character_Set



## 3. UTF-32

UTF-32 用 完整 32 bit 来表示一个组字符，和 unicode 码位数字值一一对应，因为大部分都没有达到 32 bit，要往其前面补0。其基本和 UCS-4等价的。

参考:
- https://en.wikipedia.org/wiki/UTF-32


## 4. UTF-16

Unicode最初支持16位的code point，后来发现不够用，于是用 UTF-16 扩展 UCS-2。

unicode在BMP区域内的预留了一片连续空间 `U+D800 - U+DFFF`的码位区段是永久保留不映射到字符，用于映射 UTF-16 高位低位代理字符，使得UTF-16 能够对辅助平面的字符的码位进行编码。

将辅助平面字符(U+010000 - U+10FFFF)转换为2个UTF-16字符步骤:

1. 码点 U 不超过 0x10FFFF, 减去 0x10000 , 剩下一个 20 bit 数字 (U') 范围 0x00000–0xFFFFF. 
2. 高 10 bit (范围 0x000–0x3FF) 加上 0xD800 作为第一个 16-bit 编码单元, 即高位代理 high surrogate (W1), 范围 0xD800–0xDBFF.
3. 低 10 bit (范围 0x000–0x3FF) 加上 0xDC00 作为第二个 16-bit 编码单元, 即地位代理 low surrogate (W2), 范围 0xDC00–0xDFFF.

```java
// \U1F923 - \U10000 = \UF923
// \UF923 = 1111100100100011 = 00001111100100100011 = [0000111110][0100100011] = [\U3E][\U123]
// \UD800 + \U3E = \UD83E
// \UDC00 + \U123 = \UDD23
// 
// The result: \UD83E\UDD23
public static void main(String[] args) {
    int input = 0x1f923;
    int x = input - 0x10000;

    int highTenBits = x >> 10;
    int lowTenBits = x & ((1 << 10) - 1);

    int high = highTenBits + 0xd800;
    int low = lowTenBits + 0xdc00;

    System.out.println(String.format("[%x][%x]", high, low));
}
```

参考:
- https://en.wikipedia.org/wiki/UTF-16


## 5. UTF-8

UTF-8 支持unicode所有码位的编码，按照UTF-8标准： 
1. 以0开始的字节，都与原来的ASCII码兼容，也就是说，0xxxxxxx不需要额外转换，就是我们平时用的ASCII码。 
2. 以10开始的字节，都不是每个UNICODE的第一个字节，都是紧跟着前一位。例如：10110101，这个字节不可以单独解析，必须通过前一个字节来解析，如果前一个也是10开头，就继续前溯。 
3. 以11开始的字节，都表示是UNICODE的第一个字节，而且后面紧跟着若干个以10开头的字节。如果是110xxxxx（就是最左边的0的左边有2个1），代表后面还有1个10xxxxxx；如果是1110xxxx（就是最左边的0的左边有3个1），代表后面还有2个10xxxxxx；以此类推，一直到1111110x。 

具体的表格如下, 支持最多6字节，但最大的unicode码位也只需4字节： 
```
1 bytes U+0000    - U+007F    : 0xxxxxxx 
2 bytes U+0080    - U+07FF    : 110xxxxx 10xxxxxx 
3 bytes U+0800    - U+FFFF    : 1110xxxx 10xxxxxx 10xxxxxx 
4 bytes U+10000   - U+10FFFF  : 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx 
5 bytes U+200000  - U+3FFFFFF : 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 
6 bytes U+4000000 - U+7FFFFFFF: 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 
```

很明显，以11开头的，最左边的0左边有多少个1，那这个UTF-8的表示长度就有多少个字节.

上面是用6个字节，最多可以表示2 ^ 31个的字符，实际上，只有UCS-4才有这么多的字符，对于UCS-2，仅仅有2 ^ 16个字符，只需要三个字节就可以。

UCS-2和UTF-8的转换，只涉及到位运算，不需要像GBK般需要查找代码表，所以转换效率很高。 

先来说说UTF-8转UCS-2(BMP)： 
1. 对于以0开始的字节，直接在前面部补一个0的字节凑成2个字节（即0xxxxxxx ==> 00000000 0xxxxxxxx）； 
2. 对于以110开始（110xxxxx）的字节，把后面紧跟着的一个10xxxxxx拿过来，首先在高位字节的左边补5个零，然后把11个“x”放在右边（即110xxxxx 10yyyyyy ==> 00000xxx xxyyyyyy）； 
3. 对于以1110开始（1110xxxx）的字节，把后面紧跟着的两个10xxxxxx拿过来，数一下，一共有16个“x”，没错，就是把这16个“x”组成两个字节（即1110xxxx 10yyyyyy 10zzzzzz ==> xxxxyyyy yyzzzzzz）。 

在来说说UCS-2(BMP)转UTF-8： 
1. 对于不大于0x007F（即00000000 01111111）的，直接把它转成一个字节，变成ASCII； 
2. 对于不大于0x07FF（即00000111 11111111）的，转换成两个字节，转换的时候把右边的11位分别放到110xxxxx 10yyyyyy里边，即00000aaa bbbbbbbb ==> 110aaabb 10bbbbbb 
3. 剩下的回转换成三个字节，转换的时候也是把16个位分别填写到那三个字节里面，即aaaaaaaa bbbbbbbb ==> 1110aaaa 10aaaabb 10bbcccccc 

参考;
- https://en.wikipedia.org/wiki/UTF-8


## 6. 各语言编码支持

- java char 表示一个 BMP 字符，扩展平面的字符转化为2个 UTF-16 代理对字符。 Character 是对char的封装, `Character.codePointAt(CharSequence, int)` 可以获得指定序列位置char的码位。 String的实现是一个 UTF-16 char 数组。
- go 和 D 语言内部使用utf8编码字符。go中另外用4byte的 rune(int32)一一对应unicode 码位字符。

参考: 
- https://unicodebook.readthedocs.io/
