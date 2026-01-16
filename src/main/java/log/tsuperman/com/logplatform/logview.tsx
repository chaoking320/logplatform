import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Search, Calendar, Clock, FileText, ChevronRight,
    Download, RefreshCw, Terminal, AlertCircle,
    CheckCircle2, Info, Server, Code, Copy, ChevronDown
} from 'lucide-react';

// --- 日志行解析器 ---
// 针对：[task-center:172.28.243.190:30736] [,] 2026-01-08 14:02:00.894 INFO 6762 [xxl-job...]
const parseLogLine = (raw, id) => {
    const regex = /^\[(.*?)] \[(.*?)] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) (\w+) (\d+) \[(.*?)] (.*?) (.*)$/;
    const match = raw.match(regex);
    if (match) {
        return {
            id,
            node: match[1],
            traceId: match[2],
            time: match[3],
            level: match[4],
            pid: match[5],
            thread: match[6],
            className: match[7],
            msg: match[8],
            raw
        };
    }
    return { id, raw, time: "Unknown", level: "OTHER", msg: raw };
};

const App = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState("2026-01-08");
    const [startTime, setStartTime] = useState("14:00");
    const [endTime, setEndTime] = useState("15:00");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLevel, setFilterLevel] = useState("ALL");
    const [expandedLog, setExpandedLog] = useState(null);
    const scrollRef = useRef(null);

    // 模拟加载逻辑
    const fetchLogs = () => {
        setIsLoading(true);
        // 模拟后端接口请求
        setTimeout(() => {
            const mockRaw = [
                `[task-center:172.28.243.190:30736] [,] 2026-01-08 14:02:00.894 INFO 6762 [xxl-job, JobThread-11-1767852120013] com.central.apps.job.TroubleSubmitJob 最终的结果是：null,位置描述为：拉晶事业部/青海拉晶/二期切方硅料车间/开方/14#高测开方机`,
                `[task-center:172.28.243.190:30736] [,] 2026-01-08 14:02:00.898 INFO 6762 [xxl-job, JobThread-11-1767852120013] com.central.apps.job.TroubleSubmitJob [故障提报单定时任务]计算超时时间,单据id：TB0098165`,
                `[task-center:172.28.243.190:30736] [,] 2026-01-08 14:02:00.899 INFO 6762 [xxl-job, JobThread-11-1767852120013] com.central.apps.job.TroubleSubmitJob 故障提报单查出来的结果再转为JSON是:{"divisionCode":"1000058","regionleader":"R0794","devicemanager":"R0786","deviceleader":"R0785","DESCRIPTION":"31#一体机"}`,
                `[task-center:172.28.243.190:30736] [,] 2026-01-08 14:05:12.123 ERROR 6762 [main] com.central.apps.service.TaskHandler 数据库连接超时: java.net.ConnectException: Connection refused`,
                `[task-center:172.28.243.190:30736] [,] 2026-01-08 14:10:45.001 WARN 6762 [http-exec-5] com.central.apps.controller.ApiGate 检测到慢接口调用: /api/task/submit (耗时: 1560ms)`
            ];

            const parsed = [];
            for(let i=0; i<60; i++) {
                parsed.push(parseLogLine(mockRaw[i % mockRaw.length], i));
            }
            setLogs(parsed);
            setIsLoading(false);
        }, 600);
    };

    useEffect(() => {
        fetchLogs();
    }, [selectedDate]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchLevel = filterLevel === "ALL" || log.level === filterLevel;
            const matchQuery = log.raw.toLowerCase().includes(searchQuery.toLowerCase());
            const logHourMin = log.time.includes(' ') ? log.time.split(' ')[1].substring(0, 5) : "00:00";
            const matchTime = logHourMin >= startTime && logHourMin <= endTime;
            return matchLevel && matchQuery && matchTime;
        });
    }, [logs, filterLevel, searchQuery, startTime, endTime]);

    const tryFormatJson = (text) => {
        try {
            const jsonMatch = text.match(/\{.*\}|\[.*\]/);
            if (jsonMatch) {
                const obj = JSON.parse(jsonMatch[0]);
                return JSON.stringify(obj, null, 2);
            }
        } catch (e) { return null; }
        return null;
    };

    return (
        <div className="flex h-screen bg-[#0d1117] text-slate-300 font-sans overflow-hidden">
            {/* 侧边栏 */}
            <div className="w-72 bg-[#161b22] border-r border-slate-800 flex flex-col shadow-xl">
                <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-[#0d1117]/50">
                    <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                        <Terminal size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white tracking-tight">Log Insight</h1>
                        <p className="text-[10px] text-slate-500 font-mono uppercase">Production v2.4</p>
                    </div>
                </div>

                <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Calendar size={14} /> 检索日期
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Clock size={14} /> 时间范围
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="bg-[#0d1117] border border-slate-700 rounded-lg p-2 text-xs" />
                            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} className="bg-[#0d1117] border border-slate-700 rounded-lg p-2 text-xs" />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-3 block">文件分片检索</label>
                        <div className="space-y-2">
                            {['Current', 'Part 3', 'Part 2', 'Part 1'].map((name, i) => (
                                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${i===0 ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' : 'bg-slate-800/20 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} />
                                        <span className="text-xs font-medium">{i===0 ? 'task-center-info.log' : `...${selectedDate}.${4-i}.log`}</span>
                                    </div>
                                    {i===0 && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-indigo-600/5 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 size={16} />
                        </div>
                        <div className="text-[11px]">
                            <p className="text-slate-300 font-bold">集群状态正常</p>
                            <p className="text-slate-500">已连接 3 个采集节点</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 主工作区 */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* 顶部工具栏 */}
                <div className="h-16 bg-[#161b22]/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-6 z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-lg">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="在此输入搜索关键词 (支持 Regex)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>

                        <div className="h-8 w-px bg-slate-800"></div>

                        <div className="flex gap-1 bg-[#0d1117] p-1 rounded-lg border border-slate-800">
                            {["ALL", "INFO", "WARN", "ERROR"].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => setFilterLevel(lvl)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${filterLevel === lvl ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={fetchLogs} className="p-2.5 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors">
                            <RefreshCw size={18} className={isLoading ? "animate-spin text-indigo-400" : ""} />
                        </button>
                        <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                            <Download size={16} /> 导出日志
                        </button>
                    </div>
                </div>

                {/* 日志视图 */}
                <div className="flex-1 overflow-hidden flex flex-col bg-[#0d1117]">
                    <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[13px] scrollbar-thin scrollbar-thumb-slate-800" ref={scrollRef}>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <div key={log.id} className="group border-b border-slate-900/50 last:border-0">
                                    <div
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        className={`flex items-start gap-4 p-2 rounded-md transition-all cursor-pointer hover:bg-slate-800/30 ${expandedLog === log.id ? 'bg-slate-800/50' : ''}`}
                                    >
                                        <span className="text-slate-700 shrink-0 w-8 text-right select-none">{log.id + 1}</span>
                                        <span className="text-slate-500 shrink-0 select-none">{log.time?.split(' ')[1] || '--'}</span>
                                        <span className={`shrink-0 font-bold px-1.5 rounded text-[10px] ${log.level === 'ERROR' ? 'text-red-400 bg-red-400/10' : log.level === 'WARN' ? 'text-yellow-400 bg-yellow-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                      {log.level}
                    </span>
                                        <span className="text-indigo-400/80 truncate max-w-[120px] shrink-0">[{log.thread}]</span>
                                        <span className="text-slate-300 flex-1 break-words">{log.msg}</span>
                                        <ChevronDown size={14} className={`text-slate-600 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} />
                                    </div>

                                    {/* 展开详情：自动格式化 JSON */}
                                    {expandedLog === log.id && (
                                        <div className="ml-12 mr-4 my-2 p-4 bg-[#161b22] border border-slate-800 rounded-lg shadow-inner animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                                                <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-slate-500">节点: <span className="text-slate-300 font-mono">{log.node}</span></span>
                                                    <span className="text-slate-500">类: <span className="text-slate-300 font-mono">{log.className}</span></span>
                                                </div>
                                                <button className="text-slate-500 hover:text-white flex items-center gap-1 text-[10px]">
                                                    <Copy size={12} /> 复制详情
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="text-xs text-slate-400 leading-relaxed bg-black/30 p-3 rounded">
                                                    <p className="font-bold mb-1 text-slate-500 uppercase tracking-tighter">Raw Message:</p>
                                                    {log.msg}
                                                </div>
                                                {tryFormatJson(log.msg) && (
                                                    <div className="bg-[#0d1117] p-3 rounded-md border border-indigo-500/20">
                                                        <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-2">
                                                            <Code size={12} /> JSON Formatted
                                                        </p>
                                                        <pre className="text-emerald-400/90 text-xs overflow-x-auto">
                                  {tryFormatJson(log.msg)}
                               </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                <div className="p-6 bg-slate-900/50 rounded-full">
                                    <Search size={48} className="opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-500">无匹配日志</p>
                                    <p className="text-sm">尝试调整时间范围或关键词</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 底部监控条 */}
                <div className="h-10 bg-[#161b22] border-t border-slate-800 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Stream: Connected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Server size={12} className="text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase italic">/data/logs/task-center/task-center-info.log</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600">
                        {filteredLogs.length} Lines Displayed | 100MB Per File | 0.4s Query
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;