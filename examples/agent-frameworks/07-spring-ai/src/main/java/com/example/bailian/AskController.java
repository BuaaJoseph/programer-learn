package com.example.bailian;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// 一个 REST 接口，把 Spring AI 的三大特色一锅端：
// 依赖注入 ChatClient + @Tool 工具调用 + .entity() 结构化输出。
@RestController
public class AskController {

    private final ChatClient chat;

    // ChatClient.Builder 由 starter 自动装配；defaultTools 注册工具对象。
    public AskController(ChatClient.Builder builder, WeatherTools tools) {
        this.chat = builder.defaultTools(tools).build();
    }

    // 例：GET /ask?q=北京今天天气怎么样
    // 模型会自动调用 getWeather 工具，再把结果映射成 WeatherInfo 返回 JSON。
    @GetMapping("/ask")
    public WeatherInfo ask(@RequestParam String q) {
        return chat.prompt()
                .user(q)
                .call()
                .entity(WeatherInfo.class);
    }
}
