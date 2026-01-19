package log.tsuperman.com.logplatform.Controller;

import log.tsuperman.com.logplatform.config.LogPlatformProperties;
import log.tsuperman.com.logplatform.entity.AppConfig;
import log.tsuperman.com.logplatform.entity.ServerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*")
public class ConfigController {

    @Autowired
    private LogPlatformProperties logPlatformProperties;

    // 服务器配置相关API
    @GetMapping("/servers")
    public ApiResponse<List<ServerConfig>> getServers() {
        try {
            List<ServerConfig> servers = logPlatformProperties.getServers();
            return ApiResponse.success(servers);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("获取服务器列表失败: " + e.getMessage());
        }
    }

    // 获取指定服务器下的应用列表
    @GetMapping("/apps/server/{serverId}")
    public ApiResponse<List<AppConfig>> getAppsByServer(@PathVariable String serverId) {
        try {
            List<AppConfig> allApps = logPlatformProperties.getApps();
            List<AppConfig> serverApps = allApps.stream()
                .filter(app -> app.getServerId().equals(serverId))
                .collect(Collectors.toList());
            return ApiResponse.success(serverApps);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("获取服务器应用列表失败: " + e.getMessage());
        }
    }


    /**
     * 统一响应格式
     */
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;

        public static <T> ApiResponse<T> success(T data) {
            ApiResponse<T> response = new ApiResponse<>();
            response.success = true;
            response.data = data;
            response.message = "success";
            return response;
        }

        public static <T> ApiResponse<T> error(String message) {
            ApiResponse<T> response = new ApiResponse<>();
            response.success = false;
            response.message = message;
            return response;
        }

        // getters and setters
        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public T getData() {
            return data;
        }

        public void setData(T data) {
            this.data = data;
        }
    }
}