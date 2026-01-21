package log.tsuperman.com.logplatform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 静态资源映射，将所有静态文件请求指向classpath:/static/
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(3600); // 设置缓存时间
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 将根路径请求转发到index.html
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}