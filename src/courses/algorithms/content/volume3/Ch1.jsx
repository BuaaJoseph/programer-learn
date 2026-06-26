import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import TreePlayer from '@/courses/algorithms/illustrations/TreeFigure.jsx'

const code = `def preorder(node):      # 前序：根 → 左 → 右
    if not node: return
    visit(node)          # 先处理自己
    preorder(node.left)
    preorder(node.right)

def inorder(node):       # 中序：左 → 根 → 右
    if not node: return
    inorder(node.left)
    visit(node)          # 左子树走完才处理自己
    inorder(node.right)

def postorder(node):     # 后序：左 → 右 → 根
    if not node: return
    postorder(node.left)
    postorder(node.right)
    visit(node)          # 左右都处理完最后才到自己`

export default function Ch1() {
  return (
    <>
      <Lead>
        <p>
          有了一棵树，最基本的需求就是「不重不漏地访问每一个节点」——这叫<strong>遍历</strong>。
          线性表只有一种走法（从头到尾），但树有分叉，于是产生了多种顺序。
          神奇的是，<strong>区别只在一件事上：什么时候处理「根」节点</strong>。把这一点想通，四种遍历就全通了。
        </p>
      </Lead>

      <h2>三种深度优先：根，放在哪一步处理</h2>
      <p>
        对每个节点，我们都要做三件事：处理它自己（根）、递归它的左子树、递归它的右子树。
        把「处理根」插在不同位置，就得到三种顺序：
      </p>
      <ul>
        <li><strong>前序（根→左→右）</strong>：一进入节点<em>先</em>处理它，再下到子树。适合「自顶向下」复制一棵树、打印目录结构。</li>
        <li><strong>中序（左→根→右）</strong>：先走完整棵左子树，<em>回到</em >节点时才处理它。对二叉搜索树，输出正好升序。</li>
        <li><strong>后序（左→右→根）</strong>：左右子树都处理完，<em>最后</em>才处理根。适合「自底向上」：先删/释放孩子再删自己、计算目录总大小。</li>
      </ul>

      <CodeBlock lang="python" title="tree_traversal.py" code={code} />

      <h2>同一棵树，三种顺序，一眼看清差别</h2>
      <p>
        下面是同一棵树（节点 1～7）。先看<strong>前序</strong>：每进入一个节点立刻输出（角标显示访问次序），所以根 1 第一个被访问。
        下方的「递归栈」就是当前「来时的路」。
      </p>
      <TreePlayer order="preorder" />

      <p>再看<strong>中序</strong>：注意根 1 不再是第一个——它要等整棵左子树（2、4、5）都访问完才轮到，输出是 4、2、5、1……</p>
      <TreePlayer order="inorder" />

      <p>最后是<strong>后序</strong>：根 1 被放到了<em>最后</em>，因为它要等左右子树全部处理完。</p>
      <TreePlayer order="postorder" />

      <h2>第四种：层序遍历（广度优先）</h2>
      <p>
        前面三种都是「一头扎到底再回头」的深度优先。还有一种完全不同的走法：<strong>一层一层地从上往下、从左到右</strong>访问，
        像剥洋葱。它做不到用递归自然表达，而是要借助一个<strong>队列</strong>：根先入队，然后不断从队首取出一个节点访问、
        再把它的孩子加入队尾。盯住下方的队列怎么先进先出，你就理解了 BFS 的雏形（下一章细讲）。
      </p>
      <TreePlayer order="levelorder" />

      <Callout variant="tip" title="怎么记住前/中/后序">
        <p>
          口诀：「序」指的就是<strong>根</strong>被访问的时机。<em>前</em>序=根在前，<em>中</em>序=根在中间，<em>后</em>序=根在后。
          左永远在右之前。记住这一点，你不用背三段代码，看名字就能写出来。
        </p>
      </Callout>

      <Example title="它们各自的真实用途">
        <p>
          <strong>前序</strong>常用于序列化一棵树、深拷贝、打印带缩进的目录；<strong>中序</strong>是二叉搜索树「按序输出」的标准手段；
          <strong>后序</strong>用于释放/删除整棵树（先删孩子）、计算每个节点的子树信息（如目录占用大小、表达式求值）；
          <strong>层序</strong>用于「按层」处理，比如找树的最大宽度、逐层打印。
        </p>
      </Example>

      <KeyIdea title="一句话记住四种遍历">
        <p>
          前/中/后序都是深度优先，区别只在「处理根」的时机（前=先、中=中、后=后），用递归天然实现；
          层序是广度优先，一层层访问，要用队列实现。它们覆盖了「自顶向下」「按序」「自底向上」「按层」四类处理需求。
        </p>
      </KeyIdea>

      <Summary
        points={[
          '遍历 = 不重不漏访问每个节点；树因有分叉而产生多种顺序。',
          '前序根→左→右、中序左→根→右、后序左→右→根，区别只在「处理根」的时机，用递归实现。',
          '中序遍历二叉搜索树会得到升序；后序适合「先处理孩子再处理自己」。',
          '层序是另一类：一层层访问，用队列实现，是下一章广度优先搜索的雏形。',
        ]}
      />
    </>
  )
}
