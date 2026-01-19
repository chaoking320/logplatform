package log.tsuperman.com.logplatform.service;

import log.tsuperman.com.logplatform.entity.ServerConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class RemoteLogService {
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 查询远程服务器上的日志
     */
    public List<String> queryRemoteLogs(ServerConfig server, String date, String keyword, String startTime, String endTime, String file) {
//        String baseUrl = String.format("http://%s:%d/api/logs/query", server.getHost(), server.getPort());
        String baseUrl = String.format("http://%s/logapi/api/logs/query", server.getHost());

        String url = String.format("%s?date=%s&startTime=%s&endTime=%s", baseUrl, date, startTime, endTime);
        
        if (keyword != null && !keyword.isEmpty()) {
            url += "&keyword=" + keyword;
        }
        
        if (file != null && !file.isEmpty()) {
            url += "&file=" + file;
        }

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null && (Boolean)responseBody.get("success")) {
                return (List<String>)responseBody.get("data");
            } else {
                System.err.println("远程查询失败: " + (responseBody != null ? responseBody.get("message") : "未知错误"));
                return new ArrayList<>(); // 返回空列表
            }
        } catch (Exception e) {
            System.err.println("调用远程服务失败: " + e.getMessage());
            return new ArrayList<>(); // 返回空列表
        }
    }

    /**
     * 获取远程服务器上的可用日期列表
     */
    public Set<String> getRemoteAvailableDates(ServerConfig server) {
//        String url = String.format("http://%s:%d/api/logs/dates", server.getHost(), server.getPort());
        String url = String.format("http://172.28.242.22/logapi/api/logs/dates");
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null && (Boolean)responseBody.get("success")) {
                return (Set<String>)responseBody.get("data");
            } else {
                System.err.println("获取远程日期列表失败: " + (responseBody != null ? responseBody.get("message") : "未知错误"));
                return new HashSet<>(); // 返回空集合
            }
        } catch (Exception e) {
            System.err.println("调用远程服务失败: " + e.getMessage());
            return new HashSet<>(); // 返回空集合
        }
    }

    /**
     * 获取远程服务器上指定日期的日志文件列表
     */
    public List<Map<String, Object>> getRemoteDateLogFiles(ServerConfig server, String date) {
//        String url = String.format("http://%s:%d/api/logs/files/%s", server.getHost(), server.getPort(), date);
        String url = String.format("http://172.28.242.22/logapi/api/logs/files/%s", date);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null && (Boolean)responseBody.get("success")) {
                return (List<Map<String, Object>>)responseBody.get("data");
            } else {
                System.err.println("获取远程日志文件列表失败: " + (responseBody != null ? responseBody.get("message") : "未知错误"));
                return new ArrayList<>(); // 返回空列表
            }
        } catch (Exception e) {
            System.err.println("调用远程服务失败: " + e.getMessage());
            return new ArrayList<>(); // 返回空列表
        }
    }
}