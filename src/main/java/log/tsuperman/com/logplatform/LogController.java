package log.tsuperman.com.logplatform;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*") // 开发阶段允许跨域，生产环境应配置具体的域名
public class LogController {

    @Autowired
    private LogService logService;

    /**
     * 查询日志
     * @param date 日期，格式：yyyy-MM-dd
     * @param keyword 搜索关键词
     * @param startTime 开始时间，格式：HH:mm
     * @param endTime 结束时间，格式：HH:mm
     * @return 日志列表
     */
    @GetMapping("/query")
    public ApiResponse<List<String>> queryLogs(
            @RequestParam String date,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "00:00") String startTime,
            @RequestParam(defaultValue = "23:59") String endTime) {
        
        try {
            // 将时间格式从 HH:mm 转换为 HH:mm:ss
            String startTimeSec = startTime + ":00";
            String endTimeSec = endTime + ":59";
            
            List<String> logs = logService.queryLogs(date, keyword, startTimeSec, endTimeSec);
            return ApiResponse.success(logs);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("查询日志失败: " + e.getMessage());
        }
    }

    /**
     * 获取可用的日期列表
     */
    @GetMapping("/dates")
    public ApiResponse<Set<String>> getAvailableDates() {
        try {
            Set<String> dates = logService.getAvailableDates();
            return ApiResponse.success(dates);
        } catch (Exception e) {
            e.printStackTrace();
            return ApiResponse.error("获取日期列表失败: " + e.getMessage());
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