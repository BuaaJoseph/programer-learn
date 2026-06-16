package com.example.bailian;

// 结构化输出的目标类型：ChatClient 可以把模型回答直接映射成这个 record。
public record WeatherInfo(String city, int tempC, String desc) {
}
