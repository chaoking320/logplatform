package log.tsuperman.com.logplatform;

/**
 * TODO: Description of the class
 *
 * @author Wang Chao
 * @date 2026/1/17
 */
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

@Service
public class LogService {

    // 假设日志存储路径
    private static final String LOG_PATH = "/data/logs/task-center/";
    private static final String LOG_PREFIX = "task-center-info";

    /**
     * 根据日期和关键字检索日志
     * @param date 格式 yyyy-MM-dd
     * @param keyword 搜索词
     * @param startTime 格式 HH:mm:ss
     * @param endTime 格式 HH:mm:ss
     */
    public List<String> queryLogs(String date, String keyword, String startTime, String endTime) throws IOException {
        List<String> results = new ArrayList<>();

        // 1. 寻找匹配的文件：task-center-info.log (当天) 或 task-center-info.2026-01-14.*.log
        File logDir = new File(LOG_PATH);
        File[] files = logDir.listFiles((dir, name) ->
                name.equals(LOG_PREFIX + ".log") || (name.contains(date) && name.startsWith(LOG_PREFIX))
        );

        if (files == null || files.length == 0) return results;

        // 2. 按文件名末尾数字排序，确保日志顺序连贯
        Arrays.sort(files, (f1, f2) -> {
            if (f1.getName().endsWith(".log")) return 1; // 正在写的排在最后
            return f1.getName().compareTo(f2.getName());
        });

        // 3. 逐个文件读取（使用 Files.lines 延迟读取，不占内存）
        for (File file : files) {
            try (Stream<String> lines = Files.lines(file.toPath())) {
                List<String> matched = lines
                        .filter(line -> {
                            // 时间段初步过滤 (假设每行开始是 [task-center...])
                            // 实际解析时建议提取 2026-01-14 14:02:00 部分进行比较
                            boolean timeMatch = true;
                            if (line.length() > 50) {
                                String logTime = line.substring(41, 49); // 截取 HH:mm:ss
                                timeMatch = logTime.compareTo(startTime) >= 0 && logTime.compareTo(endTime) <= 0;
                            }
                            // 关键字过滤
                            boolean kwMatch = keyword == null || keyword.isEmpty() || line.contains(keyword);
                            return timeMatch && kwMatch;
                        })
                        .limit(2000) // 单个文件最多返回 2000 行，防止前端卡死
                        .collect(Collectors.toList());

                results.addAll(matched);
                if (results.size() >= 5000) break; // 总数限制
            }
        }
        return results;
    }
}
