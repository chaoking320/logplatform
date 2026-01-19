package log.tsuperman.com.logplatform;

import log.tsuperman.com.logplatform.config.LogPlatformProperties;
import log.tsuperman.com.logplatform.entity.AppConfig;
import log.tsuperman.com.logplatform.service.ConfigService;
import org.apache.logging.log4j.util.Strings;
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
    
    @Autowired
    private ConfigService configService;
    
    // 定义日志时间戳的正则表达式
    private static final Pattern TIMESTAMP_PATTERN = Pattern.compile("(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2})");

    /**
     * 根据应用ID获取应用配置
     */
    private AppConfig getAppConfigById(String appId) {
        if (Strings.isEmpty(appId)) {
            return null;
        }
        return configService.getAppById(appId);
    }
    
    /**
     * 根据日期和关键字检索日志
     * @param date 格式 yyyy-MM-dd
     * @param keyword 搜索词
     * @param startTime 格式 HH:mm:ss
     * @param endTime 格式 HH:mm:ss
     * @param fileName 要查询的文件名（可选）
     * @param appId 应用ID（可选，如果不提供则使用默认配置）
     * @param logType 日志类型（info/error/all，可选，默认为all）
     *
     * 日志格式为：[task-center:172.28.243.190:30736] [,] 2026-01-08 14:06:00.714 INFO 6762 [xxl-job, JobThread-11-1767852360014] com.***.***.TroubleSubmitJob 具体日志信息
     */
    public List<String> queryLogs(String date, String keyword, String startTime, String endTime, String fileName, String appId, String logType) throws IOException {
        List<String> results = new ArrayList<>();

        String logPath;
        String logPrefix;
        
        // 根据应用ID获取相应配置，如果没有提供应用ID则使用默认配置
        if (!Strings.isEmpty(appId)) {
            AppConfig appConfig = getAppConfigById(appId);
            if (appConfig == null) {
                System.out.println("找不到应用配置: " + appId);
                return results;
            }
            logPath = appConfig.getLogPath();
            logPrefix = appConfig.getLogPrefix();
        } else {
            logPath = properties.getFullLogPath();
            logPrefix = properties.getLogPrefix();
        }

        // 获取当前日期
        String currentDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        
        // 1. 寻找匹配的文件：task-center-info.log (仅当天) 或 task-center-info.2026-01-14.*.log (历史日期)
        File logDir = new File(logPath);
        
        // 检查日志目录是否存在
        if (!logDir.exists() || !logDir.isDirectory()) {
            System.out.println("日志目录不存在或不是一个目录: " + logPath);
            return results;
        }
        
        File[] files = logDir.listFiles((dir, name) -> {
            // 如果指定了文件名，只查找该文件
            if (!Strings.isEmpty(fileName)) {
                return name.equals(fileName);
            }
            
            // 根据logType动态调整前缀匹配逻辑
            boolean isCurrentDayFile = false;
            boolean isHistoryFile = false;
            
            if (logType == null || logType.equalsIgnoreCase("all")) {
                // 查找所有类型：既包含原前缀，也包含对应的error前缀
                String basePrefix = logPrefix.replace("-info", ""); // 去掉-info后缀，得到基础前缀
                
                // 当天文件检查
                isCurrentDayFile = date.equals(currentDate) && 
                                 (name.equals(logPrefix + ".log") || 
                                  name.equals(basePrefix + "-error.log"));
                
                // 历史文件检查
                isHistoryFile = name.contains(date) && 
                              (name.startsWith(logPrefix) || name.startsWith(basePrefix + "-error")) && 
                              name.endsWith(".log");
                              
            } else if (logType.equalsIgnoreCase("info")) {
                // 只查找info类型
                isCurrentDayFile = date.equals(currentDate) && name.equals(logPrefix + ".log");
                isHistoryFile = name.contains(date) && name.startsWith(logPrefix) && name.endsWith(".log");
                
            } else if (logType.equalsIgnoreCase("error")) {
                // 查找error类型：将-info替换为-error
                String errorPrefix = logPrefix.replace("-info", "-error");
                isCurrentDayFile = date.equals(currentDate) && name.equals(errorPrefix + ".log");
                isHistoryFile = name.contains(date) && name.startsWith(errorPrefix) && name.endsWith(".log");
            }
            
            return isCurrentDayFile || isHistoryFile;
        });

        if (files == null || files.length == 0) {
            System.out.println("未找到匹配的日志文件，路径：" + logPath + "，日期：" + date + 
                              (!Strings.isEmpty(fileName) ? "，文件名：" + fileName : "") + 
                              (!Strings.isEmpty(appId) ? "，应用ID：" + appId : ""));
            // 尝试列出目录中的所有文件以帮助调试
            File[] allFiles = logDir.listFiles();
            if (allFiles != null) {
                System.out.println("目录中所有文件：" + Arrays.toString(allFiles) + 
                                  "，期望前缀：" + logPrefix);
            }
            return results;
        }

        // 2. 按文件名排序，确保日志顺序连贯
        Arrays.sort(files, (f1, f2) -> compareLogFileNames(f1, f2, logPrefix));

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
                        .limit(500) // 单个文件最多返回 5000 行，防止前端卡死
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
     * 重载方法，保留向后兼容性
     */
    public List<String> queryLogs(String date, String keyword, String startTime, String endTime) throws IOException {
        return queryLogs(date, keyword, startTime, endTime, null, null, "all");
    }
    
    /**
     * 重载方法，兼容文件名参数
     */
    public List<String> queryLogs(String date, String keyword, String startTime, String endTime, String fileName) throws IOException {
        return queryLogs(date, keyword, startTime, endTime, fileName, null, "all");
    }
    
    /**
     * 重载方法，兼容appId参数
     */
    public List<String> queryLogs(String date, String keyword, String startTime, String endTime, String fileName, String appId) throws IOException {
        return queryLogs(date, keyword, startTime, endTime, fileName, appId, "all");
    }
    
    /**
     * 获取指定日期下的日志文件列表及其时间范围
     * @param date 格式 yyyy-MM-dd
     * @param appId 应用ID（可选，如果不提供则使用默认配置）
     * @param logType 日志类型（可选，info/error/all）
     * @return 包含文件信息和时间范围的列表
     */
    public List<LogFileWithTimeRange> getDateLogFilesWithTimeRange(String date, String appId, String logType) {
        List<LogFileWithTimeRange> result = new ArrayList<>();
        String currentDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        String logPath;
        String logPrefix;
        
        // 根据应用ID获取相应配置，如果没有提供应用ID则使用默认配置
        if (!Strings.isEmpty(appId)) {
            AppConfig appConfig = getAppConfigById(appId);
            if (appConfig == null) {
                System.out.println("找不到应用配置: " + appId);
                return result;
            }
            logPath = appConfig.getLogPath();
            logPrefix = appConfig.getLogPrefix();
            System.out.println("使用应用配置 - 应用ID: " + appId + ", 日志路径: " + logPath + ", 日志前缀: " + logPrefix);
        } else {
            logPath = properties.getFullLogPath();
            logPrefix = properties.getLogPrefix();
            System.out.println("使用默认配置 - 日志路径: " + logPath + ", 日志前缀: " + logPrefix);
        }

        File logDir = new File(logPath);
        
        // 检查日志目录是否存在
        if (!logDir.exists() || !logDir.isDirectory()) {
            System.out.println("日志目录不存在或不是一个目录: " + logPath);
            return result;
        }

        System.out.println("查找日期 " + date + " 的日志文件，当前日期: " + currentDate + "，日志类型: " + logType);

        File[] files = logDir.listFiles((dir, name) -> {
            // 根据logType动态调整前缀匹配逻辑
            boolean matchesPrefix = false;
            boolean isCurrentDayFile = false;
            boolean isHistoryFile = false;
            
            if (logType == null || logType.equalsIgnoreCase("all")) {
                // 查找所有类型：既包含原前缀，也包含对应的error前缀
                String basePrefix = logPrefix.replace("-info", ""); // 去掉-info后缀，得到基础前缀
                
                // 当天文件检查
                isCurrentDayFile = date.equals(currentDate) && 
                                 (name.equals(logPrefix + ".log") || 
                                  name.equals(basePrefix + "-error.log"));
                
                // 历史文件检查
                isHistoryFile = name.contains(date) && 
                              (name.startsWith(logPrefix) || name.startsWith(basePrefix + "-error")) && 
                              name.endsWith(".log");
                              
            } else if (logType.equalsIgnoreCase("info")) {
                // 只查找info类型
                isCurrentDayFile = date.equals(currentDate) && name.equals(logPrefix + ".log");
                isHistoryFile = name.contains(date) && name.startsWith(logPrefix) && name.endsWith(".log");
                
            } else if (logType.equalsIgnoreCase("error")) {
                // 查找error类型：将-info替换为-error
                String errorPrefix = logPrefix.replace("-info", "-error");
                isCurrentDayFile = date.equals(currentDate) && name.equals(errorPrefix + ".log");
                isHistoryFile = name.contains(date) && name.startsWith(errorPrefix) && name.endsWith(".log");
            }
            
            boolean matches = isCurrentDayFile || isHistoryFile;
            
            System.out.println("检查文件: " + name + 
                             " - 日志类型: " + logType +
                             " - 是当天文件: " + isCurrentDayFile + 
                             " - 是历史文件: " + isHistoryFile +
                             " - 最终匹配: " + matches);
            
            return matches;
        });

        if (files == null || files.length == 0) {
            System.out.println("未找到匹配的日志文件，路径：" + logPath + "，日期：" + date);
            // 列出目录中的所有文件以帮助调试
            File[] allFiles = logDir.listFiles();
            if (allFiles != null) {
                System.out.println("目录中所有文件：");
                for (File f : allFiles) {
                    System.out.println("  - " + f.getName());
                }
                System.out.println("期望前缀：" + logPrefix);
            }
            return result;
        }

        System.out.println("找到 " + files.length + " 个匹配的文件");

        // 按文件名排序
        Arrays.sort(files, (f1, f2) -> compareLogFileNames(f1, f2, logPrefix));

        for (File file : files) {
            System.out.println("分析文件: " + file.getName());
            LogFileWithTimeRange fileInfo = analyzeFileTimeRange(file);
            if (fileInfo != null) {
                result.add(fileInfo);
                System.out.println("  - 添加文件信息: " + fileInfo.getFileName());
            } else {
                System.out.println("  - 文件分析失败");
            }
        }

        return result;
    }
    
    /**
     * 重载方法，保留向后兼容性
     */
    public List<LogFileWithTimeRange> getDateLogFilesWithTimeRange(String date, String appId) {
        return getDateLogFilesWithTimeRange(date, appId, null); // 默认不过滤类型
    }
    
    /**
     * 重载方法，保留向后兼容性
     */
    public List<LogFileWithTimeRange> getDateLogFilesWithTimeRange(String date) {
        return getDateLogFilesWithTimeRange(date, null, null);
    }
    
    /**
     * 分析单个文件的时间范围
     */
    private LogFileWithTimeRange analyzeFileTimeRange(File file) {
        LogFileWithTimeRange fileInfo = new LogFileWithTimeRange();
        fileInfo.setFileName(file.getName());
        
        String earliestTime = null;
        String latestTime = null;
        
        try (Stream<String> lines = Files.lines(file.toPath())) {
            for (String line : (Iterable<String>) lines::iterator) {
                Matcher matcher = TIMESTAMP_PATTERN.matcher(line);
                if (matcher.find()) {
                    String timestamp = matcher.group(1); // 格式：yyyy-MM-dd HH:mm:ss
                    
                    if (earliestTime == null || timestamp.compareTo(earliestTime) < 0) {
                        earliestTime = timestamp;
                    }
                    
                    if (latestTime == null || timestamp.compareTo(latestTime) > 0) {
                        latestTime = timestamp;
                    }
                }
            }
        } catch (IOException e) {
            System.err.println("读取文件失败: " + file.getAbsolutePath() + ", 错误: " + e.getMessage());
            return null;
        }
        
        fileInfo.setEarliestTime(earliestTime != null ? earliestTime : "未知");
        fileInfo.setLatestTime(latestTime != null ? latestTime : "未知");
        
        return fileInfo;
    }
    
    /**
     * 内部类，用于存储文件信息及其时间范围
     */
    public static class LogFileWithTimeRange {
        private String fileName;
        private String earliestTime;
        private String latestTime;
        
        // Getters and Setters
        public String getFileName() {
            return fileName;
        }
        
        public void setFileName(String fileName) {
            this.fileName = fileName;
        }
        
        public String getEarliestTime() {
            return earliestTime;
        }
        
        public void setEarliestTime(String earliestTime) {
            this.earliestTime = earliestTime;
        }
        
        public String getLatestTime() {
            return latestTime;
        }
        
        public void setLatestTime(String latestTime) {
            this.latestTime = latestTime;
        }
    }
    
    /**
     * 比较日志文件名称，按数字序号排序
     */
    private int compareLogFileNames(File f1, File f2, String logPrefix) {
        String name1 = f1.getName();
        String name2 = f2.getName();
        
        // 如果是当前活跃日志文件，排在最后
        if (name1.equals(logPrefix + ".log")) return 1;
        if (name2.equals(logPrefix + ".log")) return -1;
        
        // 提取日期和序号进行比较
        String[] parts1 = extractDateAndNumber(name1, logPrefix);
        String[] parts2 = extractDateAndNumber(name2, logPrefix);
        
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
     * 重载方法，保留向后兼容性
     */
    private int compareLogFileNames(File f1, File f2) {
        return compareLogFileNames(f1, f2, properties.getLogPrefix());
    }
    
    /**
     * 从日志文件名中提取日期和序号
     */
    private String[] extractDateAndNumber(String fileName, String logPrefix) {
        // 匹配 task-center-info.2026-01-08.1.log 这种格式
        String regex = logPrefix + "\\.([0-9]{4}-[0-9]{2}-[0-9]{2})\\.(\\d+)\\.log";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(regex);
        java.util.regex.Matcher matcher = pattern.matcher(fileName);
        
        if (matcher.matches()) {
            return new String[]{matcher.group(1), matcher.group(2)}; // [date, number]
        }
        
        return new String[]{"", "0"};
    }
    
    /**
     * 重载方法，保留向后兼容性
     */
    private String[] extractDateAndNumber(String fileName) {
        return extractDateAndNumber(fileName, properties.getLogPrefix());
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
     * @param appId 应用ID（可选，如果不提供则使用默认配置）
     */
    public Set<String> getAvailableDates(String appId) {
        Set<String> dates = new TreeSet<>();
        
        String logPath;
        String logPrefix;
        
        // 根据应用ID获取相应配置，如果没有提供应用ID则使用默认配置
        if (!Strings.isEmpty(appId)) {
            AppConfig appConfig = getAppConfigById(appId);
            if (appConfig == null) {
                System.out.println("找不到应用配置: " + appId);
                return dates;
            }
            logPath = appConfig.getLogPath();
            logPrefix = appConfig.getLogPrefix();
        } else {
            logPath = properties.getFullLogPath();
            logPrefix = properties.getLogPrefix();
        }
        
        File logDir = new File(logPath);
        
        if (!logDir.exists() || !logDir.isDirectory()) {
            System.out.println("日志目录不存在: " + logPath);
            return dates;
        }
        
        File[] files = logDir.listFiles((dir, name) -> 
            name.startsWith(logPrefix) && name.endsWith(".log")
        );
        
        if (files == null) return dates;
        
        Pattern datePattern = Pattern.compile(logPrefix + "\\.(\\d{4}-\\d{2}-\\d{2})(\\.\\d+)?\\.log");
        
        for (File file : files) {
            String fileName = file.getName();
            java.util.regex.Matcher matcher = datePattern.matcher(fileName);
            
            if (matcher.matches()) {
                dates.add(matcher.group(1)); // 提取日期部分
            } else if (fileName.equals(logPrefix + ".log")) {
                // 当前日志文件，添加今天日期
                dates.add(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            }
        }
        
        return dates;
    }
    
    /**
     * 重载方法，保留向后兼容性
     */
    public Set<String> getAvailableDates() {
        return getAvailableDates(null);
    }
}