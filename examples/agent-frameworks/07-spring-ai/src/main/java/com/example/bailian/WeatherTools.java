package com.example.bailian;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

// 用 @Tool 把一个普通方法声明成可被模型调用的工具。
// 方法签名 + 注解描述会自动生成给模型看的工具 schema。
@Component
public class WeatherTools {

    @Tool(description = "查询某个城市的当前天气")
    public WeatherInfo getWeather(@ToolParam(description = "城市名，例如 北京") String city) {
        // 示例数据：真实项目这里会调用气象 API。
        return new WeatherInfo(city, 26, "晴");
    }
}
