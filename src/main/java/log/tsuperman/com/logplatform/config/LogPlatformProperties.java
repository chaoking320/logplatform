package log.tsuperman.com.logplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "log.platform")
public class LogPlatformProperties {

    /**
     * 日志根目录路径
     */
    private String logPath = "D:\\Workspace\\mine\\github\\logplatform\\src\\main\\java\\log\\tsuperman\\com\\logplatform\\data\\logs";

    /**
     * 应用名称，用于构建日志文件路径
     */
    private String appName = "task-center";

    /**
     * 日志文件前缀
     */
    private String logPrefix = "task-center-info";

    public String getLogPath() {
        return logPath;
    }

    public void setLogPath(String logPath) {
        this.logPath = logPath;
    }

    public String getAppName() {
        return appName;
    }

    public void setAppName(String appName) {
        this.appName = appName;
    }

    public String getLogPrefix() {
        return logPrefix;
    }

    public void setLogPrefix(String logPrefix) {
        this.logPrefix = logPrefix;
    }

    /**
     * 获取完整的日志目录路径
     */
    public String getFullLogPath() {
        if (!logPath.endsWith("/") && !logPath.endsWith("\\")) {
            logPath += "/";
        }
        return logPath + appName + "/";
    }
}