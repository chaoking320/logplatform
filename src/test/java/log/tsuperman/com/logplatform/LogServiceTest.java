package log.tsuperman.com.logplatform;

import log.tsuperman.com.logplatform.config.LogPlatformProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
public class LogServiceTest {

    @Mock
    private LogPlatformProperties properties;

    @InjectMocks
    private LogService logService;

    private String testLogDir;

    @BeforeEach
    void setUp() throws IOException {
        MockitoAnnotations.openMocks(this);
        
        // 创建临时测试目录
        testLogDir = System.getProperty("java.io.tmpdir") + "/test-logs";
        new File(testLogDir).mkdirs();
        
        // 配置mock属性
        when(properties.getFullLogPath()).thenReturn(testLogDir);
        when(properties.getLogPrefix()).thenReturn("task-center-info");
    }

    @Test
    void testQueryLogs() throws IOException {
        // 创建测试日志文件
        String logFileName = "task-center-info.2026-01-17.1.log";
        File logFile = new File(testLogDir, logFileName);
        try (FileWriter writer = new FileWriter(logFile)) {
            writer.write("[task-center:172.28.243.190:30736] [,] 2026-01-17 10:30:00.123 INFO 6762 [main] com.example.TestClass Test message 1\n");
            writer.write("[task-center:172.28.243.190:30736] [,] 2026-01-17 11:45:00.456 ERROR 6762 [worker-1] com.example.TestClass Test message 2\n");
            writer.write("[task-center:172.28.243.190:30736] [,] 2026-01-17 12:15:00.789 WARN 6762 [worker-2] com.example.TestClass Test message 3\n");
        }

        // 测试查询功能
        List<String> results = logService.queryLogs("2026-01-17", "Test", "00:00:00", "23:59:59");
        
        assertNotNull(results);
        assertEquals(3, results.size());
        
        // 清理测试文件
        logFile.delete();
    }

    @Test
    void testQueryLogsWithKeywordFilter() throws IOException {
        // 创建测试日志文件
        String logFileName = "task-center-info.2026-01-17.1.log";
        File logFile = new File(testLogDir, logFileName);
        try (FileWriter writer = new FileWriter(logFile)) {
            writer.write("[task-center:172.28.243.190:30736] [,] 2026-01-17 10:30:00.123 INFO 6762 [main] com.example.TestClass Error message\n");
            writer.write("[task-center:172.28.243.190:30736] [,] 2026-01-17 11:45:00.456 ERROR 6762 [worker-1] com.example.TestClass Test message\n");
            writer.write("[task-center:172.28.243.190:30736] [,] 2026-01-17 12:15:00.789 WARN 6762 [worker-2] com.example.TestClass Info message\n");
        }

        // 测试关键词过滤
        List<String> results = logService.queryLogs("2026-01-17", "Error", "00:00:00", "23:59:59");
        
        assertNotNull(results);
        assertEquals(1, results.size());
        assertTrue(results.get(0).toLowerCase().contains("error"));
        
        // 清理测试文件
        logFile.delete();
    }
}