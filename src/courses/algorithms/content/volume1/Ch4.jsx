import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import { BinaryTreeView } from '@/courses/algorithms/illustrations/StructureFigures.jsx'
import TreePlayer from '@/courses/algorithms/illustrations/TreeFigure.jsx'

const code = `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

# 在 BST 里查找：每比较一次就排除一半子树
def search(root, target):
    cur = root
    while cur:
        if target == cur.val:
            return cur
        cur = cur.left if target < cur.val else cur.right
    return None`

export default function Ch4() {
  return (
    <>
      <Lead>
        <p>
          数组和链表都是「一条线」。但现实里很多关系是<em>分叉</em>的：一个文件夹下有多个子文件夹，
          一个家族有多个后代。<strong>树</strong>就是描述这种层级关系的结构——它有一个<em>根</em>，
          每个节点可以有若干<em>孩子</em>，没有孩子的叫<em>叶子</em>。每个节点最多两个孩子的树，就是<strong>二叉树</strong>。
        </p>
      </Lead>

      <h2>几个绕不开的名词</h2>
      <ul>
        <li><strong>根（root）</strong>：最顶端、没有父亲的节点。</li>
        <li><strong>叶子（leaf）</strong>：没有孩子的节点，挂在最外圈。</li>
        <li><strong>深度 / 高度</strong>：从根到某节点经过的边数是深度；树的高度是最深叶子的深度。高度直接决定操作快慢。</li>
        <li><strong>子树</strong>：任意节点连同它下面的所有后代，自身又是一棵小树——这种「自相似」让递归成为处理树的天然手段。</li>
      </ul>

      <h2>二叉搜索树：给二叉树立一条规矩</h2>
      <p>
        普通二叉树只是结构。如果我们额外规定：<strong>任意节点的左子树全都比它小、右子树全都比它大</strong>，
        它就升级成了<em>二叉搜索树（BST）</em>。这条「左小右大」的规矩看似简单，却让查找变成了「猜数字」游戏：
        要找的数比当前节点小就往左、大就往右，<strong>每比较一次就排除掉一半的节点</strong>。
      </p>

      <BinaryTreeView />

      <CodeBlock lang="python" title="bst_search.py" code={code} />

      <Callout variant="note" title="O(log n) 的前提是「平衡」">
        <p>
          「每次排除一半」要成立，树得长得均匀。如果你按 1、2、3、4、5 的<strong>有序</strong>顺序依次插入 BST，
          它会退化成一条只往右伸的链——查找又变回 O(n)。所以工程里用的是<em>自平衡</em>的变种：
          <strong>红黑树</strong>（Java 的 <code>TreeMap</code>、C++ 的 <code>map</code>）、<strong>AVL 树</strong>，
          它们在插入删除时自动旋转、把高度始终压在 O(log n)。
        </p>
      </Callout>

      <h2>一个漂亮的性质：中序遍历得到升序</h2>
      <p>
        BST 的「左小右大」还藏着一个优雅的结论：如果按<strong>左子树 → 根 → 右子树</strong>的顺序（即<em>中序遍历</em>）走一遍，
        输出正好是<strong>从小到大</strong>的有序序列。下面这棵树（节点 1～7 当作值）按下播放，盯住每个节点上的访问序号，
        你会看到它严格按 1、2、3…… 的升序被访问。遍历的细节是第三卷的主题，这里先直观感受一下。
      </p>

      <TreePlayer order="inorder" caption="中序遍历(左→根→右)：在二叉搜索树上，输出恰好是升序。橙=当前节点，绿=已访问，角标=访问次序。" />

      <Example title="树无处不在">
        <p>
          文件系统的目录、HTML/XML 的 DOM、编译器解析代码得到的语法树（AST）、数据库索引的 B+ 树、
          游戏 AI 的决策树、堆排序用的二叉堆——全是树。掌握树，等于拿到了理解这些系统的通用钥匙。
        </p>
      </Example>

      <KeyIdea title="二叉搜索树一句话">
        <p>
          二叉树用分叉表达层级；二叉搜索树加上「左小右大」的规矩，让查找/插入/删除在<strong>平衡</strong>时都是 O(log n)。
          它的中序遍历是升序。一旦失衡会退化成链，所以实战用红黑树、AVL 等自平衡变种。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '树用根、孩子、叶子表达层级关系；每个节点连同后代又是一棵子树，天然适合递归。',
          '二叉树每个节点最多两个孩子；树的高度决定了操作的快慢。',
          '二叉搜索树规定「左子树都小、右子树都大」，查找像猜数字，平衡时 O(log n)。',
          'BST 的中序遍历（左→根→右）输出升序；失衡会退化成链，实战用红黑树/AVL 自平衡。',
        ]}
      />
    </>
  )
}
