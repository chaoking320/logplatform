package log.tsuperman.com.logplatform.entity;

public class ServerConfig {
    private String id;
    private String name;
    private String host;
    private int port;
    private String description;

    public ServerConfig() {}

    public ServerConfig(String id, String name, String host, int port, String description) {
        this.id = id;
        this.name = name;
        this.host = host;
        this.port = port;
        this.description = description;
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

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}