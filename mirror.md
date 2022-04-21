# 需求
从LISP风格变为C风格
具体如下

|  |LISP|C|
|---------|---------|---------|
|2+2 |(add 2 2)| add(2, 2) |
|4-2 |(subtract 4 2)|subtract(4, 2)|
|2+(4-2)|(add 2 (subtract 4 2))|add(2, subtract(4, 2))|

这个转换就是我们将要做的事情。虽然这并不包含 LISP 或者 C 的全部语法，但它足以向我们展示现代编译器很多要点

大多数编译器可以分成三个阶段：解析（Parsing），转换（Transformation）以及代码
生成（Code Generation）
1. **解析**是将最初原始的代码转换为AST
2. **转换**将对AST做一些处理，让它能做到编译器期望它做到的事情
3. **代码生成**接收处理之后的代码表示，然后把它转换成新的代码

解析一般来说会分成两个阶段：词法分析（Lexical Analysis）和语法分析（Syntactic Analysis）  
*词法分析*接收原始代码，然后把它分割成一些被称为 Token  
*语法分析* 接收之前生成的 Token，把它们转换成AST

 1. input  => tokenizer   => tokens
 2. tokens => parser      => ast
 3. ast    => transformer => newAst
 4. newAst => generator   => output

# 词法分析器（Tokenizer）

```js
const tokens = [
	{ type: "paren", value: "(" },
	{ type: "name", value: "add" },
	{ type: "number", value: "2" },
	{ type: "paren", value: "(" },
	{ type: "name", value: "subtract" },
	{ type: "number", value: "4" },
	{ type: "number", value: "2" },
	{ type: "paren", value: ")" },
	{ type: "paren", value: ")" },
  ];
```

> open paren 左圆括号  
> close paren 右圆括号

```js
function tokenizer(input) {
	let current = 0;
	let tokens = [];
	while (current < input.length) {
	  let char = input[current];
	  if (char === "(") {
		tokens.push({
		  type: "paren",
		  value: "(",
		});
		current++;
		continue;
	  }
	  if (char === ")") {
		tokens.push({
		  type: "paren",
		  value: ")",
		});
		current++;
		continue;
	  }
	  let WHITESPACE = /\s/;
	  if (WHITESPACE.test(char)) {
		current++;
		continue;
	  }
	  let NUMBERS = /[0-9]/;
	  if (NUMBERS.test(char)) {
		let value = "";
		while (NUMBERS.test(char)) {
		  value += char;
		  char = input[++current];
		}
		tokens.push({
		  type: "number",
		  value: value,
		});
		continue;
	  }
	  let LETTERS = /[a-z]/i;
	  if (LETTERS.test(char)) {
		let value = "";
		// 同样，我们用一个循环遍历所有的字母，把它们存入 value 中。
		while (LETTERS.test(char)) {
		  value += char;
		  char = input[++current]; //先加后取值
		}
		tokens.push({
		  type: "name",
		  value: value,
		});
  
		continue;
	  }
	  throw new TypeError("I dont know what this character is: " + char);
	}
	return tokens;
  }
```

# 语法分析器(Parser)
语法分析器接受 token 数组，然后把它转化为 AST

```js
const ast = [
	{
	  type: "CallExpression",
	  name: "add",
	  params: [
		{
		  type: "NumberLiteral",
		  value: "2",
		},
		{
		  type: "CallExpression",
		  name: "subtract",
		  params: [
			{
			  type: "NumberLiteral",
			  value: "4",
			},
			{
			  type: "NumberLiteral",
			  value: "2",
			},
		  ],
		},
	  ],
	},
  ];
```

TODO:非递归的方式实现walk
