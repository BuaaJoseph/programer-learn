import Lead from '@/components/cards/Lead.jsx'
import KeyIdea from '@/components/cards/KeyIdea.jsx'
import Example from '@/components/cards/Example.jsx'
import Practice from '@/components/cards/Practice.jsx'
import Callout from '@/components/cards/Callout.jsx'
import CodeBlock from '@/components/cards/CodeBlock.jsx'
import Summary from '@/components/cards/Summary.jsx'
import HttpsHandshake from '@/courses/network/illustrations/HttpsHandshake.jsx'

const symmetricCode = `# 对称加密：加密和解密用同一把钥匙 key
# 优点：快。缺点：这把 key 怎么安全地交给对方？
ciphertext = AES_encrypt(plaintext, key)   # 发送方用 key 加密
plaintext  = AES_decrypt(ciphertext, key)  # 接收方用同一个 key 解密
# 难题：在不安全的网络上，怎么把 key 传过去而不被偷？`

const asymmetricCode = `# 非对称加密：一对钥匙，公钥 pub 加密、私钥 priv 才能解
# 公钥可以满世界公开，私钥自己死守
ciphertext = RSA_encrypt(plaintext, pub)   # 任何人都能用公钥加密
plaintext  = RSA_decrypt(ciphertext, priv) # 只有私钥持有者能解
# 优点：解决了密钥分发。缺点：运算慢，不适合加密大量数据`

const opensslCmd = `# 连上服务器，打印它发来的证书链
openssl s_client -connect www.example.com:443 -servername www.example.com

# 关注输出里的 Certificate chain：
#  0 s:CN=www.example.com           ← 服务器自己的证书（叶子）
#    i:CN=R3, O=Let's Encrypt       ← 它由谁签发（中间 CA）
#  1 s:CN=R3, O=Let's Encrypt
#    i:CN=ISRG Root X1              ← 中间 CA 又由根 CA 签发
# 一路往上验到本机信任的根证书，链就闭合了`

const integrityCode = `# 完整性：HTTPS 用 MAC/AEAD 保证数据没被改
# 发送方对密文算一个带密钥的摘要（MAC），附在后面
ciphertext = AES_GCM_encrypt(plaintext, key)   # GCM 模式自带认证标签 tag
# 接收方解密时校验 tag，对不上就说明被篡改，直接拒绝

# 数字签名（证书里用的）：私钥签、公钥验
signature = RSA_sign(hash(data), priv)         # CA 用私钥对「公钥+域名」签名
ok = RSA_verify(hash(data), signature, pub)    # 客户端用 CA 公钥验签`

const tlsVersionCode = `# TLS 1.2 完整握手需要 2-RTT（两个来回）：
ClientHello ->
            <- ServerHello + 证书 + ServerHelloDone
ClientKeyExchange + Finished ->
            <- Finished
# 然后才能发应用数据

# TLS 1.3 优化到 1-RTT，且会话复用可 0-RTT：
ClientHello + 密钥共享 ->
            <- ServerHello + 证书 + Finished
Finished + 应用数据 ->        # 第一个来回就能带数据`

const verifyChainCode = `# 验证证书链是否完整、是否过期、域名是否匹配
openssl s_client -connect www.example.com:443 -servername www.example.com \\
  < /dev/null 2>/dev/null | openssl x509 -noout -dates -subject -issuer

# 只看有效期
# notBefore=... notAfter=...   <- 过期就会触发浏览器红色警告

# 检查某域名的证书链是否能验到可信根（verify return code 应为 0）
echo | openssl s_client -connect www.example.com:443 -servername www.example.com 2>&1 \\
  | grep -i 'verify return code'`

