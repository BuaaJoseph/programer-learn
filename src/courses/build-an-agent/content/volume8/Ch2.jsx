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

const semverRules = `MAJOR.MINOR.PATCH      例：2.4.1
  │     │     └─ PATCH：只修 bug，行为不变，用户可放心升
  │     └─────── MINOR：加了新功能，但旧用法照样能跑（向后兼容）
  └───────────── MAJOR：有破坏性变更，升级前用户得改自己的用法

预发布标签：1.0.0-beta.1 < 1.0.0-rc.1 < 1.0.0
  beta/rc 这类带短横线的版本，npm 不会当成 latest 默认装`;

const distTag = `# 想发一个测试版又不想顶掉正式版？用 dist-tag
npm publish --tag beta --access public   # 发成 beta 频道，不动 latest

npm i -g @buaajoseph/forge          # 装的还是 latest（稳定版）
npm i -g @buaajoseph/forge@beta     # 显式装 beta 才拿到测试版
npm dist-tag ls @buaajoseph/forge   # 查看一个包有哪些频道`;

const whoamiCheck = `npm whoami                    # 确认当前登录的是哪个账号
npm access ls-packages        # 看你有发布权限的包
npm view @buaajoseph/forge    # 包发出去后，从 registry 拉一份元信息核对`;

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
      <p>
        <strong>为什么发布是「门槛」而不是「能力」问题。</strong>到这一步，forge 的功能早就齐了——发布不会让它变强，
        但会改变它和世界的关系：从「躺在你硬盘上的一个仓库」变成「全球可寻址的一个名字」。
        npm 本质上是一个公共的、有全局命名空间的软件分发网络，你把产物上传，它负责让任何人按名字精确取回某个版本。
        这背后是一整套约定——版本怎么编、包名怎么占、哪些文件进包、装在哪——本章就是把这些约定逐条讲清。
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

      <h2>为什么用 scoped 包（@scope/name）</h2>
      <p>
        你大概注意到了包名带个 <code>@buaajoseph/</code> 前缀，而不是直接叫 <code>forge</code>。
        这不是装饰，是有意为之。无前缀的「裸包名」全 npm 共享一个扁平命名空间——好名字早被抢光了，
        <code>forge</code> 这种常见词根本注册不上。<strong>scoped 包</strong>把命名空间收进你自己的 scope 下：
        只要 <code>@buaajoseph</code> 是你的，<code>@buaajoseph/forge</code> 就一定是你的，不会和别人撞车。
      </p>
      <ul>
        <li><strong>好处一：名字稳。</strong>scope 内的命名你说了算，不用为抢名字焦虑。</li>
        <li><strong>好处二：归属清晰。</strong>一看前缀就知道是谁/哪个组织维护的，建立信任。</li>
        <li><strong>代价：默认私有。</strong>scoped 包默认私有，公开发布必须显式 <code>--access public</code>，这是新手最常踩的坑。</li>
      </ul>

      <Callout variant="warn">
        最高频的发布失败就是忘了 <code>--access public</code>：scoped 包默认按<strong>私有包</strong>处理，
        而免费账号没有私有包权限，于是 <code>npm publish</code> 直接报 402/403 失败。
        记牢一条：scoped 包要公开，<code>npm publish --access public</code> 一个都不能少。
      </Callout>

      <h2>看懂 SemVer：版本号不是随便编的</h2>
      <p>
        <code>version</code> 字段遵循语义化版本（Semantic Versioning）。它不只是个递增的数字，
        而是你和用户之间的一份<strong>契约</strong>：用户光看版本号的变化，就该能判断「这次升级会不会弄坏我的东西」。
      </p>

      <CodeBlock lang="text" title="SemVer 规则速记" code={semverRules} />

      <p>
        理解这套规则的关键是站在<strong>用户视角</strong>：他们多半在 package.json 里写 <code>{'"^1.2.0"'}</code> 这样的范围，
        <code>^</code> 表示「允许自动升到 MINOR/PATCH，但锁死 MAJOR」。所以——
      </p>
      <ul>
        <li>你发 PATCH（修 bug），用户下次 install 会自动拿到，他们默认你<strong>没改行为</strong>，悄悄修了 bug 是惊喜。</li>
        <li>你发 MINOR（加功能），用户也会自动拿到，他们默认<strong>旧用法照样能跑</strong>。</li>
        <li>你发 MAJOR（破坏性），用户<strong>不会</strong>被自动升上来，因为你「打破了承诺」，必须他们手动改版本范围才会升。</li>
      </ul>
      <p>
        <strong>常见误区</strong>：把改了行为的修改当 PATCH 偷偷发出去。比如「顺手把某个默认值改了」——对你是小改，
        对依赖旧默认值的用户却是破坏性的，而他们因为是 PATCH 毫无防备地自动升了上来，半夜被叫起来排查。
        破坏兼容就老老实实升 MAJOR，这是 SemVer 最该守的纪律。
      </p>

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

      <Callout variant="tip">
        发布前先确认「身份」和「权限」，比发完才发现发错账号省心得多：
        <CodeBlock lang="bash" title="发布前的身份核对" code={whoamiCheck} />
        <code>npm whoami</code> 告诉你当前是哪个账号；如果你有多个账号或开了双因素认证（强烈建议开），
        发布时还会要你输入一次性验证码。发完用 <code>npm view</code> 从 registry 拉元信息，
        核对版本号、tarball 大小、依赖列表是否符合预期。
      </Callout>

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

      <h2>dist-tag：让测试版和正式版井水不犯河水</h2>
      <p>
        默认情况下，<code>npm publish</code> 会把新版本标成 <code>latest</code>——也就是别人 <code>npm i</code> 默认拿到的那个。
        问题来了：你想发个测试版给少数人试，又不想顶掉所有人都在用的稳定版，怎么办？
        答案是 <strong>dist-tag</strong>，给版本分「频道」：
      </p>

      <CodeBlock lang="bash" title="用 dist-tag 区分频道" code={distTag} />

      <p>
        配合上面 SemVer 里的预发布标签（<code>1.0.0-beta.1</code>），你就能跑一套很专业的发布流程：
        新大版本先发 <code>--tag beta</code> 让早鸟尝鲜、收反馈，稳定后再
        <code>npm dist-tag add @你/forge@1.0.0 latest</code> 正式「转正」。
        普通用户全程只装 <code>latest</code>，完全不受你的测试版影响。
      </p>

      <h2>发布前再确认一眼</h2>
      <Callout variant="warn">
        发布前用 <code>npm pack --dry-run</code> 干跑一遍，它会列出这次到底会把哪些文件打进包里。
        一定要确认 <code>.env</code>、<code>.forge/</code>、任何含密钥的文件<strong>没有</strong>被打进去——
        <code>files</code> 白名单是你的第一道防线，但亲眼核对最稳。
        记住：npm 包一旦发布就很难彻底撤回，<code>npm unpublish</code> 有严格的时间和条件限制，
        而且密钥一旦随包公开，就要当成已经泄露来处理（立刻去后台吊销重置）。
        <CodeBlock lang="bash" title="干跑确认包内容" code={packDryRun} />
      </Callout>

      <h2>撤回的代价：为什么发布要慎重</h2>
      <p>
        「发错了删掉重发不就行了」——这是新手对 npm 最大的误解。npm 为了保护生态（避免「左 pad 事件」那种
        一个包消失拖垮一片项目），对撤回设了非常严格的限制，你必须在按下回车前就知道：
      </p>
      <ul>
        <li><strong>72 小时窗口</strong>：只有发布后 72 小时内、且没有其他包依赖它、且 24 小时内没发过其他版本，才允许 <code>npm unpublish</code> 整包删除。过了就删不掉了。</li>
        <li><strong>版本号不可复用</strong>：即使删掉了 <code>1.2.3</code>，这个版本号也<strong>永久不能再被发布</strong>。你只能换个新号（如 <code>1.2.4</code>）。这是为了防止「同一版本号内容被偷换」的供应链攻击。</li>
        <li><strong>更推荐 deprecate</strong>：与其删除，不如 <code>npm deprecate @你/forge@1.2.3 "有严重 bug，请升级到 1.2.4"</code>——包还在、不破坏依赖它的人，但任何安装的人都会看到警告。</li>
        <li><strong>密钥泄露当作已泄露处理</strong>：如果不慎把密钥打进了包，删包没用——它可能已被镜像、被爬取。正确做法是立刻去服务商后台<strong>吊销并重置</strong>那把 key。</li>
      </ul>

      <h2>不想发公共 npm？还有别的路</h2>
      <Callout variant="note">
        公共 npm 不是唯一的分发方式。如果你只是自己用或团队内部用：
        <code>npm link</code> 在本地建一个软链，改完代码立刻生效，特别适合开发期自测；
        <code>npm i -g {'<git 仓库地址>'}</code> 可以直接从 GitHub 仓库装，
        无需经过 npm registry，适合私有/内部项目。
        <CodeBlock lang="bash" title="本地或从 git 安装" code={altInstall} />
        团队场景还有第三条路：搭一个<strong>私有 registry</strong>（如 Verdaccio）或用 GitHub Packages，
        发布命令和公共 npm 几乎一样，只是 registry 地址换成你自己的——内部包不外泄，又保留 npm 的版本管理。
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
          'scoped 包（@scope/name）命名空间归你、不撞名、归属清晰，代价是默认私有，公开必须 --access public。',
          'SemVer 是契约：PATCH 修 bug、MINOR 加功能向后兼容、MAJOR 破坏兼容；别把破坏性改动当 PATCH 偷发。',
          '发布三步：npm login → npm run typecheck && npm test → npm publish --access public；发前 npm whoami 核对身份。',
          '更新用 npm version patch/minor/major 自动改版本号并打 tag，再 publish；按 SemVer 选级别。',
          'dist-tag 给版本分频道：--tag beta 发测试版不顶掉 latest，稳定后再转正为 latest。',
          '撤回受限：unpublish 仅 72 小时窗口、版本号永久不可复用，更推荐 deprecate；密钥泄露要立刻吊销。',
          '替代分发：npm link 本地软链、npm i -g <git 地址> 从 GitHub 装、私有 registry，适合内部/个人使用。',
        ]}
      />
    </article>
  );
}
