# 日志查看平台 (Log Platform)

## 系统概述

这是一个基于Spring Boot和React的日志查看系统，用于远程查看Linux服务器上的日志文件，无需登录跳板机。系统支持按日期、时间段、关键词查询日志，以及实时查看日志内容。

## 功能特性

- **远程日志访问**：无需登录跳板机，直接通过Web界面查看服务器日志
- **多维度查询**：支持按日期、时间段、关键词查询日志
- **日志文件管理**：自动识别并处理多个日志文件（如 task-center-info.2026-01-08.1.log）
- **实时搜索**：快速搜索和过滤大量日志数据
- **可视化界面**：现代化的UI界面，支持日志级别颜色标识、JSON格式化等

## 技术架构

### 后端技术栈
- Spring Boot 3.2.1
- Java 17
- Maven

### 前端技术栈
- React (通过CDN引入)
- TailwindCSS
- HTML/JavaScript

## 文件结构

```
src/
├── main/
│   ├── java/
│   │   └── log/tsuperman/com/logplatform/
│   │       ├── LogplatformApplication.java    # 应用主入口
│   │       ├── LogService.java               # 日志服务类
│   │       ├── LogController.java            # API控制器
│   │       └── config/
│   │           └── LogPlatformProperties.java # 配置属性类
│   └── resources/
│       ├── application.properties            # 应用配置
│       └── static/
│           └── index.html                   # 前端页面
└── test/
    └── java/
        └── log/tsuperman/com/logplatform/
            └── LogplatformApplicationTests.java
```

## API 接口

### 1. 查询日志
- **URL**: `/api/logs/query`
- **方法**: GET
- **参数**:
  - `date`: 日期，格式：yyyy-MM-dd (必填)
  - `keyword`: 搜索关键词 (可选)
  - `startTime`: 开始时间，格式：HH:mm (默认: 00:00)
  - `endTime`: 结束时间，格式：HH:mm (默认: 23:59)
- **返回**: JSON格式的日志列表

### 2. 获取可用日期
- **URL**: `/api/logs/dates`
- **方法**: GET
- **返回**: 可用的日期列表

## 配置说明

### 应用配置 (application.properties)
```properties
# 服务器端口
server.port=8080

# 日志平台配置
log.platform.log-path=/data/logs/          # 日志根目录
log.platform.app-name=task-center          # 应用名称
log.platform.log-prefix=task-center-info   # 日志文件前缀
```

## 部署说明

### 1. 环境准备
- Java 17+
- Maven 3.6+

### 2. 构建项目
```bash
mvn clean package
```

### 3. 运行应用
```bash
java -jar target/logplatform-0.0.1-SNAPSHOT.jar
```

### 4. 访问应用
启动后访问 `http://localhost:8080`

## 使用说明

1. **配置日志路径**：修改 `application.properties` 中的 `log.platform.log-path` 为实际的日志存储路径
2. **启动应用**：运行应用后，前端界面会自动加载可用的日期列表
3. **选择日期**：在左侧选择要查看的日志日期
4. **设置时间范围**：设置开始和结束时间来过滤日志
5. **搜索关键词**：在搜索框输入关键词过滤日志内容
6. **查看详细信息**：点击日志行展开查看详细信息

## 支持的日志文件格式

系统支持以下日志文件命名格式：
- `task-center-info.log` - 当前活跃日志文件
- `task-center-info.2026-01-08.1.log` - 按日期分割的历史日志文件
- `task-center-info.2026-01-08.2.log` - 同一天的多个分片文件

## 日志解析格式

系统按照以下格式解析日志行：
```
[task-center:172.28.243.190:30736] [,] 2026-01-08 14:02:00.894 INFO 6762 [xxl-job, JobThread-11-1767852120013] com.central.apps.job.TroubleSubmitJob 最终的结果是：null,位置描述为：拉晶事业部/青海拉晶/二期切方硅料车间/开方/14#高测开方机
```

解析出的字段：
- 节点信息: `[task-center:172.28.243.190:30736]`
- Trace ID: `[,]`
- 时间戳: `2026-01-08 14:02:00.894`
- 日志级别: `INFO`
- 进程ID: `6762`
- 线程名: `[xxl-job, JobThread-11-1767852120013]`
- 类名: `com.central.apps.job.TroubleSubmitJob`
- 消息内容: `最终的结果是：null...`

## 安全注意事项

1. **访问控制**：在生产环境中应添加身份验证和授权机制
2. **路径安全**：确保日志路径配置正确，避免路径遍历攻击
3. **资源限制**：系统已内置日志数量限制，防止单次查询返回过多数据

## 扩展性

- **多应用支持**：可通过配置不同应用名称来支持多个应用的日志查看
- **日志格式适配**：可根据实际日志格式调整解析正则表达式
- **性能优化**：支持大文件的流式读取，避免内存溢出