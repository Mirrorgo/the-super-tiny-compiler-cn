
/**
 *  语法分析器接受 token 数组，然后把它转化为 AST
 *
 *   [{ type: 'paren', value: '(' }, ...]   =>   { type: 'Program', body: [...] }
 */

// 现在我们定义 parser 函数，接受 `tokens` 数组
function parser(tokens) {
  // 我们再次声明一个 `current` 变量作为指针。
  let current = 0;

  // 但是这次我们使用递归而不是 `while` 循环，所以我们定义一个 `walk` 函数。
  function walk() {
    // walk函数里，我们从当前token开始
    let token = tokens[current];

    // 对于不同类型的结点，对应的处理方法也不同，我们从 `number` 类型的 token 开始。
    // 检查是不是 `number` 类型
    if (token.type === "number") {
      // 如果是，`current` 自增。
      current++;

      // 然后我们会返回一个新的 AST 结点 `NumberLiteral`，并且把它的值设为 token 的值。
      return {
        type: "NumberLiteral",
        value: token.value,
      };
    }

    // 接下来我们检查是不是 CallExpressions 类型，我们从左圆括号开始。
    if (token.type === "paren" && token.value === "(") {
      // 我们会自增 `current` 来跳过这个括号，因为括号在 AST 中是不重要的。
      token = tokens[++current];

      // 我们创建一个类型为 `CallExpression` 的根节点，然后把它的 name 属性设置为当前
      // token 的值，因为紧跟在左圆括号后面的 token 一定是调用的函数的名字。
      let node = {
        type: "CallExpression",
        name: token.value,
        params: [],
      };

      // 我们再次自增 `current` 变量，跳过当前的 token
      token = tokens[++current];

      // 现在我们循环遍历接下来的每一个 token，直到我们遇到右圆括号，这些 token 将会
      // 是 `CallExpression` 的 `params`（参数）
      //
      // 这也是递归开始的地方，我们采用递归的方式来解决问题，而不是去尝试解析一个可能有无限
      // 层嵌套的结点。
      //
      // 为了更好地解释，我们来看看我们的 Lisp 代码。你会注意到 `add` 函数的参数有两个，
      // 一个是数字，另一个是一个嵌套的 `CallExpression`，这个 `CallExpression` 中
      // 包含了它自己的参数（两个数字）
      //
      //   (add 2 (subtract 4 2))
      //
      // 你也会注意到我们的 token 数组中有多个右圆括号。
      //
      //   [
      //     { type: 'paren',  value: '('        },
      //     { type: 'name',   value: 'add'      },
      //     { type: 'number', value: '2'        },
      //     { type: 'paren',  value: '('        },
      //     { type: 'name',   value: 'subtract' },
      //     { type: 'number', value: '4'        },
      //     { type: 'number', value: '2'        },
      //     { type: 'paren',  value: ')'        }, <<< 右圆括号
      //     { type: 'paren',  value: ')'        }  <<< 右圆括号
      //   ]
      //
      // 遇到嵌套的 `CallExpressions` 时，我们将会依赖嵌套的 `walk` 函数来
      // 增加 `current` 变量
      //
      // 所以我们创建一个 `while` 循环，直到遇到类型为 `'paren'`，值为右圆括号的 token。
      while (
        token.type !== "paren" ||
        (token.type === "paren" && token.value !== ")")
      ) {
        // 我们调用 `walk` 函数，它将会返回一个结点，然后我们把这个节点
        // 放入 `node.params` 中。
        node.params.push(walk());
        token = tokens[current];
      }

      // 我们最后一次增加 `current`，跳过右圆括号。
      current++;

      // 返回结点。
      return node;
    }

    // 同样，如果我们遇到了一个类型未知的结点，就抛出一个错误。
    throw new TypeError(token.type);
  }

  // 现在，我们创建 AST，根结点是一个类型为 `Program` 的结点。
  let ast = {
    type: "Program",
    body: [],
  };

  // 现在我们开始 `walk` 函数，把结点放入 `ast.body` 中。
  //
  // 之所以在一个循环中处理，是因为我们的程序可能在 `CallExpressions` 后面包含连续的两个
  // 参数，而不是嵌套的。
  //
  //   (add 2 2)
  //   (subtract 4 2)
  //
  while (current < tokens.length) {
    ast.body.push(walk());
  }

  // 最后我们的语法分析器返回 AST
  return ast;
}

/**
 * ============================================================================
 *                                 ⌒(❀>◞౪◟<❀)⌒
 *                                   遍历器!!!
 * ============================================================================
 */

