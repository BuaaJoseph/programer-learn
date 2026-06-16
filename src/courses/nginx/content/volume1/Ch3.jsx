import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import LocationMatch from '@/courses/nginx/illustrations/LocationMatch.jsx'

const locationConf = `server {
    listen      80;
    server_name www.example.com;

    # 1) = 精确匹配：只命中正好是 /login 的请求
    location = /login {
        return 200 "exact login";
    }

    # 2) ^~ 前缀匹配：命中后不再去查正则
    location ^~ /static/ {
        root /var/www;          # 实际找 /var/www/static/...
    }

    # 3) ~ 正则（区分大小写）：匹配图片后缀
    location ~ \\.(png|jpg|gif)$ {
        root /var/www/images;
        expires 7d;
    }

    # 4) 普通前缀：兜底匹配，按最长前缀
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host       $host;
        proxy_set_header X-Real-IP  $remote_addr;
    }
}`

const serverNameConf = `# 同一端口下多个 server，靠 Host 头选虚拟主机
server {                          # 没写 default_server，但它是第一个 → 默认
    listen 80 default_server;
    server_name _;                # 兜底：匹配不到任何域名时落这里
    return 444;                   # 直接断开，挡掉乱填 Host 的扫描器
}

server {
    listen 80;
    server_name www.example.com;  # 精确域名优先级最高
    # ...
}

server {
    listen 80;
    server_name *.example.com;    # 通配符次之
    # ...
}`

const rootAliasConf = `# root 与 alias 行为对比
location /static/ {
    root /var/www;                # /static/a.png → /var/www/static/a.png（保留 /static/）
}

location /static/ {
    alias /var/www/assets/;       # /static/a.png → /var/www/assets/a.png（换掉 /static/）
}`

