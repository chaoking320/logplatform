package log.tsuperman.com.logplatform.service;

import log.tsuperman.com.logplatform.entity.AppConfig;
import log.tsuperman.com.logplatform.entity.ServerConfig;
import log.tsuperman.com.logplatform.config.LogPlatformProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ConfigService {
    @Autowired
    private LogPlatformProperties logPlatformProperties;
    
    private ConcurrentHashMap<String, ServerConfig> serverConfigs = new ConcurrentHashMap<>();
    private ConcurrentHashMap<String, AppConfig> appConfigs = new ConcurrentHashMap<>();
    private int serverCounter = 1;
    private int appCounter = 1;

    @PostConstruct
    public void initDefaultConfig() {
        // 从配置文件加载服务器和应用配置
        if (logPlatformProperties.getServers() != null) {
            for (ServerConfig server : logPlatformProperties.getServers()) {
                serverConfigs.put(server.getId(), server);
                // 更新计数器以确保ID唯一性
                if (server.getId().contains("server-")) {
                    int idNum = Integer.parseInt(server.getId().replace("server-", ""));
                    if (idNum >= serverCounter) {
                        serverCounter = idNum + 1;
                    }
                }
            }
        }
        
        if (logPlatformProperties.getApps() != null) {
            for (AppConfig app : logPlatformProperties.getApps()) {
                appConfigs.put(app.getId(), app);
                // 更新计数器以确保ID唯一性
                if (app.getId().contains("app-")) {
                    int idNum = Integer.parseInt(app.getId().replace("app-", ""));
                    if (idNum >= appCounter) {
                        appCounter = idNum + 1;
                    }
                }
            }
        }
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