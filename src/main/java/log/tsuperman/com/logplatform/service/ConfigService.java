package log.tsuperman.com.logplatform.service;

import jakarta.annotation.PostConstruct;
import log.tsuperman.com.logplatform.entity.AppConfig;
import log.tsuperman.com.logplatform.entity.ServerConfig;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ConfigService {
    // 模拟数据库存储，实际应用中应使用数据库
    private ConcurrentHashMap<String, ServerConfig> serverConfigs = new ConcurrentHashMap<>();
    private ConcurrentHashMap<String, AppConfig> appConfigs = new ConcurrentHashMap<>();
    private int serverCounter = 1;
    private int appCounter = 1;

    @PostConstruct
    public void initDefaultConfig() {
        // 初始化一些默认配置作为示例
        ServerConfig defaultServer = new ServerConfig(
            "server-" + serverCounter++,
            "Localhost",
            "localhost",
            8080,
            "本地开发服务器"
        );
        serverConfigs.put(defaultServer.getId(), defaultServer);

        AppConfig defaultApp = new AppConfig(
            "app-" + appCounter++,
            "Task Center",
            "/data/logs/task-center",
            "task-center-info",
            defaultServer.getId()
        );
        appConfigs.put(defaultApp.getId(), defaultApp);
    }

    // 服务器配置相关方法
    public List<ServerConfig> getAllServers() {
        return new ArrayList<>(serverConfigs.values());
    }

    public ServerConfig getServerById(String id) {
        return serverConfigs.get(id);
    }

    public ServerConfig addServer(ServerConfig serverConfig) {
        if (serverConfig.getId() == null || serverConfig.getId().isEmpty()) {
            serverConfig.setId("server-" + serverCounter++);
        }
        serverConfigs.put(serverConfig.getId(), serverConfig);
        return serverConfig;
    }

    public ServerConfig updateServer(String id, ServerConfig serverConfig) {
        if (serverConfigs.containsKey(id)) {
            serverConfig.setId(id);
            serverConfigs.put(id, serverConfig);
            return serverConfig;
        }
        return null;
    }

    public boolean deleteServer(String id) {
        // 删除服务器时同时删除其关联的应用
        List<String> appIdsToDelete = appConfigs.values().stream()
            .filter(app -> app.getServerId().equals(id))
            .map(AppConfig::getId)
            .collect(Collectors.toList());
        
        appIdsToDelete.forEach(appId -> appConfigs.remove(appId));
        return serverConfigs.remove(id) != null;
    }

    // 应用配置相关方法
    public List<AppConfig> getAllApps() {
        return new ArrayList<>(appConfigs.values());
    }

    public List<AppConfig> getAppsByServerId(String serverId) {
        return appConfigs.values().stream()
            .filter(app -> app.getServerId().equals(serverId))
            .collect(Collectors.toList());
    }

    public AppConfig getAppById(String id) {
        return appConfigs.get(id);
    }

    public AppConfig addApp(AppConfig appConfig) {
        if (appConfig.getId() == null || appConfig.getId().isEmpty()) {
            appConfig.setId("app-" + appCounter++);
        }
        appConfigs.put(appConfig.getId(), appConfig);
        return appConfig;
    }

    public AppConfig updateApp(String id, AppConfig appConfig) {
        if (appConfigs.containsKey(id)) {
            appConfig.setId(id);
            appConfigs.put(id, appConfig);
            return appConfig;
        }
        return null;
    }

    public boolean deleteApp(String id) {
        return appConfigs.remove(id) != null;
    }
}