/**
 * 现在我们有了 AST，我们需要一个 visitor 去遍历所有的结点。当遇到某个类型的结点时，我们
 * 需要调用 visitor 中对应类型的处理函数。
 *
 *   traverse(ast, {
 *     Program(node, parent) {
 *       // ...
 *     },
 *
 *     CallExpression(node, parent) {
 *       // ...
 *     },
 *
 *     NumberLiteral(node, parent) {
 *       // ...
 *     }
 *   });
 */

// 所以我们定义一个遍历器，它有两个参数，AST 和 vistor。在它的里面我们又定义了两个函数...
function traverser(ast, visitor) {
  // `traverseArray` 函数允许我们对数组中的每一个元素调用 `traverseNode` 函数。
  function traverseArray(array, parent) {
    array.forEach(function (child) {
      traverseNode(child, parent);
    });
  }

  // `traverseNode` 函数接受一个 `node` 和它的父结点 `parent` 作为参数，这个结点会被
  // 传入到 visitor 中相应的处理函数那里。
  function traverseNode(node, parent) {
    // 首先我们看看 visitor 中有没有对应 `type` 的处理函数。
    let method = visitor[node.type];

    // 如果有，那么我们把 `node` 和 `parent` 都传入其中。
    if (method) {
      method(node, parent);
    }

    // 下面我们对每一个不同类型的结点分开处理。
    switch (node.type) {
      // 我们从顶层的 `Program` 开始，Program 结点中有一个 body 属性，它是一个由若干
      // 个结点组成的数组，所以我们对这个数组调用 `traverseArray`。
      //
      // （记住 `traverseArray` 会调用 `traverseNode`，所以我们会递归地遍历这棵树。）
      case "Program":
        traverseArray(node.body, node);
        break;

      // 下面我们对 `CallExpressions` 做同样的事情，遍历它的 `params`。
      case "CallExpression":
        traverseArray(node.params, node);
        break;

      // 如果是 `NumberLiterals`，那么就没有任何子结点了，所以我们直接 break
      case "NumberLiteral":
        break;

      // 同样，如果我们不能识别当前的结点，那么就抛出一个错误。
      default:
        throw new TypeError(node.type);
    }
  }

  // 最后我们对 AST 调用 `traverseNode`，开始遍历。注意 AST 并没有父结点。
  traverseNode(ast, null);
}

/**
 * ============================================================================
 *                                   ⁽(◍˃̵͈̑ᴗ˂̵͈̑)⁽
 *                                   转换器!!!
 * ============================================================================
 */

/**
 * 下面是转换器。转换器接收我们在之前构建好的 AST，然后把它和 visitor 传递进入我们的遍历
 * 器中 ，最后得到一个新的 AST。
 *
 * ----------------------------------------------------------------------------
 *            原始的 AST               |               转换后的 AST
 * ----------------------------------------------------------------------------
 *   {                                |   {
 *     type: 'Program',               |     type: 'Program',
 *     body: [{                       |     body: [{
 *       type: 'CallExpression',      |       type: 'ExpressionStatement',
 *       name: 'add',                 |       expression: {
 *       params: [{                   |         type: 'CallExpression',
 *         type: 'NumberLiteral',     |         callee: {
 *         value: '2'                 |           type: 'Identifier',
 *       }, {                         |           name: 'add'
 *         type: 'CallExpression',    |         },
 *         name: 'subtract',          |         arguments: [{
 *         params: [{                 |           type: 'NumberLiteral',
 *           type: 'NumberLiteral',   |           value: '2'
 *           value: '4'               |         }, {
 *         }, {                       |           type: 'CallExpression',
 *           type: 'NumberLiteral',   |           callee: {
 *           value: '2'               |             type: 'Identifier',
 *         }]                         |             name: 'subtract'
 *       }]                           |           },
 *     }]                             |           arguments: [{
 *   }                                |             type: 'NumberLiteral',
 *                                    |             value: '4'
 * ---------------------------------- |           }, {
 *                                    |             type: 'NumberLiteral',
 *                                    |             value: '2'
 *                                    |           }]
 *         (那一边比较长/w\)           |         }]
 *                                    |       }
 *                                    |     }]
 *                                    |   }
 * ----------------------------------------------------------------------------
 */

