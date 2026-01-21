package log.tsuperman.com.logplatform.config;

import log.tsuperman.com.logplatform.entity.AppConfig;
import log.tsuperman.com.logplatform.entity.ServerConfig;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "log.platform")
public class LogPlatformProperties {

    /**
     * 本地日志根目录路径
     */
    private String logPath = "D:\\Workspace\\mine\\github\\logplatform\\src\\main\\java\\log\\tsuperman\\com\\logplatform\\data\\logs";

    /**
     * 本地应用名称，用于构建日志文件路径
     */
    private String appName = "task-center";

    /**
     * 本地日志文件前缀
     */
    private String logPrefix = "task-center-info";
    
    /**
     * 服务器配置列表
     */
    private List<ServerConfig> servers;
    
    /**
     * 应用配置列表
     */
    private List<AppConfig> apps;

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

    public List<ServerConfig> getServers() {
        return servers;
    }

    public void setServers(List<ServerConfig> servers) {
        this.servers = servers;
    }

    public List<AppConfig> getApps() {
        return apps;
    }

    public void setApps(List<AppConfig> apps) {
        this.apps = apps;
    }

    /**
     * 获取完整的日志目录路径
     */
    public String getFullLogPath() {
        return logPath + "/" + appName;
    }
    
    /**
     * 获取服务器的完整URL（包括虚拟路径，如果有）
     */
    public String getServerUrl(ServerConfig server) {
        StringBuilder url = new StringBuilder();
        url.append("http://").append(server.getHost());
        // 如果服务器配置了虚拟路径，则不添加端口号（假定通过反向代理访问）
        if (server.getVirtual() != null && !server.getVirtual().isEmpty()) {
            url.append("/").append(server.getVirtual());
        } else {
            // 如果没有虚拟路径，则添加端口号
            url.append(":").append(server.getPort());
        }
        return url.toString();
    }
}