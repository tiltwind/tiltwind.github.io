<!---
markmeta_author: wongoo
markmeta_date: 2021-01-03
markmeta_title: hessian 字符串编解码的三次重构
markmeta_categories: retrospect
markmeta_tags: hessian,golang,refactor,performance,unicode
-->

# hessian 字符串编解码的三次重构

字符串是 RPC 报文里出现频率最高的数据类型。在 [dubbo-go-hessian2](https://github.com/apache/dubbo-go-hessian2) 里，`string.go` 这个文件的性能几乎直接决定了整个协议库的性能。

从 2019 年 4 月我提交第一版实现，到 2021 年 1 月完成最后一次重构，这个文件被推倒重来了三次：第一版正确但慢，第二版拿到了性能、也带来了复杂度，第三版试图同时拿到两者。中间还夹着一次线上 issue 和一次代码回退。

最后那次重构，代码是在一个周日的下午写完的，前后不到六个小时；但为了想清楚那六个小时该写什么，我断断续续憋了一周，最后是在半夜快睡着的时候想通的。

这篇文章把这段过程完整记录下来，重点不在"最终代码长什么样"，而在**每一版为什么会变成那样，以及付出了什么代价**。

## 1. 问题本身：两套字符模型的阻抗失配

hessian2 协议规范对字符串的定义是这样的：

```
# UTF-8 encoded character string split into 64k chunks
::= x52 b1 b0 <utf8-data>   # non-final chunk
::= 'S' b1 b0 <utf8-data>   # string of length 0-65535
::= [x00-x1f] <utf8-data>   # string of length 0-31
::= [x30-x33] <utf8-data>   # string of length 0-1023
```

看上去是 UTF-8，但有一句要命的补充说明：

> The length is the number of **16-bit characters**, which may be different than the number of bytes. String chunks may not split surrogate pairs.

这句话是 hessian 的 Java 血统留下的痕迹。Java 的 `char` 是 16 位的 UCS-2 码元，`String.length()` 返回的是码元个数而不是字符个数。所以 hessian 报文里的 chunk 长度字段，数的是 **UTF-16 码元数**，而实际负载又是 UTF-8 字节流。

问题出在增补平面（Supplementary Plane）字符上，也就是码点 ≥ U+10000 的字符 —— emoji 是最常见的一类。这类字符在两套模型里的表现完全不同：

| 表示 | `🤣` (U+1F923) 的字节序列 | 长度计数 |
|------|---------------------------|----------|
| 标准 UTF-8 (golang) | `F0 9F A4 A3` | 4 字节 / 1 rune |
| hessian (Java 风格) | `ED A0 BE` + `ED B4 A3` | 6 字节 / **2 个 char** |

hessian 的做法是先把码点拆成 UTF-16 代理对（surrogate pair）`D83E DD23`，再把这两个代理码元**各自当成一个独立字符**做 UTF-8 编码，于是得到 3+3=6 个字节。这种编码在 Unicode 标准里叫 CESU-8，是明确不合法的 UTF-8。

所以 golang 侧的编解码器必须做两件事：

1. **编码时**：遇到 `r >= 0x10000` 的 rune，拆成代理对，分别编码成两个 3 字节序列，并且长度计数 +2 而不是 +1。
2. **解码时**：识别出落在 `0xD800~0xDBFF` 区间的"伪字符"，把它和后面紧跟的低位代理合并，还原成一个真正的 rune，再输出合法 UTF-8。

编码方向的实现是 `encodeUcs4Rune` / `encodeUcs2Rune` 这一对函数：

```go
// NOTE: The length of hessian string is the number of 16-bit characters,
// which may be different than the number of bytes.
// String chunks may not split surrogate pairs.
//
// While golang support ucs-4, a rune may exceed 16-bit, which need convert to ucs-2.
//
// ref:
// - https://en.wikipedia.org/wiki/UTF-16
// - https://en.wikipedia.org/wiki/UCS-4
// - http://www.unicode.org/glossary/#code_point
func encodeUcs4Rune(b []byte, r rune) (int, int) {
	if r >= 0x10000 && r <= 0x10FFFF {
		t := uint32(r) - 0x10000
		n := encodeUcs2Rune(b, t>>10+0xD800)       // 高位代理 0xD800~0xDBFF
		n += encodeUcs2Rune(b[n:], t&0x3FF+0xDC00) // 低位代理 0xDC00~0xDFFF
		return n, 2                                // 字节数 n，字符数 2
	}

	// in fact, a rune over 0x10FFFF can't be encoded by hessian, ignore it currently
	return utf8.EncodeRune(b, r), 1
}
```

`encodeUcs4Rune` 只管拆代理对，真正落笔写字节的是下面这层。注意它的入参是 `uint32` 而不是 `rune` —— 因为它写的是一个 16 位**码元**，而不是一个字符，代理码元本身并不是合法码点：

```go
func encodeUcs2Rune(b []byte, ch uint32) int {
	if ch < 0x80 {
		b[0] = byte(ch)
		return 1
	}

	if ch < 0x800 {
		b[0] = byte(0xc0 + ((ch >> 6) & 0x1f))
		b[1] = byte(0x80 + (ch & 0x3f))
		return 2
	}

	b[0] = byte(0xe0 + ((ch >> 12) & 0x0f))
	b[1] = byte(0x80 + ((ch >> 6) & 0x3f))
	b[2] = byte(0x80 + (ch & 0x3f))

	return 3
}
```

这里有两个细节值得留意：

- **`encodeUcs2Rune` 没有 4 字节分支。** 标准 UTF-8 编码器（`utf8.EncodeRune`）遇到 ≥ U+10000 会写 4 字节，而这个函数最多只写 3 字节 —— 因为它的入参保证是一个 16 位码元。代理码元落在 `0xD800~0xDFFF`，恒定走最后那条 3 字节分支，所以一个代理对写出来就是 3+3=6 字节。
- **`encodeUcs4Rune` 返回两个数：`(字节数, 字符数)`。** 字节数用来推进缓冲区，字符数用来累加 chunk 的长度字段，两者在代理对上会分叉（`return n, 2`：写了 6 个字节，但要算 2 个字符）。协议那条"长度数的是 16 位字符"的规定，就落实在这个 `2` 上。

编码方向能一直安稳，靠的是这套换算**只在一处**：拆代理对只在 `encodeUcs4Rune`，写字节只在 `encodeUcs2Rune`。而且编码是"我手里已经有完整的 rune"，想写几个字节就写几个字节，不存在写到一半发现数据不够的问题。

**麻烦全部集中在解码方向**。因为解码是流式的：你拿到一个字节，才知道这个字符占几个字节；拿到三个字节，才知道它是不是代理对的前一半；如果是，还得再往后读 3 个字节。而 chunk 边界、buffer 边界随时可能横插在这中间。

## 2. 第一版（2019）：rune 中转

最早的实现思路很直白 —— 既然逐字符解码，那就解出 `rune` 存到 `[]rune` 里，最后用 `string()` 转回去：

```go
runeData := make([]rune, charTotal)
runeIndex := 0

for {
	if charCount == charTotal {
		if last {
			return string(runeData[:runeIndex]), nil
		}
		// 读下一个 chunk 的 tag，扩容 runeData
		bs := make([]rune, charTotal)
		copy(bs, runeData)
		runeData = bs
		// ...
	}

	r, charLen, byteLen, err = decodeUcs4Rune(d.reader)
	runeData[runeIndex] = r
	runeIndex++
	charCount += charLen
	byteCount += byteLen
}
```

### 2.1 `decodeUcs4Rune`：整个第一版的支点

上面那个循环其实只是外壳，第一版真正的核心是 `decodeUcs4Rune` / `decodeUcs2Rune`，也就是第 1 节那对编码函数的镜像：

```go
func decodeUcs4Rune(r *bufio.Reader) (c rune, cLen, bLen int, err error) {
	c1, n1, err1 := decodeUcs2Rune(r)
	if err1 != nil {
		return c1, 0, n1, err1
	}

	// 高位代理：说明这是一个增补平面字符，还要再读一个低位代理
	if c1 >= 0xD800 && c1 <= 0xDBFF {
		c2, n2, err2 := decodeUcs2Rune(r)
		if err2 != nil {
			return c2, 0, n2, err2
		}

		c := (c1-0xD800)<<10 + (c2 - 0xDC00) + 0x10000
		return c, 2, n1 + n2, nil   // 1 个 rune，但消耗了 2 个 hessian char
	}

	return c1, 1, n1, nil
}
```

它下面还有一层，负责把 1/2/3 字节的 UTF-8 序列还原成一个 16 位码元：

```go
func decodeUcs2Rune(r *bufio.Reader) (rune, int, error) {
	ch, err := r.ReadByte()
	if err != nil {
		return utf8.RuneError, 1, err
	}

	if ch < 0x80 {
		return rune(ch), 1, nil
	}

	if (ch & 0xe0) == 0xc0 {
		ch1, err := r.ReadByte()
		if err != nil {
			return utf8.RuneError, 2, err
		}
		return rune(((uint32(ch) & 0x1f) << 6) + (uint32(ch1) & 0x3f)), 2, nil
	}

	if (ch & 0xf0) == 0xe0 {
		ch1, err := r.ReadByte()
		if err != nil {
			return utf8.RuneError, 2, err
		}
		ch2, err := r.ReadByte()
		if err != nil {
			return utf8.RuneError, 3, err
		}
		c := ((uint32(ch) & 0x0f) << 12) + ((uint32(ch1) & 0x3f) << 6) + (uint32(ch2) & 0x3f)
		return rune(c), 3, nil
	}

	return utf8.RuneError, 0, fmt.Errorf("bad utf-8 encoding at %x", ch)
}
```

这两个函数值得单独拎出来说，是因为它们把第 1 节里那套"两种字符模型的阻抗失配"**完整地关在了一个盒子里**：

- **`cLen` 和 `bLen` 分开返回**，正是 `encodeUcs4Rune` 那个 `(字节数, 字符数)` 双计数在解码侧的镜像。`cLen` 是 hessian 口径的字符数（用来跟 chunk 长度对账），`bLen` 是实际消耗的字节数（用来推进读取位置）。协议的怪异之处 —— 一个 rune 可能算 2 个 char —— 被压缩成 `return c, 2, n1+n2, nil` 这一行，调用方拿到两个数，各用各的，不需要知道代理对是什么。
- **代理对的判断只有一处**，就是 `c1 >= 0xD800 && c1 <= 0xDBFF` 这一行。整个解码路径上，关于"增补平面字符怎么还原"的知识，全仓库只存在于这个函数里。
- **边界问题不存在**。因为它面对的是 `*bufio.Reader` 这个无限流抽象，要几个字节就 `ReadByte()` 几次，没有"缓冲区末尾"这个概念 —— 缓冲区管理被 `bufio` 挡在了下面。

加上第 1 节那两个编码函数，四个函数两两配对，构成一张很干净的映射表：

| 层次 | 职责 | 编码 | 解码 |
|---|---|---|---|
| Ucs4 层 | 代理对的拆与合，不碰字节 | `encodeUcs4Rune(b, r) (bLen, cLen)` | `decodeUcs4Rune(r) (rune, cLen, bLen)` |
| Ucs2 层 | 1/2/3 字节的读与写，不知道代理对存在 | `encodeUcs2Rune(b, ch uint32) int` | `decodeUcs2Rune(r) (rune, bLen, err)` |

上下两层各司其职：Ucs4 层只处理代理对，一个字节都不碰；Ucs2 层只处理 1/2/3 字节的读写，完全不知道代理对的存在。读懂任意一个，另外三个几乎能背出来。

这版的优点，正是**逻辑和协议规范一一对应**，读代码不用动脑子。它也确实撑住了早期的生产使用，中途只修过两个 bug：`fix emoji encode error`（2019-09-17）和 `fix chunk string error`（2019-09-23）。

代价则是：`decodeUcs4Rune` 每次只吐一个字符，`decodeUcs2Rune` 逐字节 `ReadByte()`，而且它的返回类型 `rune` 直接决定了上层必须准备一个 `[]rune` 来接。**下面那三处性能硬伤，根子都在这个签名上。**

### 2.2 三处性能硬伤

**其一，`[]rune` 是 4 字节对齐的中间层。** 解一个 5 万字符的 ASCII 字符串，先分配 200KB 的 `[]rune`，再由 `string()` 走一遍 UTF-8 编码分配 50KB 的结果 —— 输入只有 50KB，中间却过手 250KB。这是纯粹的浪费，因为绝大多数情况下，hessian 传过来的字节流本身就已经是合法 UTF-8，一个字节都不用改。

**其二，逐字节 `ReadByte()`。** 每个字节一次函数调用，`bufio.Reader` 内部还要做一次边界判断。解 5 万字符就是 5 万次以上的调用开销。

**其三，多 chunk 时的 `make + copy` 扩容。** 每遇到一个新 chunk 就重新分配整个 rune 数组并全量拷贝，是 O(n²) 的行为。

## 3. 第二版（2020-05）：直接在字节缓冲区上原地解码

2020 年 5 月，zonghaishang 提交了 PR [#188](https://github.com/apache/dubbo-go-hessian2/pull/188)，commit 标题写得很直白：**"优化hessian解码string性能，提升54%"**。

优化的方向抓得非常准，核心是三条：

1. **绕开 `[]rune`**，直接在字节缓冲区上工作，输出即输入的原地（in-place）改写；
2. **批量读取**，用 `d.next(buf[offset:offset+chunkLen])` 一次抓一整段，替代逐字节 `ReadByte()`；
3. **零拷贝返回**，`*(*string)(unsafe.Pointer(&b))` 省掉最后那次 `string()` 拷贝。

这三条方向我到现在都认为是对的，`[]rune` 那个中间层确实该去掉，实测的性能提升也是实打实的。**后来的第三版把这三条一条不落地继承了下来** —— 可以说没有这一版，就不会有后面的事情。

需要说明的是，这三条一旦成立，第一版那套 `decodeUcs4Rune` 的抽象就用不上了：它的签名是"一次返回一个 rune"，而批量读取要的是"一次处理一整段字节"，两者在粒度上根本对不上。所以接下来发生的一切，都不是谁选择绕开了什么，而是**这个粒度落差必须在某个地方被消化掉**。

### 3.1 粒度落差带来的新问题：先读的字节数不等于要的字符数

采用批量读取以后，会撞上一个第一版根本不存在的问题。

chunk 头里写的是**字符数** `chunkLen`，但你要从 reader 里读的是**字节数**。这两个数只有在纯 ASCII 时才相等。如果串里有中文，读进来 `chunkLen` 个字节，实际只覆盖了 `chunkLen/3` 个字符 —— 缓冲区末尾必然会切在一个多字节字符的中间。

第二版的应对方式是：**读进来一段，边扫描边判断当前字符有没有被切断，切断了就当场从 reader 里补读缺的那 1~2 个字节**：

```go
for r, r1 := len-1, len-2; i < len; chunkLen-- {
	ch := bytesBuf[offset]
	if ch < 0x80 {
		i++
		offset++
	} else if (ch & 0xe0) == 0xc0 {
		i += 2
		offset += 2
	} else if (ch & 0xf0) == 0xe0 {
		// handle the 3-byte right edge
		// case:
		// 1. Expect 3 bytes, but the current byte is on the right
		// 2. Expect 3 bytes, but the current byte is second to last to the right
		if i == r {
			bytesBuf[i+1], err = d.reader.ReadByte()
			// ...
			bytesBuf[i+2], err = d.reader.ReadByte()
			// ...
			nread += 2
			len += 2
		} else if i == r1 {
			bytesBuf[i+2], err = d.reader.ReadByte()
			// ...
			nread++
			len++
		}
		// ... 接着判断是不是代理对，是的话还要往后再看 1~3 个字节
	}
}
```

`r` 和 `r1` 是"最右边"和"倒数第二个"的位置，`i == r` 和 `i == r1` 是在穷举"字符被切断"的两种情形。

这个模式一旦确立，复杂度就开始滚雪球。因为代理对本身还要往后再看一个字符，而那个字符**也可能**是 1、2 或 3 字节，**也可能**被缓冲区右边界切断。于是就出现了这样的嵌套：

```go
c1 := ((uint32(ch) & 0x0f) << 12) + ...
if c1 >= 0xD800 && c1 <= 0xDBFF {
	var (c2 rune; n2 int; err error; ch0 byte)
	if i+3 < len {          // 低位代理的首字节在缓冲区里
		ch0 = bytesBuf[i+3]
	} else {                // 不在，现读
		ch0, err = d.reader.ReadByte()
		nread++; len++
	}

	if ch0 < 0x80 {                    // 低位代理是 1 字节？
		c2, n2 = rune(ch0), 1
	} else if (ch0 & 0xe0) == 0xc0 {   // 2 字节？
		if i+4 < len { ... } else { ... 现读 ... }
	} else if (ch0 & 0xf0) == 0xe0 {   // 3 字节？
		if i+5 < len { ... } else { ... 现读两个 ... }
	}

	c := rune(c1-0xD800)<<10 + (c2 - 0xDC00) + 0x10000
	n3 := utf8.EncodeRune(bytesBuf[i:], c)
	if copied = n3 > 0 && n3 < 3+n2; copied {
		offset = i + n3
		copy(bytesBuf[offset:], bytesBuf[i+3+n2:len])
	}
	i += n2
	chunkLen--
}
```

3 种字节宽度 × 2 种边界状态，每一格都是一段手写的读字节 + 计数修正代码。

### 3.2 一个连带结果：`decodeUcs4Rune` 退出了主路径

把上面这段和第一版的 `decodeUcs4Rune` 摆在一起看，可以看清这套写法带来的一个结构性变化。

代理对的合并公式，在第一版里只有一处：

```go
c := (c1-0xD800)<<10 + (c2 - 0xDC00) + 0x10000
```

在第二版的 `decString` 里，这个公式出现了**两次**（快路径一次、慢路径一次），而"怎么凑齐低位代理的那几个字节"的逻辑，被摊成了前面那一堆 `if i+3 < len` / `if i+4 < len` / `if i+5 < len` 的分支。

`decodeUcs4Rune` 这个函数则还留在文件里，但已经没有调用者了：

```console
$ git checkout 607925d && grep -rn "decodeUcs4Rune" --include="*.go" .
string.go:91:func decodeUcs4Rune(r *bufio.Reader) (c rune, cLen, bLen int, err error) {
```

整个仓库只有定义、零调用。`decodeUcs2Rune` 还在慢路径上被调用了一次（`string.go:554`），快路径则把它的逻辑内联展开了。

这个结果是前面那个粒度落差的直接产物，不是选择的问题：`decodeUcs4Rune` 的签名是"给我一个 reader，还你一个 rune"，它天然假设自己可以随时向后再读几个字节；而批量读取的前提恰恰是"字节已经在缓冲区里了，可能还不够"。**两种假设无法共存**，所以那份换算逻辑必须换个地方安置。

第二版把它安置在了 `decString` 内部，按"字节落在缓冲区什么位置"展开。于是原本收敛在一个函数里的一份逻辑，变成了分散在十几个分支里的十几份 —— 每一份都要独立地回答同一组问题：现在读到第几个字节了？缓冲区还剩几个？不够要补几个？补完计数器怎么修正？

这里的困难在于，这十几份是否份份都对，**既不容易靠 review 看出来，也不容易靠有限的测试用例覆盖到**。它们表面上是十几段相似的代码，实际上每一段面对的上下文都略有不同。

至于那个零调用的 `decodeUcs4Rune`，它留在文件里带来一个次生的阅读问题：此后再打开这个文件，它仍然摆在显眼的位置，读者容易以为解码逻辑收敛在它里面，而真正生效的是 `decString` 里展开的那些分支。

### 3.3 这条路径上的复杂度

"边扫描边判断有没有被切断"这条路走下去，代码量会随着需要区分的情形数量一起增长。这一版的 `decString` 单个函数达到 **326 行**（第一版是 127 行），最深处五层嵌套，函数体里同时活跃着 `offset`、`i`、`r`、`r1`、`prev`、`nread`、`chunkLen`、`copied` 八个互相牵制的游标，每个分支都要手工维护其中几个。

这里想说明的不是"应该写得更好"，而是记录一下这种结构在后续维护中具体会遇到什么 —— 这些现象跟写法本身高度相关，换个人写也大体会是这个样子：

**变量遮蔽。** 循环里写了 `len := offset + nread`，把内建函数 `len` 遮蔽掉了，此后这段代码里再也不能用 `len(...)`。而 `len` 这个名字表示的又恰好是"缓冲区里有效数据的结束位置"，语义上它是 `end` 而不是长度。

**`err` 检查容易遗漏。** 上面那段代码里，有两处 `ReadByte()` 的返回值赋给了 `err` 但没有后续检查：

```go
bytesBuf[i+4], err = d.reader.ReadByte()
ch1 = bytesBuf[i+4]      // err 没判断，直接往下走
nread++
len++
```

```go
ch2, err = d.reader.ReadByte()
len += 2                 // err 同样没判断
nread += 2
```

这类遗漏跟嵌套密度直接相关：每层分支都要重复写一遍 `if err != nil { return s, perrors.WithStack(err) }`，样板代码的体量超过了主逻辑本身，少写一处在视觉上不容易分辨出来。

**循环的终止条件不易推理。** `chunkLen--` 散落在四五个不同的分支里，其中代理对那条路径要减两次（一个 rune 消耗 2 个 hessian char）。要判断"这个 chunk 到底读完没有"，需要把所有分支都过一遍。我当时 review 时试着推演过，没推明白 —— 这一条我得说清楚：**没推明白是我自己的情况，不代表写的人没推明白。**

**调整策略的成本较高。** 想改动读取方式，就要同步维护八个游标在十几个分支里的更新逻辑，而且中间没有可以单独做单元测试的层次。

我在 PR [#188](https://github.com/apache/dubbo-go-hessian2/pull/188) 的 review 里提过 4 字节 UTF-8 支持的疑问，后来 zonghaishang 提交了 PR #194 `support for decode emoji`（2020-05-25）补充了 emoji 解码的处理。当时我们都以为这一块就算过去了。

### 3.4 issue #252

2020 年 12 月 28 日，[issue #252](https://github.com/apache/dubbo-go-hessian2/issues/252) 报上来：

> decode fail when received string from server, and string contains emoji and chinese

复现串是 `"❄️🚫🚫🚫🚫 多次自我介绍、任务、动态和"`，Java 端 dubbo 2.7.7 返回，go 端报错：

```
bad utf-8 encoding
	string.go:481 (*Decoder).decString
```

这是**emoji 和中文混排**才会触发的组合。单独的 emoji 有测试用例覆盖，单独的中文也有，但两者混在一起、且恰好让某个多字节字符落在缓冲区边界上时，边界判断的组合里就有没覆盖到的格子。

这不是某一行写错了。3 种宽度 × 2 种边界 × 代理对的 3 种后继宽度 × 后继是否跨界 —— 这个状态空间的规模，已经超出了测试用例和 code review 能覆盖的范围。**在这种规模下漏掉一格，是概率问题，不是水平问题。**

这就是 3.2 里那十几份逻辑中被撞见的一份。剩下的里面还埋着几个，当时没人知道，也没有办法知道 —— 这才是最难受的地方。

## 4. 第三版（2021-01）：先退回正确，再重新提速

拿到 issue 以后，我花了点时间试图在原实现上定位那个漏掉的格子，很快放弃了 —— 就算这次修好了，下次换个字符组合还会再来一遍。**问题在结构，不在某一行。**

判断"要重写"很快，但真正想清楚**怎么重写**，花了差不多一周。

从 12 月 28 日 issue 报上来，到 1 月 3 日提交重构，这中间是元旦假期前后，白天有本职工作，只能断断续续地想。方向是明确的 —— 分层、消掉那八个游标 —— 但每次尝试落到纸面上，都会卡在同一处：**chunk 长度数的是字符数，而 reader 给的是字节数，这两个数对不上，缓冲区末尾必然切在多字节字符中间。** 第二版是靠穷举切断位置解决的，我知道沿着那个方向继续走会回到同样的状态空间里，可换一条路要怎么走，一直没想明白。

那几天脑子里一直挂着这件事。走路想，吃饭想，睡前躺着还在想。有天半夜迷迷糊糊快睡着的时候，突然觉得思路通了 —— **不用去判断"有没有被切断"，因为根本不需要提前知道。先按最乐观的假设读一段进去，扫完看解出了几个字符，差多少再补多少就是了。** 缺口是自己会暴露出来的，不需要预判。

醒来后赶紧把方案在纸上梳理了一遍，这一梳理才发现，那个"补差"的循环一旦立住，后面几件事是连锁塌下来的：既然按字符数循环，`chunkLen--` 那些散落各处的减法就没必要存在了；既然不用预判切断位置，`r` / `r1` / `prev` / `copied` 这些游标也全都不需要了；再顺着推，代理对在 hessian 里恒定占 6 字节，那么按低位代理宽度分情况讨论的那几个分支也就不需要了。八个游标最后只剩下 `start`、`end`、`charCount` 三个。

方案清楚之后，写代码反而是最快的部分。1 月 3 日是个周日，上午 11 点多先把老算法回退掉，下午 5 点重构就提交了，中间不到六个小时。

这里要补一句公道话。**"乐观读 + 补差"这个解法，一点都不显然。** 我是带着一个已经暴露出来的线上 issue、明确知道"穷举边界"这条路的尽头长什么样、又断断续续想了一周，才在半夜偶然撞上它的。2020 年 5 月做第二版时，手上没有这些信息：批量读取是当时唯一确定要做的事，而"边扫边补"是面对粒度落差时最直觉、也最容易验证的应对方式 —— 它在 ASCII 和纯中文上都跑得通，测试也是绿的。

**换我在 2020 年 5 月的位置上，大概率也会写成那个样子。** 后面这些分析之所以能成立，很大程度上是因为站在 issue #252 之后往回看 —— 这是事后视角带来的便利，不是当时能力上的差距。

这种体验这些年遇到过好几次了。难题卡住的时候，硬坐在电脑前逐行改代码往往是最低效的 —— 眼睛盯着现有代码，思路就会顺着它已有的结构走，只想得出补丁，想不出重写。反倒是合上电脑，让问题在脑子里挂几天，某个时刻它自己会松动。**真正费时间的是想清楚，写出来从来不是瓶颈。**

回到正题，重构分成两步走。

### 4.1 第一步：回退（commit `33721e1`）

`recover string decode algorithm to support emoji codec`，把解码算法整个换回 2019 年的 rune 版本，`string.go` 净删 235 行。

具体做的事情，其实就是**把 `decodeUcs4Rune` 重新接回主路径** —— 那个函数一直躺在文件里，只是没人调用，回退所需的不过是让 `decString` 重新走它。事后 diff 过，回退后的 `decString` 和 2019 年那版只差 16 行，全是 `int32` 改 `int`、`d.readByte` 改 `d.ReadByte` 这类无关痛痒的调整。

一个躺了半年的死函数能这样直接复活，本身就说明第二版从来没有真正证明过旧抽象是错的 —— 它只是被绕过去了。

慢，但是对的。同时在 `test_hessian` 里补上 Java 侧的交叉验证用例：

```go
func TestStringEmoji2(t *testing.T) {
	// see https://github.com/apache/dubbo-go-hessian2/issues/252
	s0 := "❄️🚫🚫🚫🚫 多次自我介绍、任务、动态和"
	testDecodeFramework(t, "customReplyStringEmoji2", s0)
	testJavaDecode(t, "customArgString_emoji2", s0)
}
```

`testDecodeFramework` 解 Java 编码的报文，`testJavaDecode` 让 Java 解 go 编码的报文，双向都验。**先把红线拉起来，再动性能**，否则重构过程中根本不知道自己有没有把事情变得更糟。

### 4.2 第二步：重构（commit `f567f91`）

同一天下午 17:02 提交，`refactor string decode algorithm`。第二版那三条优化思路一条不落地保留下来，但换一个结构去承载。

**拆成三层，每层只回答一个问题。**

```
decString(flag)              -- 协议层：tag 分发、多 chunk 拼接
  └─ readStringChunkData(tag) -- chunk 层：把一个 chunk 完整读成 UTF-8 缓冲
       └─ decode2utf8(...)    -- 编码层：纯字节缓冲上的 UCS-2 → UTF-8 转换
```

第二版把这三件事全塞进一个函数，所以游标才会互相纠缠。拆开之后，每一层的输入输出都能单独讲清楚，也能单独测。重构后 `decString` 从 326 行降到 99 行，另外两个函数分别是 24 行和 60 行。

这里最要紧的一步，是**给 `decodeUcs4Rune` 原来承担的职责，重新找一个落脚点**。

`decode2utf8` 就是它的继任者 —— 承担同一个职责（两套字符模型的换算，代理对的合并公式全仓库只此一份），只是把工作粒度从"一个字符"提到了"一整段缓冲区"：

| | `decodeUcs4Rune`（v1） | `decode2utf8`（v3） |
|---|---|---|
| 输入 | `*bufio.Reader` | `(r, data []byte, start, end int)` |
| 输出 | `(rune, cLen, bLen, err)` | `(start, end, charCount, err)` |
| 一次处理 | 1 个字符 | 一整段缓冲区 |
| 代理对判断 | 1 处 | 1 处 |
| 结果写到哪 | 返回给调用方存进 `[]rune` | 原地改写 `data` |

`cLen` / `bLen` 那个题眼被完整继承了下来：`charCount` 就是当年的 `cLen`（hessian 口径，用来跟 chunk 长度对账），`start`/`end` 的位移就是当年的 `bLen`（字节口径，用来推进缓冲区）。**两套计数必须分开**这个认识没变，变的只是它从"逐字符返回"改成了"整段累计"。

职责有了新的落脚点之后，`f567f91` 里 `decodeUcs4Rune` 和 `decodeUcs2Rune` 就可以**干净删除**，一行不留 —— 它们的活已经有人接了。

这和第二版的区别，说到底是那份职责的**份数**：这里是从一处搬到另一处，仍然是一份；第二版是从一处展开到调用方的各个分支，变成了十几份。**换粒度的时候，与其让旧抽象留在原地失去调用者，不如按新粒度另起一个抽象把它的活接过来。**

**关键洞察一：缓冲区大小有精确上界，永不扩容。**

```go
data := make([]byte, charTotal*3)
```

因为 chunk 长度数的是 16 位码元，而**任何一个 16 位码元编码成 UTF-8 都不超过 3 字节**，所以 `charTotal*3` 是死上界。代理对是 2 个码元占 6 字节输入，合并后输出 4 字节 UTF-8 —— 只会变短，不会变长。

值得一提的是，这条不变量并不是重构时才发现的新东西 —— 回头看 2019 年那个 `encodeUcs2Rune`，它压根就**没有 4 字节分支**，最多只写 3 字节。也就是说"16 位码元 UTF-8 不超过 3 字节""代理对恒定 6 字节"这两件事，早就明明白白写在编码侧的代码里了，一直摆在那儿。

只是此前一直把它当成"编码时怎么写字节"的实现细节，没想到可以**反过来当作解码侧的容量保证**用。有用的事实往往早就在代码里，缺的是把它挪到另一侧去看的那个视角。

这条推论直接消灭了两件事：扩容逻辑，以及第二个输出缓冲区。整个转换可以**原地进行**，代理对合并后把后面的数据往前挪就行：

```go
n := utf8.EncodeRune(data[start:], rune(c))   // 6 字节位置写入 4 字节
copy(data[start+n:], data[start+6:end])       // 后面的数据前移 2 字节
start, end = start+n, end-6+n
```

**关键洞察二：用"乐观读 + 补差"替代边界情形穷举。**

这是第三版和第二版最本质的差别。第二版的做法是"扫描时判断有没有被切断，切断了就补"，所以必须穷举切断的位置；第三版换成"先按最乐观的假设读，扫完看差多少字符，差多少补多少"：

```go
for charCount < charTotal {
	// 乐观假设：1 字符 = 1 字节，把还差的字符数当字节数读进来
	_, err = io.ReadFull(d.reader, data[end:end+charTotal-charCount])
	if err != nil {
		return nil, err
	}
	end += charTotal - charCount

	// 原地转换，返回实际解出了几个字符
	start, end, charRead, err = decode2utf8(d.reader, data, start, end)
	if err != nil {
		return nil, err
	}
	charCount += charRead
}
```

循环不变式只有一句：**`charCount` 是已确认解出的字符数，循环到它等于 `charTotal` 为止**。没有八个游标要同步，没有分支要穷举，`chunkLen--` 那种散落在各处的减法也消失了。

而且这个策略是**均摊最优**的：纯 ASCII 时第一轮就读满，一次 `ReadFull` 搞定，零补读；纯中文时第一轮读到 1/3，第二轮补到 8/9，两三轮就收敛。它天然地对最常见的场景做了优化，却没有为此写任何 special case。

**关键洞察三：边界补齐就地处理，不上升为控制流。**

`decode2utf8` 里仍然要处理"字符被缓冲区末尾切断"，但处理方式完全变了 —— 不再穷举位置，而是"用到哪个字节，发现没有就补一个"：

```go
for start < end {
	ch := data[start]
	if ch < 0x80 {            // 1 字节，直接过
		start++; charCount++
		continue
	}

	if start+1 == end {       // 要用第 2 个字节，但缓冲区到头了 → 补一个
		data[end], err = r.ReadByte()
		if err != nil { return start, end, 0, err }
		end++
	}

	if (ch & 0xe0) == 0xc0 {  // 2 字节
		start += 2; charCount++
		continue
	}

	if start+2 == end {       // 要用第 3 个字节 → 再补一个
		data[end], err = r.ReadByte()
		if err != nil { return start, end, 0, err }
		end++
	}

	if (ch & 0xf0) == 0xe0 {
		c1 := ((uint32(ch)&0x0f)<<12) + ((uint32(data[start+1])&0x3f)<<6) + (uint32(data[start+2])&0x3f)

		if c1 >= 0xD800 && c1 <= 0xDBFF {   // 高位代理，要凑够 6 字节
			if start+6 >= end {
				_, err = io.ReadFull(r, data[end:start+6])
				if err != nil { return start, end, 0, err }
				end = start + 6
			}
			c2 := ((uint32(data[start+3])&0x0f)<<12) + ((uint32(data[start+4])&0x3f)<<6) + (uint32(data[start+5])&0x3f)
			c := (c1-0xD800)<<10 + (c2 - 0xDC00) + 0x10000

			n := utf8.EncodeRune(data[start:], rune(c))
			copy(data[start+n:], data[start+6:end])
			start, end = start+n, end-6+n
			charCount += 2                   // 一个 rune，但吃掉 2 个 hessian char
			continue
		}

		start += 3; charCount++
		continue
	}

	return start, end, 0, fmt.Errorf("bad utf-8 encoding at %x", ch)
}
```

注意 `if start+1 == end` 和 `if start+2 == end` 的位置：它们**紧贴在第一个要用到该字节的语句之前**。读代码的人不需要跳到 200 行外去理解一个 `r1` 变量是什么意思，补齐动作就在它被需要的地方。

代理对的处理更明显 —— 第二版要穷举低位代理是 1/2/3 字节、跨界还是不跨界共 6 种情况，第三版一句话解决：**代理对在 hessian 里恒定占 6 字节，凑够 6 个字节再说**。

```go
if start+6 >= end {
	_, err = io.ReadFull(r, data[end:start+6])
	end = start + 6
}
```

因为高位代理落在 `0xD800~0xDBFF`，低位代理落在 `0xDC00~0xDFFF`，两者都在 `0x800~0xFFFF` 区间内，UTF-8 编码后**必然都是 3 字节**。回头看，第二版里对 `ch0 < 0x80` 和 `(ch0 & 0xe0) == 0xc0` 的那两个分支其实永远走不到 —— 它们贡献了那段代码里相当一部分的分支数和状态组合。

这一点也说明了不变量的价值：**"低位代理可能是 1/2/3 字节"是一个看起来必须防御、实际上不成立的假设。** 在没有把它显式想清楚之前，把三种宽度都处理一遍是很自然的选择 —— 毕竟漏掉一种就是 bug。只有先确认了"恒定 3 字节"，才敢把另外两条分支删掉。

**关键洞察四：单 chunk 走零拷贝快路径。**

绝大多数字符串短于 `CHUNK_SIZE`（4096），单 chunk 就结束了，直接 `unsafe` 转字符串，一次分配都不多：

```go
if tag != BC_STRING_CHUNK {
	data, err := d.readStringChunkData(tag)
	if err != nil {
		return "", err
	}
	return *(*string)(unsafe.Pointer(&data)), nil
}
```

只有真的跨 chunk 时才走慢路径，用 `[][]byte` 收集各 chunk，最后一次性 make 出总长度再拼接 —— 一次分配，一轮拷贝，不再有第一版那种 O(n²) 的反复扩容。

### 4.3 错误处理

分层还带来一个不那么显眼但很实际的好处：`decode2utf8` 里每个 `ReadByte()` 后面都跟着 `if err != nil { return start, end, 0, err }`，而且**一眼能数清楚一共有几处**（三处）。这不是因为写的时候更细心，而是因为嵌套拉平之后，"有没有漏"变成了一个可以直接看出来的问题 —— 前一版有十几个分支各自需要处理 `err` 时，同样的检查就没这么容易做。

## 5. 性能对比

在同一台机器、同一 Go 版本下，对三个历史版本跑同一组基准测试。字符串统一重复到约 5 万个字符（跨 13 个 chunk，`CHUNK_SIZE = 4096`），每轮 50 次迭代：

| 场景 | v1 rune 中转 (2019) | v2 原地解码 (2020-05) | v3 分层重构 (2021-01) |
|------|--------------------|----------------------|----------------------|
| 纯 ASCII | 2186775 ns/op<br>14.3 MB/op | 237021 ns/op<br>1.09 MB/op | **189556 ns/op**<br>**0.68 MB/op** |
| 纯中文 | 519258 ns/op<br>1.66 MB/op | 187687 ns/op<br>0.91 MB/op | **146987 ns/op**<br>**0.33 MB/op** |
| emoji + 中文混排 | 1112111 ns/op<br>5.18 MB/op | **解码失败**<br>`bad utf-8 encoding` | **501921 ns/op**<br>**0.55 MB/op** |

以 v1 为基准的相对提升：

| 场景 | v2 相对 v1 | v3 相对 v1 | v3 相对 v2 |
|------|-----------|-----------|-----------|
| 纯 ASCII | 9.2× | **11.5×** | 快 25%，内存少 37% |
| 纯中文 | 2.8× | **3.5×** | 快 28%，内存少 64% |
| emoji + 中文 | — (失败) | **2.2×** | — |

几点说明：

- **v2 在 emoji + 中文场景未能完成解码**，这一格跑出来是 `FAIL` 而不是一个耗时数字，正是 issue #252 的复现。需要说明的是，这个场景本身就是那次 issue 之后才被补进测试用例的 —— 在 2020 年 5 月，它不在任何人的测试集里。
- **v3 比 v2 还快 25~28%**，这一点当初重构时其实没敢指望，属于结构理顺之后的附带收益。原因主要在缓冲区：v2 按 `chunkLen<<2` 分配（每字符 4 字节），跨 chunk 时还要 `make` 新数组全量 `copy`；v3 按 `charTotal*3` 精确分配，永不扩容，单 chunk 直接零拷贝返回。这个差别的前提是"16 位码元最多 3 字节"这条不变量 —— 没有它，`<<2` 是当时最稳妥的选择。
- v3 的 allocs 次数在 ASCII 场景反而比 v2 多（53 vs 16），因为每个 chunk 独立分配。但**总分配字节数少 37%**，GC 压力更小 —— 分配次数不等于分配压力。
- 上面的字符串故意做到了 5 万字符跨 13 个 chunk，目的是把多 chunk 路径压出来。真实业务里绝大多数字符串是单 chunk 的，v3 走的是零拷贝快路径，差距只会更大。

代码规模上：

| | `decString` 行数 | 最深嵌套 | 活跃游标变量 |
|---|---|---|---|
| v1 (2019) | 127 | 3 层 | 5 个 |
| v2 (2020-05) | 326 | 5 层 | 8 个 |
| v3 (2021-01) | 99 + 24 + 60（三个函数） | 3 层 | 3 个（`start`/`end`/`charCount`） |

## 6. 复盘

开始之前先把话说在前面：**下面这些结论，全部是站在三个版本都已经写完、issue 也已经暴露之后总结出来的。**

三个版本各自面对的信息条件完全不同 —— 2019 年写第一版时，性能还不是主要矛盾；2020 年做第二版时，手上只有"性能要提上去"这一个明确目标，emoji 与中文混排的失败用例当时并不存在；2021 年做第三版时，issue 已经摆在那里，第二版把"边界穷举"这条路的尽头也走出来给我看了，而我还额外花了一周才想到另一条路。

后一版比前一版看得更清楚，主要来自这些额外的信息，而不是能力上的高下。**这几条经验的适用对象是"下一次遇到类似情形的我们"，不是当年任何一次具体的提交。**

### 6.1 性能达标之后，值得再问一次复杂度能不能降下来

v2 拿到了 9 倍的提速，方向完全正确，三条优化思路 v3 一条都没丢。它同时也把函数从 127 行带到了 326 行、五层嵌套，状态空间大到难以完整推理。issue #252 不是运气不好，是这个规模下的概率事件。

这里想留下的经验是：**性能指标达标，往往并不意味着这一版就是终点。** 拿到提速之后，如果代码同时变得难以推理，值得再花点时间问一句"同样的性能，有没有更简单的写法"——因为通常是有的。v3 比 v2 更快，复杂度却只有它的三分之一，就是一个现成的例子。

只是这个"再问一句"在当时很难有动力去做：性能目标已经达到，测试也是绿的，没有任何信号提示还需要继续。**大多数时候，推动你回头再看一眼的，是几个月后的那个 issue。**

### 6.2 换粒度的时候，要给旧职责找一个新的落脚点

这是整件事里我认为最值得记下来的一条。

同一份"两套字符模型换算"的逻辑，在三个版本里落在了不同的地方：

| 版本 | 那份换算逻辑放在哪 | 份数 | 结果 |
|---|---|---|---|
| v1 | `decodeUcs4Rune`（一次一个字符） | 1 | 正确但慢 |
| v2 | 展开在 `decString` 的各个分支里 | 十几 | 快，但状态空间过大 |
| v3 | `decode2utf8`（一次一段缓冲区） | 1 | 更快，且正确 |

真正起作用的变量是**份数**，而不是用没用字节缓冲、函数写了多少行。

一份逻辑只要收敛在一处，它就会被所有测试用例反复走到，时间一长自然就磨对了；一旦按情形展开成十几份，每一份都要独立地正确，而它们各自被覆盖到的概率都远低于原来那一份。这不是谁写得不够仔细的问题 —— 十几份逻辑各自正确，本身就是一件很难验证的事。

这里的因果链条其实很朴素：**性能要求改变了处理粒度**（一次一个字符 → 一次一段缓冲区），**粒度改变让原有抽象不再适配**（`decodeUcs4Rune` 假设自己能随时向后读，批量读取假设数据已经在缓冲区里），于是那份职责必须搬家。搬到哪里去，就成了整件事的分水岭：

- 搬进调用方按情形展开 —— 份数从 1 变成十几；
- **另起一个同粒度的新抽象来接管** —— 份数仍然是 1。

v3 走的是后一条：既然一次一个字符太慢，那就按"一次一段缓冲区"重新立一个 `decode2utf8`，让它继续独占那份知识，再把旧的删掉。抽象换了形状，`charCount` 还是当年的 `cLen`，代理对判断仍然只有一处。

由此可以得到一个挺实用的检查项：**换了处理粒度之后，回头确认一下原来那份职责如今有几个副本。** 如果老函数还留在文件里却零调用，通常就是职责已经搬走的信号，值得顺着看一眼它搬到哪去了、是不是散开了。

编码方向是这条观察最好的对照组。`encodeUcs4Rune` / `encodeUcs2Rune` 从 2019 年写完至今**一行没动过**，三次重构全在解码侧，编码侧始终没动，也没出过 emoji 相关的 bug。原因不是编码的逻辑更简单（拆代理对和合代理对的复杂度是一样的），而是**编码侧的处理粒度从来没有变过** —— 手里已经有完整的 rune，想写几个字节写几个字节，没有"数据可能不够"这回事，也就没有出现过要求它换粒度的压力。

换句话说，解码侧这三版的折腾，根源不在实现水平，而在于**它是唯一同时受到"流式读取"和"性能要求"两头挤压的地方**。

### 6.3 遇到结构性问题，先回退到正确

拿到 issue #252 时最大的诱惑，是直接在 v2 上找那个漏掉的边界格子打补丁。我没这么做，而是先整个回退到 2019 年那个慢但正确的版本（`33721e1`），补齐跨语言测试用例，然后才重新做优化（`f567f91`）。

代价是中间有几个小时的性能倒退，收益是：

- **红线先立起来**。回退后测试全绿，之后任何一次改动导致的失败都能明确归因。
- **思路不被现有框架牵引**。如果在 v2 的结构里改，注意力会一直落在那八个游标怎么对齐上，很难跳出来想到"乐观读 + 补差"这种完全不同的策略。

对底层协议库来说，**正确性没有商量余地**，性能可以晚几个小时再回来。

### 6.4 找到对的不变量，复杂度会自己塌缩

v3 真正做对的事情只有一件：找到了几条能消灭一整类分支的不变量。

- *"任何 16 位码元的 UTF-8 编码不超过 3 字节"* → 消灭了扩容逻辑和第二块缓冲区，让原地转换成为可能；
- *"代理对在 hessian 里恒定占 6 字节"* → 去掉了按低位代理宽度分情况的 6 个分支（其中 2 个实际上永远走不到）；
- *"`charCount` 单调递增到 `charTotal`"* → 去掉了散落在各分支里的 `chunkLen--`，把终止条件收敛成一句话。

这些不变量都不难推导，都写在协议规范里。但要看见它们，前提是**先把问题分层**。v2 把协议解析、chunk 管理、编码转换放在同一个函数里，在那个视野下，`c1 >= 0xD800` 后面自然跟着的是"接下来可能读到什么字节"，而不是"接下来恒定要读 6 个字节"——同一个事实，换个抽象层次就从难题变成了废话。这个差别来自站的位置，不来自谁更聪明。

而且这三条不是并列发现的，是**第一块骨牌推倒了后面两块**：先想通"乐观读 + 补差"，才有了以字符数为准的循环；有了那个循环，`charTotal*3` 的上界和代理对恒定 6 字节才变得显而易见 —— 在此之前它们同样成立，只是没有落脚点，看不见。所以那一周的卡壳并不是在找三个不变量，而是在找**第一块骨牌**。这也是为什么它憋了几天却在一个晚上冒出来：这类东西不是逐步推导出来的，是某一刻换了个角度突然看见的。

对应到日常工作，这意味着**排期的时候要给"想不出来"留出时间**。一次结构性重写，真实成本大头在前面那段看不见产出的酝酿期，而不是最后敲代码的几个小时。把排期只按后者估，结果通常就是交出一个补丁。

### 6.5 跨语言双向测试是刚需

hessian 的意义在于跨语言互通，所以只测 go 编码 → go 解码是自欺欺人 —— 那只能验证自己跟自己一致，验证不了跟 Java 一致。而 hessian 那套 UCS-2 长度计数的规则，恰恰是从 Java 语言特性里长出来的，最容易出偏差的地方就在这里。

`testDecodeFramework`（Java 编码 → go 解码）和 `testJavaDecode`（go 编码 → Java 解码）双向都要跑。issue #252 的复现串在被修好的当天就固化成了用例，往后每次改动都会重跑。这类由真实 bug 沉淀下来的用例，比任何人工构造的用例都值钱 —— 它标记的是"人的直觉会出错的地方"。

### 6.6 命名困难，通常是抽象层次的信号

`len := offset + nread` 这行本身不是主要问题 —— 它遮蔽内建 `len`，导致这段代码里再也不能调用 `len(...)`，而这个变量表示的其实是"缓冲区有效数据的结束位置"，语义上是 `end` 而不是长度。

更值得注意的是它作为信号的一面：当一个函数里出现 `len`、`r`、`r1`、`prev` 这一类难以命名、只能用位置或缩写指代的变量时，往往说明这些变量并不对应任何一个能独立说清楚的概念，而是某个更大状态的碎片。**命名困难通常是抽象层次不对的症状，而不是原因** —— 靠改名字解决不了，得把抽象重新切一遍。

v3 里三个游标叫 `start`、`end`、`charCount`，名字直接对应循环不变式。名字好起，是因为抽象拆对了。

## 7. 参考

- [dubbo-go-hessian2 - string.go](https://github.com/apache/dubbo-go-hessian2/blob/master/string.go)
- [PR #188 - 优化hessian解码string性能，提升54%](https://github.com/apache/dubbo-go-hessian2/pull/188)
- [Issue #252 - decode fail when received string from server, and string contains emoji and chinese](https://github.com/apache/dubbo-go-hessian2/issues/252)
- [PR #254 - fix emoji（回退 + 重构）](https://github.com/apache/dubbo-go-hessian2/pull/254)
- [Hessian 2.0 Serialization Protocol - String](http://hessian.caucho.com/doc/hessian-serialization.html#anchor31)
- [UTF-16 - Wikipedia](https://en.wikipedia.org/wiki/UTF-16)
- [CESU-8 - Unicode Technical Report #26](https://www.unicode.org/reports/tr26/)
- [Java `String.length()` 与 code point 的区别](https://docs.oracle.com/javase/8/docs/api/java/lang/String.html#length--)
