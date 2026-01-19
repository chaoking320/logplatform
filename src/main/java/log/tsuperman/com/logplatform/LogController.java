package log.tsuperman.com.logplatform;

import log.tsuperman.com.logplatform.entity.ServerConfig;
import log.tsuperman.com.logplatform.service.ConfigService;
import log.tsuperman.com.logplatform.service.RemoteLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*") // 开发阶段允许跨域，生产环境应配置具体的域名
public class LogController {

    @Autowired
    private LogService logService;

    @Autowired
    private ConfigService configService;

    @Autowired
    private RemoteLogService remoteLogService;

    /**
     * 查询日志（本地）
     * @param date 日期，格式：yyyy-MM-dd
     * @param keyword 搜索关键词
     * @param startTime 开始时间，格式：HH:mm
     * @param endTime 结束时间，格式：HH:mm
     * @param file 要查询的文件名（可选）
     * @param appId 应用ID（可选）
     * @return 日志列表
     */
    @GetMapping("/query")
    public ApiResponse<List<String>> queryLogs(
            @RequestParam String date,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "00:00") String startTime,
            @RequestParam(defaultValue = "23:59") String endTime,
            @RequestParam(required = false) String file,
            @RequestParam(required = false) String appId) {
        
        try {
            System.out.println("收到日志查询请求 - 日期: " + date + ", 关键词: " + keyword + 
                             ", 开始时间: " + startTime + ", 结束时间: " + endTime + 
                             ", 文件: " + file + ", 应用ID: " + appId);
            
            // 将时间格式从 HH:mm 转换为 HH:mm:ss
            String startTimeSec = startTime + ":00";
            String endTimeSec = endTime + ":59";
            
            List<String> logs = logService.queryLogs(date, keyword, startTimeSec, endTimeSec, file, appId);
            
            System.out.println("查询结果: 找到 " + logs.size() + " 条日志");
            
            return ApiResponse.success(logs);
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("查询日志失败: " + e.getMessage());
            return ApiResponse.error("查询日志失败: " + e.getMessage());
        }
    }

    /**
     * 查询远程服务器日志
     * @param serverId 服务器ID
     * @param date 日期，格式：yyyy-MM-dd
     * @param keyword 搜索关键词
     * @param startTime 开始时间，格式：HH:mm
     * @param endTime 结束时间，格式：HH:mm
     * @param file 要查询的文件名（可选）
     * @param appId 应用ID（可选）
     * @return 日志列表
     */
    @GetMapping("/remote/query")
    public ApiResponse<List<String>> queryRemoteLogs(
            @RequestParam String serverId,
            @RequestParam String date,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "00:00") String startTime,
            @RequestParam(defaultValue = "23:59") String endTime,
            @RequestParam(required = false) String file,
            @RequestParam(required = false) String appId) {
        
        try {
            ServerConfig server = configService.getServerById(serverId);
            if (server == null) {
                return ApiResponse.error("服务器不存在: " + serverId);
            }
            
            List<String> logs = remoteLogService.queryRemoteLogs(server, date, keyword, startTime, endTime, file);
            return ApiResponse.success(logs);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("查询远程日志失败: " + e.getMessage());
        }
    }

    /**
     * 获取可用的日期列表（本地）
     */
    @GetMapping("/dates")
    public ApiResponse<Set<String>> getAvailableDates(@RequestParam(required = false) String appId) {
        try {
            Set<String> dates = logService.getAvailableDates(appId);
            return ApiResponse.success(dates);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("获取日期列表失败: " + e.getMessage());
        }
    }

    /**
     * 获取远程服务器可用的日期列表
     */
    @GetMapping("/remote/dates")
    public ApiResponse<Set<String>> getRemoteAvailableDates(@RequestParam String serverId) {
        try {
            ServerConfig server = configService.getServerById(serverId);
            if (server == null) {
                return ApiResponse.error("服务器不存在: " + serverId);
            }
            
            Set<String> dates = remoteLogService.getRemoteAvailableDates(server);
            return ApiResponse.success(dates);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("获取远程日期列表失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取指定日期下的日志文件列表及其时间范围（本地）
     */
    @GetMapping("/files/{date}")
    public ApiResponse<List<LogService.LogFileWithTimeRange>> getDateLogFiles(
            @PathVariable String date,
            @RequestParam(required = false) String appId) {
        try {
            System.out.println("收到文件列表查询请求 - 日期: " + date + ", 应用ID: " + appId);
            
            List<LogService.LogFileWithTimeRange> files = logService.getDateLogFilesWithTimeRange(date, appId);
            
            System.out.println("文件列表查询结果: 找到 " + files.size() + " 个文件");
            for (LogService.LogFileWithTimeRange file : files) {
                System.out.println("  - 文件: " + file.getFileName() + 
                                 ", 最早时间: " + file.getEarliestTime() + 
                                 ", 最晚时间: " + file.getLatestTime());
            }
            
            return ApiResponse.success(files);
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("获取文件列表失败: " + e.getMessage());
            return ApiResponse.error("获取日期下的文件列表失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取远程服务器指定日期下的日志文件列表及其时间范围
     */
    @GetMapping("/remote/files/{date}")
    public ApiResponse<List<Object>> getRemoteDateLogFiles(
            @RequestParam String serverId,
            @PathVariable String date) {
        try {
            ServerConfig server = configService.getServerById(serverId);
            if (server == null) {
                return ApiResponse.error("服务器不存在: " + serverId);
            }

            List<Map<String, Object>> files = remoteLogService.getRemoteDateLogFiles(server, date);

            return ApiResponse.success((List<Object>) (List<?>) files);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("获取远程文件列表失败: " + e.getMessage());
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