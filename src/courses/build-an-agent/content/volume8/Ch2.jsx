import Lead from '@/components/cards/Lead.jsx';
import KeyIdea from '@/components/cards/KeyIdea.jsx';
import Callout from '@/components/cards/Callout.jsx';
import CodeBlock from '@/components/cards/CodeBlock.jsx';
import Example from '@/components/cards/Example.jsx';
import Summary from '@/components/cards/Summary.jsx';

const pkgJson = `{
  "name": "@buaajoseph/forge",
  "version": "0.1.0",
  "type": "module",
  "bin": { "forge": "dist/index.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "license": "MIT"
}`;

const publishSteps = `npm login                       # 首次：登录 npm 账号
npm run typecheck && npm test   # 把关：类型与测试都过
npm publish --access public     # scoped 包要 --access public 才公开`;

const installTry = `npm i -g @buaajoseph/forge
export ANTHROPIC_API_KEY=sk-...
forge`;

const runtimeLook = `forge · 模型 claude-opus-4-8（输入 /help 看命令，/exit 退出）
> `;

const versionBump = `npm version patch   # 0.1.0 -> 0.1.1（修 bug）
npm version minor   # 0.1.0 -> 0.2.0（加功能）
npm version major   # 0.1.0 -> 1.0.0（破坏性变更）
npm publish --access public`;

const packDryRun = `npm pack --dry-run`;

const altInstall = `# 方式一：本地软链，改完即用，适合开发自测
npm link

# 方式二：直接从 GitHub 装，适合内部/个人使用
npm i -g github:buaajoseph/forge`;