export default function Ch3() {
  return (
    <>
      <Lead>
        <p>
          一个请求到了 Nginx，它要做两次「选择题」：先按域名挑出由哪个 <em>server</em>（虚拟主机）来接待，
          再在这个 server 内部按 URL 挑出由哪条 <em>location</em> 规则来处理。
          这套匹配逻辑——尤其是 location 的优先级——是 Nginx 配置里最绕、也最高频被问的部分。
        </p>
      </Lead>

      <h2>一个请求的处理流程</h2>
      <p>
        请求进来后，Nginx 大致按这个顺序走：根据请求的 <code>Host</code> 头和监听端口，
        从所有 server 块里用 <code>server_name</code> <strong>选出一个虚拟主机</strong>；
        然后在该 server 内部，拿请求的 URI 去和各条 <code>location</code> 比对，
        <strong>选出一条规则</strong>来真正处理（返回静态文件、或 <code>proxy_pass</code> 转发给后端）。
        选 server 相对简单，难点全在「选哪条 location」。
      </p>

      <h3>server 是怎么选出来的</h3>
      <p>
        选虚拟主机分两层：先按 <strong>IP:端口</strong> 缩小到监听同一地址的那批 server，再按 <code>Host</code> 头匹配 <code>server_name</code>。
        匹配优先级是：<strong>精确域名 &gt; 前缀通配 <code>*.example.com</code> &gt; 后缀通配 <code>www.example.*</code> &gt; 正则 server_name</strong>，
        都不命中就交给标了 <code>default_server</code> 的那个（没标则用该端口下第一个 server）。
        实战里常用一个 <code>server_name _;</code> 的兜底块把乱填 Host 的扫描流量直接 <code>return 444</code> 掐掉。
      </p>
      <CodeBlock lang="nginx" title="多虚拟主机与 default_server" code={serverNameConf} />

      <h3>location 的修饰符与优先级</h3>
      <p>
        location 前面可以带不同的修饰符，决定了它的匹配方式和优先级。从高到低记住这个顺序：
      </p>
      <ul>
        <li>
          <strong><code>=</code> 精确匹配</strong>：URI 必须和它<strong>完全相等</strong>才命中，优先级最高，一旦命中立即结束查找。
        </li>
        <li>
          <strong><code>^~</code> 前缀匹配</strong>：匹配以它开头的 URI；它的特殊之处是<strong>命中后不再去查正则</strong>。
        </li>
        <li>
          <strong><code>~</code> 与 <code>~*</code> 正则匹配</strong>：<code>~</code> 区分大小写、<code>~*</code> 不区分，
          按它们在配置文件里<strong>出现的先后顺序</strong>逐条尝试，<strong>第一个匹配上的</strong>就用它。
        </li>
        <li>
          <strong>普通前缀匹配</strong>（不带修饰符）：在所有普通前缀里挑<strong>匹配最长</strong>的那条作为候选。
        </li>
      </ul>
      <p>
        完整的判定过程是：先记下匹配最长的普通前缀；如果它带了 <code>^~</code>，直接用、结束；
        否则再按顺序试正则，有正则命中就用正则；正则都不命中，才回到刚才那个最长普通前缀。
        所以可以粗略记成<strong>「= 最高 → ^~ → 正则按序 → 普通前缀最长兜底」</strong>。
      </p>
      <p>
        为什么要设计得这么绕？因为它把<strong>「确定性的精确/前缀」</strong>和<strong>「灵活的正则」</strong>分成两个阶段：
        精确与 <code>^~</code> 让你为关键路径锁死结果、避免被正则误伤；正则则提供按后缀、按模式批量处理的灵活性。
        理解了这个分层意图，优先级就不再是死记，而是「先定死、再灵活、最后兜底」的自然结果。
      </p>

      <Example title="一组 URL 分别命中哪条 location">
        <p>
          以本章 Practice 里那份配置为例（依次有 <code>= /login</code>、<code>^~ /static/</code>、
          <code>{'~ \\.(png|jpg|gif)$'}</code>、<code>/</code>），看看这几个请求各落到哪：
        </p>
        <ul>
          <li>
            <code>/login</code> → 命中 <code>= /login</code>（精确匹配优先级最高），返回 exact login。
          </li>
          <li>
            <code>/static/logo.png</code> → 命中 <code>^~ /static/</code>。注意：虽然它也匹配
            <code>{'~ \\.png$'}</code>，但 <code>^~</code> 命中后<strong>不再查正则</strong>，所以走静态目录而非图片规则。
          </li>
          <li>
            <code>/avatar.png</code> → 不在 <code>/static/</code> 下，<code>^~</code> 不命中；
            转去查正则，命中 <code>{'~ \\.(png|jpg|gif)$'}</code>，带上 7 天缓存。
          </li>
          <li>
            <code>/api/users</code> → 精确、<code>^~</code>、正则都不命中，落到普通前缀 <code>/</code>，转发给后端 8080。
          </li>
        </ul>
      </Example>

      <LocationMatch />

      <h3>优先级速查表</h3>
      <table>
        <thead>
          <tr>
            <th>修饰符</th>
            <th>含义</th>
            <th>命中后是否还查正则</th>
            <th>优先级</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>=</code></td>
            <td>精确相等</td>
            <td>否，立即结束</td>
            <td>最高</td>
          </tr>
          <tr>
            <td><code>^~</code></td>
            <td>前缀，最长匹配</td>
            <td>否，跳过正则</td>
            <td>高</td>
          </tr>
          <tr>
            <td><code>~</code> / <code>~*</code></td>
            <td>正则（区分/不区分大小写）</td>
            <td>按出现顺序，第一个命中即用</td>
            <td>中</td>
          </tr>
          <tr>
            <td>（无）</td>
            <td>普通前缀，最长匹配</td>
            <td>会先存为候选再试正则</td>
            <td>兜底</td>
          </tr>
        </tbody>
      </table>

      <KeyIdea title="^~ 是优先级里的关键拐点">
        <p>
          很多人栽在 <code>^~</code> 上。普通前缀和 <code>^~</code> 前缀都是「按最长匹配」，但区别在于：
          普通前缀命中后<strong>还会继续去试正则</strong>，正则赢了就用正则；而 <code>^~</code> 一旦作为最长前缀命中，
          就<strong>直接拍板、跳过所有正则</strong>。想让某个目录（比如静态资源）绝对不被图片正则截胡，就给它加 <code>^~</code>。
        </p>
      </KeyIdea>

      <Callout variant="warn" title="root vs alias，别用混">
        <p>
          指定文件目录有两个指令，行为不一样，配错就 404：
        </p>
        <ul>
          <li>
            <strong><code>root</code></strong>：把<strong>完整的请求 URI 拼到 root 后面</strong>。
            <code>location /static/</code> 配 <code>root /var/www;</code>，访问 <code>/static/a.png</code> 实际找
            <code>/var/www/static/a.png</code>（location 路径会保留）。
          </li>
          <li>
            <strong><code>alias</code></strong>：用 alias 的值<strong>替换掉 location 匹配的那段路径</strong>。
            <code>location /static/</code> 配 <code>alias /var/www/assets/;</code>，访问 <code>/static/a.png</code> 实际找
            <code>/var/www/assets/a.png</code>（/static/ 被换掉了）。用 alias 时结尾的斜杠要对齐，否则容易出错。
          </li>
        </ul>
        <CodeBlock lang="nginx" title="root 拼接 vs alias 替换" code={rootAliasConf} />
      </Callout>

      <Callout variant="info" title="还有两个易混点：try_files 与尾斜杠跳转">
        <ul>
          <li>
            <strong><code>try_files</code></strong>：按顺序找文件，找不到就走最后一个兜底，前端单页应用必备——
            <code>try_files $uri $uri/ /index.html;</code> 让所有前端路由都回退到 index.html，刷新不再 404。
          </li>
          <li>
            <strong>目录尾斜杠</strong>：访问一个目录少写斜杠时，Nginx 会发 301 跳到带斜杠的版本；
            反向代理后这个 301 可能跳到内网地址，需要配 <code>absolute_redirect off;</code> 或 <code>port_in_redirect</code> 修正。
          </li>
        </ul>
      </Callout>

      <h2>常见错误码：502 与 504</h2>
      <p>
        location 转发到后端时，两个状态码最常见、也最容易混：
      </p>
      <ul>
        <li>
          <strong>502 Bad Gateway</strong>：Nginx 作为网关，<strong>连不上后端或后端返回了非法响应</strong>——
          通常是后端服务挂了、端口写错、或后端崩溃。重点排查「后端在不在、地址对不对」。
        </li>
        <li>
          <strong>504 Gateway Timeout</strong>：Nginx 连上了后端，但后端<strong>处理太慢、超时了</strong>——
          通常是后端响应慢，或 <code>proxy_read_timeout</code> 等超时设置过短。重点排查「后端慢不慢、超时够不够」。
        </li>
      </ul>
      <p>
        一句话区分：<strong>502 是「联系不上」，504 是「等不及」</strong>。
        顺带提一句 <strong>413 Request Entity Too Large</strong>——上传大文件被拒，通常是 <code>client_max_body_size</code> 默认 1M 太小，
        这也是面试里高频的「上传 500/413 怎么排查」的答案。
      </p>

      <h2>面试怎么答</h2>
      <p>
        被问「location 匹配优先级」，先背顺序：<strong>= 精确 → ^~ 前缀（命中不查正则）→ ~ / ~* 正则按出现顺序 → 普通前缀最长兜底</strong>；
        再点一句关键细节——普通前缀命中后还会试正则，而 <code>^~</code> 命中直接结束。
        被问 502/504，答「502 连不上后端、504 后端超时」。被问 root/alias，答「root 拼接、alias 替换」。
      </p>
      <Callout variant="info" title="面试追问预演">
        <ul>
          <li>
            「<code>/static/logo.png</code> 同时匹配 ^~ 和图片正则走哪个？」——走 ^~，因为 ^~ 命中后不再查正则。
          </li>
          <li>
            「前端单页路由刷新 404 怎么解决？」——location 里 <code>try_files $uri $uri/ /index.html;</code> 回退。
          </li>
          <li>
            「server_name 都匹配不到去哪？」——default_server，没标则该端口第一个 server。
          </li>
          <li>
            「大文件上传报 413？」——调大 <code>client_max_body_size</code>。
          </li>
        </ul>
      </Callout>

      <Practice title="写几条 location 并推断命中">
        <p>
          把下面这份配置看懂，逐条对照「修饰符 → 优先级」，再自己拿几个 URL 走一遍判定流程。
        </p>
        <CodeBlock lang="nginx" title="nginx.conf（location 匹配示例）" code={locationConf} />
        <p>
          练习：分别推断 <code>/login</code>、<code>/static/app.js</code>、<code>/photo.JPG</code>、<code>/home</code>
          各命中哪条（提示：<code>/photo.JPG</code> 是大写后缀，<code>~</code> 区分大小写所以<strong>不</strong>命中图片正则，
          会落到普通前缀 <code>/</code>；若想匹配大写要用 <code>~*</code>）。配完别忘了 <code>nginx -t</code> 再 reload。
        </p>
      </Practice>

      <Summary
        points={[
          '请求处理两步走：先按 IP:端口 + server_name 选虚拟主机，再在 server 内按 URI 选 location 规则。',
          'server_name 匹配优先级：精确域名 > 前缀通配 > 后缀通配 > 正则，都不中走 default_server。',
          'location 优先级：= 精确 > ^~ 前缀（命中后不再查正则）> ~ / ~* 正则（按出现顺序，第一个命中即用）> 普通前缀（最长匹配兜底）。',
          '^~ 是关键拐点：普通前缀命中后还会试正则，^~ 命中则直接结束、跳过所有正则。',
          'root 是拼接（保留 location 路径），alias 是替换（换掉匹配段），用混会导致 404；前端单页用 try_files 回退 index.html。',
          '502 Bad Gateway 是连不上后端或后端非法响应；504 Gateway Timeout 是后端处理超时；413 是上传超过 client_max_body_size。',
          '~ 区分大小写、~* 不区分；配完用 nginx -t 校验再 reload。',
        ]}
      />
    </>
  )
}
