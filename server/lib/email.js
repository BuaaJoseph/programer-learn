// 邮件发送：抽象出 EmailProvider 接口，便于切换实现。
// - 默认 MockEmailProvider：开发期不真正发信，仅打印到控制台（并在 dev 下由接口回显验证码）。
// - SmtpEmailProvider：配置好 SMTP 环境变量后用 nodemailer 真实发信。
//
// 切换方式：设置环境变量 EMAIL_PROVIDER=smtp 且提供 SMTP_* 变量即可，无需改业务代码。

class MockEmailProvider {
  async sendCode(to, code) {
    console.log(`[email:mock] → ${to} 验证码: ${code}（开发模式不真正发信）`)
  }
}

class SmtpEmailProvider {
  constructor() {
    this.transporter = null
  }

  async getTransporter() {
    if (this.transporter) return this.transporter
    const { default: nodemailer } = await import('nodemailer')
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    return this.transporter
  }

  async sendCode(to, code) {
    const transporter = await this.getTransporter()
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    await transporter.sendMail({
      from,
      to,
      subject: '【编程学习站】邮箱验证码',
      text: `你的验证码是 ${code}，10 分钟内有效。若非本人操作请忽略。`,
      html: `<p>你的验证码是 <b style="font-size:18px;letter-spacing:2px">${code}</b></p><p>10 分钟内有效。若非本人操作请忽略本邮件。</p>`,
    })
  }
}

let provider
export function getEmailProvider() {
  if (provider) return provider
  provider =
    process.env.EMAIL_PROVIDER === 'smtp'
      ? new SmtpEmailProvider()
      : new MockEmailProvider()
  return provider
}

// 开发模式下接口直接回显验证码，方便联调（生产环境务必关闭）。
export const DEV_RETURN_CODE =
  process.env.NODE_ENV !== 'production' &&
  process.env.EMAIL_PROVIDER !== 'smtp'
