package log.tsuperman.com.logplatform.entity;

public class AppConfig {
    private String id;
    private String name;
    private String logPath;
    private String logPrefix;
    private String serverId; // 关联服务器ID

    public AppConfig() {}

    public AppConfig(String id, String name, String logPath, String logPrefix, String serverId) {
        this.id = id;
        this.name = name;
        this.logPath = logPath;
        this.logPrefix = logPrefix;
        this.serverId = serverId;
    }

    // getter和setter方法
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLogPath() {
        return logPath;
    }

    public void setLogPath(String logPath) {
        this.logPath = logPath;
    }

    public String getLogPrefix() {
        return logPrefix;
    }

    public void setLogPrefix(String logPrefix) {
        this.logPrefix = logPrefix;
    }

    public String getServerId() {
        return serverId;
    }

    public void setServerId(String serverId) {
        this.serverId = serverId;
    }
}