// 定义我们的转换器函数，接收 AST 作为参数
function transformer(ast) {
  // 创建 `newAST`，它与我们之前的 AST 类似，有一个类型为 Program 的根节点。
  let newAst = {
    type: "Program",
    body: [],
  };

  // 下面的代码会有些奇技淫巧，我们在父结点上使用一个属性 `context`（上下文），这样我们就
  // 可以把结点放入他们父结点的 context 中。当然可能会有更好的做法，但是为了简单我们姑且
  // 这么做吧。
  //
  // 注意 context 是一个*引用*，从旧的 AST 到新的 AST。
  ast._context = newAst.body;

  // 我们把 AST 和 visitor 函数传入遍历器
  traverser(ast, {
    // 第一个 visitor 方法接收 `NumberLiterals`。
    NumberLiteral: function (node, parent) {
      // 我们创建一个新结点，名字叫 `NumberLiteral`，并把它放入父结点的 context 中。
      parent._context.push({
        type: "NumberLiteral",
        value: node.value,
      });
    },

    // 下一个，`CallExpressions`。
    CallExpression: function (node, parent) {
      // 我们创建一个 `CallExpression` 结点，里面有一个嵌套的 `Identifier`。
      let expression = {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: node.name,
        },
        arguments: [],
      };

      // 下面我们在原来的 `CallExpression` 结点上定义一个新的 context，它是 expression
      // 中 arguments 这个数组的引用，我们可以向其中放入参数。
      node._context = expression.arguments;

      // 然后来看看父结点是不是一个 `CallExpression`，如果不是...
      if (parent.type !== "CallExpression") {
        // 我们把 `CallExpression` 结点包在一个 `ExpressionStatement` 中，这么做是因为
        // 单独存在（原文为top level）的 `CallExpressions` 在 JavaScript 中也可以被当做
        // 是声明语句。
        //
        // 译者注：比如 `let a = foo()` 与 `foo()`，后者既可以当作表达式给某个变量赋值，也
        // 可以作为一个独立的语句存在。
        expression = {
          type: "ExpressionStatement",
          expression: expression,
        };
      }

      // 最后我们把 `CallExpression`（可能是被包起来的） 放入父结点的 context 中。
      parent._context.push(expression);
    },
  });

  // 最后返回创建好的新 AST。
  return newAst;
}

/**
 * ============================================================================
 *                               ヾ（〃＾∇＾）ﾉ♪
 *                                代码生成器!!!!
 * ============================================================================
 */

/**
 * 现在只剩最后一步啦：代码生成器。
 *
 * 我们的代码生成器会递归地调用它自己，把 AST 中的每个结点打印到一个很大的字符串中。
 */

function codeGenerator(node) {
  // 对于不同 `type` 的结点分开处理。
  switch (node.type) {
    // 如果是 `Program` 结点，那么我们会遍历它的 `body` 属性中的每一个结点，并且递归地
    // 对这些结点再次调用 codeGenerator，再把结果打印进入新的一行中。
    case "Program":
      return node.body.map(codeGenerator).join("\n");

    // 对于 `ExpressionStatements`,我们对它的 expression 属性递归调用，同时加入一个
    // 分号。
    case "ExpressionStatement":
      return (
        codeGenerator(node.expression) + ";" // << (...因为我们喜欢用*正确*的方式写代码)
      );

    // 对于 `CallExpressions`，我们会打印出 `callee`，接着是一个左圆括号，然后对
    // arguments 递归调用 codeGenerator，并且在它们之间加一个逗号，最后加上右圆括号。
    case "CallExpression":
      return (
        codeGenerator(node.callee) +
        "(" +
        node.arguments.map(codeGenerator).join(", ") +
        ")"
      );

    // 对于 `Identifiers` 我们只是返回 `node` 的 name。
    case "Identifier":
      return node.name;

    // 对于 `NumberLiterals` 我们只是返回 `node` 的 value
    case "NumberLiteral":
      return node.value;

    // 如果我们不能识别这个结点，那么抛出一个错误。
    default:
      throw new TypeError(node.type);
  }
}

/**
 * ============================================================================
 *                                  (۶* ‘ヮ’)۶”
 *                         !!!!!!!!!!!!编译器!!!!!!!!!!!
 * ============================================================================
 */

/**
 * 最后！我们创建 `compiler` 函数，它只是把上面说到的那些函数连接到一起。
 *
 *   1. input  => tokenizer   => tokens
 *   2. tokens => parser      => ast
 *   3. ast    => transformer => newAst
 *   4. newAst => generator   => output
 */

function compiler(input) {
  let tokens = tokenizer(input);
  let ast = parser(tokens);
  let newAst = transformer(ast);
  let output = codeGenerator(newAst);

  // 然后返回输出!
  return output;
}

/**
 * ============================================================================
 *                                   (๑˃̵ᴗ˂̵)و
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!你做到了!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * ============================================================================
 */

// 现在导出所有接口...
module.exports = {
  tokenizer: tokenizer,
  parser: parser,
  transformer: transformer,
  codeGenerator: codeGenerator,
  compiler: compiler,
};
