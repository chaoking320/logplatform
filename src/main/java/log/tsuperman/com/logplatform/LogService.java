package log.tsuperman.com.logplatform;

import log.tsuperman.com.logplatform.config.LogPlatformProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.*;

/**
 * 日志服务类 - 提供日志查询功能
 *
 * @author Wang Chao
 * @date 2026/1/17
 */
@Service
public class LogService {

    @Autowired
    private LogPlatformProperties properties;
    
    // 定义日志时间戳的正则表达式
    private static final Pattern TIMESTAMP_PATTERN = Pattern.compile("(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})");

    /**
     * 根据日期和关键字检索日志
     * @param date 格式 yyyy-MM-dd
     * @param keyword 搜索词
     * @param startTime 格式 HH:mm:ss
     * @param endTime 格式 HH:mm:ss
     *
     * 日志格式为：[task-center:172.28.243.190:30736] [,] 2026-01-08 14:06:00.714 INFO 6762 [xxl-job, JobThread-11-1767852360014] com.***.***.TroubleSubmitJob 具体日志信息
     */
    public List<String> queryLogs(String date, String keyword, String startTime, String endTime) throws IOException {
        List<String> results = new ArrayList<>();

        // 获取当前日期
        String currentDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        
        // 1. 寻找匹配的文件：task-center-info.log (仅当天) 或 task-center-info.2026-01-14.*.log (历史日期)
        File logDir = new File(properties.getFullLogPath());
        File[] files = logDir.listFiles((dir, name) ->
                // 如果查询的是当天，则包含当前活动日志文件；否则只查找历史日志文件
                (date.equals(currentDate) && name.equals(properties.getLogPrefix() + ".log")) || 
                (name.contains(date) && name.startsWith(properties.getLogPrefix()) && name.endsWith(".log"))
        );

        if (files == null || files.length == 0) {
            System.out.println("未找到匹配的日志文件，路径：" + properties.getFullLogPath() + "，日期：" + date);
            return results;
        }

        // 2. 按文件名排序，确保日志顺序连贯
        Arrays.sort(files, this::compareLogFileNames);

        // 3. 逐个文件读取（使用 Files.lines 延迟读取，不占内存）
        for (File file : files) {
            System.out.println("正在处理日志文件: " + file.getName());
            try (Stream<String> lines = Files.lines(file.toPath())) {
                List<String> matched = lines
                        .filter(line -> {
                            // 时间段过滤
                            boolean timeMatch = isWithinTimeRange(line, startTime, endTime);
                            
                            // 关键字过滤
                            boolean kwMatch = keyword == null || keyword.isEmpty() || line.toLowerCase().contains(keyword.toLowerCase());
                            
                            return timeMatch && kwMatch;
                        })
                        .limit(2000) // 单个文件最多返回 2000 行，防止前端卡死
                        .collect(Collectors.toList());

                results.addAll(matched);
                if (results.size() >= 5000) break; // 总数限制
            } catch (IOException e) {
                System.err.println("读取文件失败: " + file.getAbsolutePath() + ", 错误: " + e.getMessage());
            }
        }
        
        System.out.println("总共找到 " + results.size() + " 条匹配的日志");
        return results;
    }
    
    /**
     * 比较日志文件名称，按数字序号排序
     */
    private int compareLogFileNames(File f1, File f2) {
        String name1 = f1.getName();
        String name2 = f2.getName();
        
        // 如果是当前活跃日志文件，排在最后
        if (name1.equals(properties.getLogPrefix() + ".log")) return 1;
        if (name2.equals(properties.getLogPrefix() + ".log")) return -1;
        
        // 提取日期和序号进行比较
        String[] parts1 = extractDateAndNumber(name1);
        String[] parts2 = extractDateAndNumber(name2);
        
        // 先比较日期
        int dateCompare = parts1[0].compareTo(parts2[0]);
        if (dateCompare != 0) return dateCompare;
        
        // 再比较序号
        try {
            int num1 = Integer.parseInt(parts1[1]);
            int num2 = Integer.parseInt(parts2[1]);
            return Integer.compare(num1, num2);
        } catch (NumberFormatException e) {
            return name1.compareTo(name2);
        }
    }
    
    /**
     * 从日志文件名中提取日期和序号
     */
    private String[] extractDateAndNumber(String fileName) {
        // 匹配 task-center-info.2026-01-08.1.log 这种格式
        String regex = properties.getLogPrefix() + "\\.([0-9]{4}-[0-9]{2}-[0-9]{2})\\.(\\d+)\\.log";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(regex);
        java.util.regex.Matcher matcher = pattern.matcher(fileName);
        
        if (matcher.matches()) {
            return new String[]{matcher.group(1), matcher.group(2)}; // [date, number]
        }
        
        return new String[]{"", "0"};
    }
    
    /**
     * 检查日志行是否在指定时间范围内
     */
    private boolean isWithinTimeRange(String line, String startTime, String endTime) {
        Matcher matcher = TIMESTAMP_PATTERN.matcher(line);
        if (matcher.find()) {
            String timestamp = matcher.group(1); // 格式：yyyy-MM-dd HH:mm:ss
            String logTime = timestamp.split(" ")[1]; // 取出 HH:mm:ss 部分
            
            // 比较时间
            return logTime.compareTo(startTime) >= 0 && logTime.compareTo(endTime) <= 0;
        }
        
        // 如果没有找到时间戳，根据参数判断是否包含
        return startTime.compareTo("00:00:00") <= 0 && endTime.compareTo("23:59:59") >= 0;
    }
    
    /**
     * 获取可用的日期列表
     */
    public Set<String> getAvailableDates() {
        Set<String> dates = new TreeSet<>();
        File logDir = new File(properties.getFullLogPath());
        
        if (!logDir.exists()) {
            System.out.println("日志目录不存在: " + properties.getFullLogPath());
            return dates;
        }
        
        File[] files = logDir.listFiles((dir, name) -> 
            name.startsWith(properties.getLogPrefix()) && name.endsWith(".log")
        );
        
        if (files == null) return dates;
        
        for (File file : files) {
            String fileName = file.getName();
            String[] parts = extractDateAndNumber(fileName);
            if (!parts[0].isEmpty()) {
                dates.add(parts[0]);
            } else if (fileName.equals(properties.getLogPrefix() + ".log")) {
                // 当前日志文件，添加今天日期
                dates.add(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            }
        }
        
        return dates;
    }
}