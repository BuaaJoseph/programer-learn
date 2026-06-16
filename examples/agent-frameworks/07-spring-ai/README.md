# Spring AI + 百炼(Qwen) 示例

一个最小 Spring Boot 应用：注入 `ChatClient` + `@Tool` 工具 + `.entity()` 结构化输出，接阿里云百炼。

## 运行

```bash
export DASHSCOPE_API_KEY=sk-xxxxxxxx
mvn spring-boot:run
# 另开一个终端：
curl "http://localhost:8080/ask?q=北京今天天气怎么样"
# 预期返回类似：{"city":"北京","tempC":26,"desc":"晴"}
```

## 关键坑：base-url 不要带 /v1

`application.yml` 里 `spring.ai.openai.base-url` 写到 `.../compatible-mode` 为止。
Spring AI 的 OpenAI client 默认 `completions-path = /v1/chat/completions`，会自动拼上 `/v1`。
若你把 base-url 写成 `.../compatible-mode/v1`，最终会变成 `.../v1/v1/chat/completions` → 404。

替代写法：base-url 带 `/v1`，同时把 `spring.ai.openai.chat.completions-path` 改成 `/chat/completions`（二者取其一）。

## 进阶：用 Spring AI Alibaba 原生接百炼

国内生产可改用阿里官方的 [Spring AI Alibaba](https://github.com/alibaba/spring-ai-alibaba)
（`com.alibaba.cloud.ai:spring-ai-alibaba-starter-dashscope`），原生支持 Qwen 多模态、Embedding、
以及 Agent/Graph 编排，无 base-url 拼接坑：

```yaml
spring:
  ai:
    dashscope:
      api-key: ${AI_DASHSCOPE_API_KEY}
      chat:
        options:
          model: qwen-plus
```