export default function Ch2() {
  return (
    <article>
      <Lead>
        上一章我们把 forge 编译成了 <code>dist/</code> 里的产物，并配好了 <code>bin</code> 入口。
        现在它在你自己的电脑上能跑——但「能跑」和「别人能装」是两回事。这一章，我们把 forge 推到 npm，
        让世界上任何一个有 Node 的人，都能像装 Claude Code 那样，一条命令把你的 Agent 装到终端里。
      </Lead>

      <h2>目标：一条命令就能装上</h2>
      <p>
        我们想要的最终效果非常具体：任何人在自己终端里敲下
        <code>{'npm i -g @buaajoseph/forge'}</code>，等几秒装好，然后直接敲 <code>forge</code>，
        我们写的那个交互式 Agent 就启动了。和装 <code>claude</code>、装 <code>vercel</code>、装 <code>tsx</code>
        是完全一样的体验。
      </p>

      <KeyIdea>
        发布的本质，就是把你的产物变成「一条 npm 命令就能装上的工具」。
        你不再交付一个需要 clone、需要 npm install、需要看 README 才能跑起来的仓库，
        而是交付一个名字——别人记住 <code>@buaajoseph/forge</code> 就够了。
      </KeyIdea>

      <h2>发布前的 package.json 关键字段</h2>
      <p>
        npm 发布读的是 <code>package.json</code>。我们在前几章已经陆续填好了它，
        这里把和「发布」直接相关的字段拎出来，逐字过一遍：
      </p>

      <CodeBlock lang="json" title="package.json（发布相关字段）" code={pkgJson} />

      <ul>
        <li>
          <strong>name</strong>：包名。这里是 scoped 包，格式 <code>{'@scope/name'}</code>，
          <code>@buaajoseph</code> 是你的 npm 用户名或组织名。注意 scoped 包默认是私有的，
          所以发布时必须显式加 <code>--access public</code>，否则 npm 会当成付费私有包处理。
        </li>
        <li>
          <strong>version</strong>：版本号，遵循语义化版本（SemVer）<code>主.次.修订</code>。
          npm 不允许重复发布同一个版本号，每发一次都得是新版本。
        </li>
        <li>
          <strong>bin</strong>：命令映射。<code>{'{ "forge": "dist/index.js" }'}</code> 告诉 npm，
          全局安装后要创建一个叫 <code>forge</code> 的可执行命令，它指向 <code>dist/index.js</code>。
          这就是为什么装完能直接敲 <code>forge</code>。
        </li>
        <li>
          <strong>files</strong>：白名单，只把这里列的内容打进包里。我们只发 <code>dist</code>、
          <code>README.md</code>、<code>LICENSE</code>——源码、测试、配置统统不发，包更小更干净。
        </li>
        <li>
          <strong>engines</strong>：最低 Node 版本要求。<code>{'">=18"'}</code> 表示别人用 Node 18 以下装会收到警告。
        </li>
        <li>
          <strong>license</strong>：开源协议。<code>MIT</code> 是最宽松常见的选择，别人随便用。
        </li>
      </ul>

      <h2>发布流程</h2>
      <p>
        字段就位后，发布本身就是三步走：
      </p>

      <CodeBlock lang="bash" title="发布步骤" code={publishSteps} />

      <ul>
        <li>
          <strong>npm login</strong>：第一次发布前要登录你的 npm 账号（没有就去 npmjs.com 注册）。
          登录信息会存在本地，之后就不用每次都登。
        </li>
        <li>
          <strong>发布前自检</strong>：我们在上一章配了 <code>prepublishOnly</code>，
          <code>npm publish</code> 时它会自动跑 typecheck + build，保证发出去的产物是新鲜且类型正确的。
          但测试不一定在钩子里，所以这里手动再跑一遍 <code>npm test</code>，把关更稳——
          发出去的 bug 撤回起来很麻烦，多花十秒值得。
        </li>
        <li>
          <strong>npm publish --access public</strong>：scoped 包必须带 <code>--access public</code>，
          否则 npm 默认按私有包发布，而你（多半）没有私有包权限，会直接报错失败。
          加上这个参数，它就是一个所有人可见、可装的公共包。
        </li>
      </ul>

      <h2>真机验证</h2>
      <p>
        发完别急着庆祝，换个干净的环境（或者就在本机）真装一遍，确认它能跑：
      </p>

      <CodeBlock lang="bash" title="装上试试" code={installTry} />

      <p>
        装好、配好 key、敲下 <code>forge</code> 之后，终端里就会出现我们这几卷一行行写出来的界面：
      </p>

      <CodeBlock lang="text" title="进入后的样子" code={runtimeLook} />

      <Example title="它真的装上了">
        停下来感受一下这一刻：几周前，你面对的是一个空文件夹。然后你写了流式对话、写了工具调用、
        写了上下文管理、写了 REPL，编译成 <code>dist/</code>，配好 <code>bin</code>，推到了 npm。
        现在，地球另一端一个素未谋面的人，只要敲一条 <code>{'npm i -g @buaajoseph/forge'}</code>，
        就能在自己的终端里用上你的 Agent——和他装 Claude Code 的方式一模一样。
        从「我能跑」到「人人能装」，差的就是这一章。
      </Example>

      <h2>版本与更新</h2>
      <p>
        发出去的代码总要迭代。改了代码想发新版，不要手动去改 <code>package.json</code> 里的版本号，
        用 <code>npm version</code> 让它帮你改：
      </p>

      <CodeBlock lang="bash" title="发新版" code={versionBump} />

      <Callout variant="tip">
        <code>npm version patch/minor/major</code> 会自动改 <code>package.json</code> 的版本号，
        并打上一个对应的 git tag（比如 <code>v0.1.1</code>），省得你手动同步。
        怎么选？遵循语义化版本：<strong>修 bug</strong> 用 <code>patch</code>（0.1.0→0.1.1）；
        <strong>加功能但旧用法不破坏</strong>用 <code>minor</code>（0.1.0→0.2.0）；
        <strong>有破坏性变更</strong>（改了命令名、删了参数）用 <code>major</code>（0.1.0→1.0.0）。
        改完版本号再 <code>npm publish --access public</code> 发新版即可。
      </Callout>

      <h2>发布前再确认一眼</h2>
      <Callout variant="warn">
        发布前用 <code>npm pack --dry-run</code> 干跑一遍，它会列出这次到底会把哪些文件打进包里。
        一定要确认 <code>.env</code>、<code>.forge/</code>、任何含密钥的文件<strong>没有</strong>被打进去——
        <code>files</code> 白名单是你的第一道防线，但亲眼核对最稳。
        记住：npm 包一旦发布就很难彻底撤回，<code>npm unpublish</code> 有严格的时间和条件限制，
        而且密钥一旦随包公开，就要当成已经泄露来处理（立刻去后台吊销重置）。
        <CodeBlock lang="bash" title="干跑确认包内容" code={packDryRun} />
      </Callout>

      <h2>不想发公共 npm？还有别的路</h2>
      <Callout variant="note">
        公共 npm 不是唯一的分发方式。如果你只是自己用或团队内部用：
        <code>npm link</code> 在本地建一个软链，改完代码立刻生效，特别适合开发期自测；
        <code>npm i -g {'<git 仓库地址>'}</code> 可以直接从 GitHub 仓库装，
        无需经过 npm registry，适合私有/内部项目。
        <CodeBlock lang="bash" title="本地或从 git 安装" code={altInstall} />
      </Callout>

      <h2>下一章</h2>
      <p>
        现在别人能装了——可装上之后呢？他面对一个陌生的 <code>forge</code> 命令，不知道支持哪些参数、
        怎么配 key、有哪些斜杠命令。没有文档，再好的工具也没人会用。
      </p>

      <KeyIdea>
        发布让工具「能被装上」，文档让工具「能被用起来」。下一章我们写 README——
        把安装、配置、用法、示例讲清楚，让别人不用读源码就能上手。
      </KeyIdea>

      <Summary
        points={[
          '发布的本质：把产物变成「一条 npm 命令就能装上的工具」，别人只需记住包名。',
          'package.json 发布字段：name（scoped 包要 --access public）、version（SemVer）、bin（命令映射）、files（白名单）、engines、license。',
          '发布三步：npm login → npm run typecheck && npm test → npm publish --access public。',
          'scoped 包必须带 --access public，否则按私有包处理而失败。',
          '真机验证：npm i -g 装上、配 ANTHROPIC_API_KEY、敲 forge 确认能跑。',
          '更新用 npm version patch/minor/major 自动改版本号并打 tag，再 publish；按 SemVer 选级别。',
          '发布前 npm pack --dry-run 确认不含 .env/.forge/密钥；npm 包难以彻底撤回。',
          '替代分发：npm link 本地软链、npm i -g <git 地址> 从 GitHub 装，适合内部/个人使用。',
        ]}
      />
    </article>
  );
}