export default function Ch2() {
  return (
    <>
      <Lead>
        <p>
          上一章说过，HTTP 是明文传输的。这意味着你在咖啡馆连着公共 Wi-Fi 登录网银时，
          密码可能正以肉眼可读的形式飘在空气里，任何抓包的人都能看到，甚至偷偷改掉你的转账金额。
          <em>HTTPS</em> 就是给 HTTP 套上一层加密外壳，这层壳叫 <em>TLS</em>（旧称 SSL）。
          搞懂它，核心就是搞懂一件事：素不相识的两台机器，怎么在被人监听的网络上，安全地商量出一把只有它俩知道的钥匙。
        </p>
      </Lead>

      <h2>为什么需要 HTTPS</h2>
      <p>
        明文 HTTP 有三个致命问题，HTTPS 要全部解决：
      </p>
      <ul>
        <li>
          <strong>窃听</strong>：链路上的人能看到全部内容（密码、隐私）。→ 需要<strong>加密</strong>。
        </li>
        <li>
          <strong>篡改</strong>：中间人能改掉报文（给你下载的安装包塞木马）。→ 需要<strong>完整性校验</strong>。
        </li>
        <li>
          <strong>冒充</strong>：你以为在跟银行说话，其实对面是钓鱼网站。→ 需要<strong>身份认证</strong>。
        </li>
      </ul>

      <h2>两种加密：各有各的软肋</h2>
      <p>
        要理解 HTTPS 的精妙，得先认识两种加密各自的脾气。
      </p>

      <h3>对称加密：快，但密钥难分发</h3>
      <p>
        <em>对称加密</em>（如 AES）加密和解密用<strong>同一把钥匙</strong>。它运算快、适合加密大量数据，
        但有个死结：通信双方得先有同一把钥匙，可这把钥匙本身又怎么在不安全的网络上安全送达对方呢？
        直接发就被偷了——这就是<strong>密钥分发难题</strong>。
      </p>
      <CodeBlock lang="python" title="对称加密：钥匙怎么送过去？" code={symmetricCode} />

      <h3>非对称加密：解决分发，但慢</h3>
      <p>
        <em>非对称加密</em>（如 RSA）用<strong>一对</strong>钥匙：<strong>公钥</strong>加密的内容只有对应的
        <strong>私钥</strong>能解。公钥可以大大方方公开，私钥自己藏好。于是别人想发密信给你，
        用你的公钥加密即可，全世界只有握着私钥的你能解开——密钥分发难题迎刃而解。代价是它运算很慢，
        拿来加密整个网页的流量不现实。
      </p>
      <CodeBlock lang="python" title="非对称加密：公钥加密、私钥解密" code={asymmetricCode} />

      <KeyIdea title="HTTPS 的核心招式：用非对称「谈」出一把对称钥匙">
        <p>
          一个快但钥匙难送，一个能安全送钥匙但慢——HTTPS 把两者的长处拼起来：
          先用<strong>非对称加密</strong>安全地协商出一把临时的<strong>对称密钥</strong>（会话密钥），
          之后真正的网页数据全部用这把对称密钥来加密通信。慢的非对称只在握手阶段用一小下，
          海量数据走快的对称。这就是为什么<strong>不全程用非对称</strong>：纯粹是因为它太慢，扛不住大流量。
        </p>
      </KeyIdea>

      <h2>TLS 握手过程</h2>
      <p>
        握手就是上面那场「协商对称密钥」的谈判，简化成几步：
      </p>
      <ul>
        <li>
          <strong>ClientHello</strong>：客户端开口，告诉服务器自己支持的 TLS 版本、加密套件，并附一个随机数。
        </li>
        <li>
          <strong>ServerHello + 证书</strong>：服务器选定加密套件，回一个随机数，并把自己的<strong>数字证书</strong>
          （里面装着服务器的公钥）发过来。
        </li>
        <li>
          <strong>验证证书</strong>：客户端检查这张证书是不是可信 CA 签发的、有没有过期、域名对不对。
        </li>
        <li>
          <strong>协商出会话密钥</strong>：双方基于交换的随机数等材料，各自算出同一把<strong>对称会话密钥</strong>
          （现代 TLS 用 ECDHE 密钥交换，公钥主要用于验证身份）。此后所有数据都用这把对称密钥加密。
        </li>
      </ul>

      <HttpsHandshake />

      <h2>TLS 1.2 vs 1.3：握手少一个来回</h2>
      <p>
        握手是要花时间的，每个来回（RTT）都直接加到首屏延迟上。<strong>TLS 1.2 的完整握手需要 2-RTT</strong>，
        而 <strong>TLS 1.3 砍到了 1-RTT</strong>——它让客户端在第一个 <code>ClientHello</code> 里就直接带上密钥共享材料，
        服务器一回就能确定会话密钥。更妙的是，对访问过的站点，TLS 1.3 还支持 <strong>0-RTT</strong> 会话恢复：
        凭上次的会话票据，第一个数据包就能带应用数据，几乎零握手开销。这就是「第二次访问 HTTPS 明显更快」的底层原因之一。
      </p>
      <CodeBlock lang="text" title="TLS 1.2 (2-RTT) vs 1.3 (1-RTT/0-RTT)" code={tlsVersionCode} />
      <Callout variant="warn" title="0-RTT 的代价：重放攻击">
        <p>
          0-RTT 不是免费的午餐。因为它在握手完成前就发出了数据，攻击者可以<strong>截获并重复发送</strong>这段
          0-RTT 数据（重放攻击）。所以 0-RTT 只适合<em>幂等</em>请求（如 GET），绝不能用在「下单」「转账」
          这类重复执行会出问题的操作上。这是个把幂等性和安全性串起来的好考点。
        </p>
      </Callout>

      <h2>三大目标如何各自落地：加密、认证、完整性</h2>
      <p>
        HTTPS 要解决的窃听、冒充、篡改，分别由三种密码学手段兜底，别混为一谈：
      </p>
      <ul>
        <li>
          <strong>防窃听 → 加密</strong>：握手协商出对称密钥，数据用 AES 等对称算法加密。
        </li>
        <li>
          <strong>防冒充 → 身份认证</strong>：靠证书 + CA 链 + 数字签名，确认公钥确实属于这个域名。
        </li>
        <li>
          <strong>防篡改 → 完整性校验</strong>：每段密文带一个带密钥的摘要（MAC，现代用 AEAD 如 AES-GCM 自带认证标签），
          接收方校验对不上就判定被改、直接丢弃。
        </li>
      </ul>
      <CodeBlock lang="python" title="完整性校验与数字签名" code={integrityCode} />

      <h2>数字证书与 CA：公钥到底是不是对方的？</h2>
      <p>
        前面有个漏洞：握手时服务器把公钥发过来，可万一<strong>中间人</strong>把公钥换成自己的，
        客户端用错公钥协商，那加密对中间人就形同虚设。所以问题的关键变成：
        「我收到的这把公钥，真的属于 www.example.com，而不是冒充者吗？」
      </p>
      <p>
        解法是引入可信第三方<em>CA</em>（Certificate Authority，证书颁发机构）。CA 用自己的私钥给服务器的
        「公钥 + 域名」签个名，打包成<strong>数字证书</strong>。客户端用 CA 的公钥验证这个签名，
        签名对得上，就确信这把公钥确实属于这个域名。而 CA 的公钥又由更上一级 CA 签发，
        一层层往上直到操作系统/浏览器内置信任的<strong>根证书</strong>，形成一条<strong>证书链</strong>（CA 链）。
        链能从叶子一路验到可信根，身份就成立了。
      </p>

      <Callout variant="warn" title="证书出问题，浏览器为什么红警告">
        <p>
          当你看到「您的连接不是私密连接」，通常是证书<strong>过期</strong>、<strong>域名不匹配</strong>
          （证书给 a.com 却用在 b.com）、或<strong>签发它的 CA 不被信任</strong>（比如自签名证书）。
          这些恰恰是防中间人冒充的最后一道闸——别习惯性点「继续访问」，那等于自己拆掉了 HTTPS 的身份认证。
        </p>
      </Callout>

      <Callout variant="info" title="面试追问与常见误区">
        <ul>
          <li>
            <strong>误区：以为「公钥加密、私钥解密」就是 HTTPS 传数据的方式。</strong>现代 TLS 用 ECDHE 做密钥交换，
            公钥/私钥主要用于<em>身份认证</em>（验签），真正的会话密钥是双方各自算出来的，从不直接在网络上传输。
          </li>
          <li>
            <strong>追问：什么是前向保密（PFS）？</strong>用 ECDHE 这类临时密钥，即使服务器私钥日后泄露，
            攻击者也<em>无法</em>解密之前抓到的流量，因为每次会话的密钥都是临时、独立的。这是现代 TLS 必备特性。
          </li>
          <li>
            <strong>追问：中间人攻击是怎么被挡住的？</strong>中间人能换掉公钥，但换不掉「被可信 CA 签名的证书」——
            它没有 CA 的私钥伪造不出合法签名，客户端验签就会失败、报警告。
          </li>
          <li>
            <strong>追问：证书吊销怎么做？</strong>靠 CRL（吊销列表）或 OCSP（在线查询），
            现代多用 OCSP Stapling 由服务器把吊销状态一并发来，省去客户端单独查询。
          </li>
          <li>
            <strong>误区：以为 HTTPS 能隐藏你访问了哪个网站。</strong>SNI 里的域名在 TLS 1.2 是明文的
            （ESNI/ECH 才加密），DNS 查询也可能暴露，HTTPS 加密的是<em>内容</em>不是「访问了谁」。
          </li>
        </ul>
      </Callout>

      <h2>实战 / 面试怎么答</h2>
      <p>
        被问「HTTPS 怎么保证安全」，主线答三句：<strong>加密</strong>防窃听（对称加密传数据）、
        <strong>证书 + CA</strong>防冒充（验证服务器身份）、<strong>完整性校验</strong>防篡改。
        被追问「既然非对称更安全为什么不全程用」，答：<strong>非对称太慢，只用来在握手时安全协商出对称密钥，
        数据传输交给快的对称加密</strong>。被问「CA 解决了什么」，一句话：解决「这把公钥到底是不是对方的」，
        靠证书链防中间人。
      </p>

      <Practice title="用 openssl 看真实的证书链">
        <p>
          <code>openssl s_client</code> 能连上任意 HTTPS 站点并把它的证书链完整打印出来，
          亲眼看一条链怎么从服务器叶子证书，经中间 CA，一路验到根 CA。
        </p>
        <CodeBlock lang="bash" title="openssl 看证书链" code={opensslCmd} />
        <p>
          观察每一项的 <code>s:</code>（subject，证书属于谁）和 <code>i:</code>（issuer，谁签发的）：
          上一项的 issuer 正是下一项的 subject，环环相扣——这就是「链」的含义。
        </p>
        <p>
          再单独验一下有效期、域名匹配，以及整条链能否验到可信根（<code>verify return code: 0</code> 才算通过），
          这正是浏览器红色警告的判定依据：
        </p>
        <CodeBlock lang="bash" title="验证有效期与证书链" code={verifyChainCode} />
      </Practice>

      <Summary
        points={[
          'HTTPS = HTTP + TLS，目标是解决明文 HTTP 的窃听、篡改、冒充三大问题。',
          '对称加密快但密钥难分发；非对称加密能安全分发密钥但慢——HTTPS 取两者之长。',
          '核心招式：用非对称在握手时安全协商出一把对称会话密钥，之后数据全走快的对称加密。',
          'TLS 握手主线：ClientHello → ServerHello + 证书 → 验证证书 → 协商出对称会话密钥。',
          '数字证书 + CA 链解决「公钥是不是对方的」，靠可信第三方签名防中间人冒充。',
          '三大目标各自落地：加密防窃听、证书/CA/签名做身份认证防冒充、MAC/AEAD 校验完整性防篡改。',
          'TLS 1.2 握手 2-RTT、1.3 优化到 1-RTT 并支持 0-RTT；0-RTT 有重放风险，只能用于幂等请求。',
          'ECDHE 实现前向保密：会话密钥临时且双方各自算出、不在网络传输，服务器私钥日后泄露也解不开历史流量。',
          '不全程用非对称的唯一原因就是它太慢，扛不住大流量。',
        ]}
      />
    </>
  )
}
