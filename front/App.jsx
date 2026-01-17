import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Calendar, Clock, FileText, ChevronDown, Download, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';

// --- 日志行解析器 ---
// 针对：[task-center:172.28.243.190:30736] [,] 2026-01-08 14:02:00.894 INFO 6762 [xxl-job...]
// const parseLogLine = (raw, id) => {
//     const regex = /^\[(.*?)] \[(.*?)] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) (\w+) (\d+) \[(.*?)] (.*?) (.*)$/;
//     const match = raw.match(regex);
//     if (match) {
//         return {
//             id,
//             node: match[1],
//             traceId: match[2],
//             time: match[3],
//             level: match[4],
//             pid: match[5],
//             thread: match[6],
//             className: match[7],
//             msg: match[8],
//             raw
//         };
//     }
//     return { id, raw, time: "Unknown", level: "OTHER", msg: raw };
// };

// // --- JSON 格式化工具 ---
// const tryFormatJson = (text) => {
//     try {
//         const jsonMatch = text.match(/\{.*\}|\[.*\]/);
//         if (jsonMatch) {
//             const obj = JSON.parse(jsonMatch[0]);
//             return JSON.stringify(obj, null, 2);
//         }
//     } catch (e) {
//         return null;
//     }
//     return null;
// };

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

// --- JSON 格式化工具 ---
const tryFormatJson = (text) => {
    try {
        const jsonMatch = text.match(/\{.*\}|\[.*\]/);
        if (jsonMatch) {
            const obj = JSON.parse(jsonMatch[0]);
            return JSON.stringify(obj, null, 2);
        }
    } catch (e) {
        return null;
    }
    return null;
};

// --- API 请求封装 ---
const fetchLogs = async (
    date,
    keyword,
    startTime,
    endTime
) => {
    try {
        const response = await fetch(`/api/logs/query?date=${date}&keyword=${encodeURIComponent(keyword)}&startTime=${startTime}&endTime=${endTime}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            return data.data || [];
        } else {
            throw new Error(data.message || 'Failed to fetch logs');
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        throw error;
    }
};

// --- 获取可用日期列表 ---
const fetchAvailableDates = async () => {
    try {
        const response = await fetch('/api/logs/dates');
        const data = await response.json();
        if (data.success) {
            return data.data || [];
        } else {
            throw new Error(data.message || 'Failed to fetch available dates');
        }
    } catch (error) {
        console.error('Error fetching available dates:', error);
        return [];
    }
};

// --- 获取指定日期下的日志文件列表 ---
const fetchDateLogFiles = async (date) => {
    try {
        const response = await fetch(`/api/logs/files/${date}`);
        const data = await response.json();
        if (data.success) {
            return data.data || [];
        } else {
            throw new Error(data.message || 'Failed to fetch date log files');
        }
    } catch (error) {
        console.error('Error fetching date log files:', error);
        return [];
    }
};

// --- 主组件 ---
const App = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState("00:00");
    const [endTime, setEndTime] = useState("23:59");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLevel, setFilterLevel] = useState("ALL");
    const [expandedLog, setExpandedLog] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [selectedFile, setSelectedFile] = useState(null); // 新增：记录选择的文件
    const scrollRef = useRef(null);

    // 获取可用日期列表
    const [availableDates, setAvailableDates] = useState([]);
    // 获取指定日期下的日志文件列表
    const [dateLogFiles, setDateLogFiles] = useState([]);

    useEffect(() => {
        // 获取可用日期
        const loadAvailableDates = async () => {
            try {
                const dates = await fetchAvailableDates();
                setAvailableDates(dates);
                // 如果有日期，设置最新的日期为默认值
                if (dates.length > 0) {
                    const latestDate = dates.sort().pop();
                    setSelectedDate(latestDate);
                }
            } catch (error) {
                console.error('Error fetching available dates:', error);
            }
        };

        loadAvailableDates();
    }, []);

    // 获取选定日期下的日志文件列表
    useEffect(() => {
        const loadDateLogFiles = async () => {
            if (selectedDate) {
                try {
                    const files = await fetchDateLogFiles(selectedDate);
                    setDateLogFiles(files);
                } catch (error) {
                    console.error('Error fetching date log files:', error);
                    setDateLogFiles([]);
                }
            }
        };

        loadDateLogFiles();
    }, [selectedDate]);

    // 加载日志数据
    const loadLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 如果有选择特定文件，则传递文件参数
            let url = `/api/logs/query?date=${selectedDate}`;
            if (searchQuery) url += `&keyword=${encodeURIComponent(searchQuery)}`;
            if (startTime) url += `&startTime=${startTime}`;
            if (endTime) url += `&endTime=${endTime}`;
            if (selectedFile) url += `&file=${encodeURIComponent(selectedFile)}`; // 添加文件参数

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                const logData = data.data || [];
                const parsedLogs = logData.map((raw, index) => parseLogLine(raw, index));
                setLogs(parsedLogs);
            } else {
                throw new Error(data.message || 'Failed to fetch logs');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [selectedDate]);

    // 过滤日志
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchLevel = filterLevel === "ALL" || log.level === filterLevel;
            const matchQuery = log.raw.toLowerCase().includes(searchQuery.toLowerCase());
            const logHourMin = log.time.includes(' ') ? log.time.split(' ')[1].substring(0, 5) : "00:00";
            const matchTime = logHourMin >= startTime && logHourMin <= endTime;
            return matchLevel && matchQuery && matchTime;
        });
    }, [logs, filterLevel, searchQuery, startTime, endTime]);

    // 处理搜索
    const handleSearch = () => {
        loadLogs();
    };

    // 处理日期选择
    const handleDateChange = (date) => {
        setSelectedDate(date);
        setSelectedFile(null); // 清空之前选择的文件
    };

    // 处理文件选择
    const handleFileSelect = (fileName) => {
        setSelectedFile(fileName === selectedFile ? null : fileName);
    };

    // 处理时间范围变化
    const handleTimeChange = (type, value) => {
        if (type === 'start') {
            setStartTime(value);
        } else {
            setEndTime(value);
        }
    };

    // 处理过滤级别变化
    const handleFilterChange = (level) => {
        setFilterLevel(level);
    };

    // 处理展开/折叠日志详情
    const toggleExpand = (id) => {
        setExpandedLog(expandedLog === id ? null : id);
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
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            max={new Date().toISOString().split('T')[0]} // 限制最大日期为今天
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Clock size={14} /> 时间范围:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <input 
                                type="time" 
                                value={startTime} 
                                onChange={e => handleTimeChange('start', e.target.value)} 
                                className="bg-[#0d1117] border border-slate-700 rounded-lg p-2 text-xs" 
                            />
                            <input 
                                type="time" 
                                value={endTime} 
                                onChange={e => handleTimeChange('end', e.target.value)} 
                                className="bg-[#0d1117] border border-slate-700 rounded-lg p-2 text-xs" 
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-3 block">文件分片检索</label>
                        <div className="space-y-2 max-h-96 overflow-y-auto"> {/* 增加高度，超过10个文件才出现滚动条 */}
                            {dateLogFiles.length > 0 ? (
                                dateLogFiles.map((fileInfo, index) => {
                                    const isSelected = selectedFile === fileInfo.fileName;
                                    return (
                                        <div 
                                            key={index}
                                            className={`flex flex-col p-2 rounded-lg border cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'bg-indigo-500/30 border-indigo-400 text-indigo-100' 
                                                    : 'bg-slate-800/30 border-slate-700 hover:bg-slate-700/50'
                                            }`}
                                            onClick={() => handleFileSelect(fileInfo.fileName)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={12} /> {/* 减小图标尺寸 */}
                                                    <span className="text-xs font-mono truncate max-w-[140px]">{fileInfo.fileName}</span>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                                )}
                                            </div>
                                            <div className="mt-1 text-[9px] text-slate-400"> {/* 减小文字尺寸 */}
                                                <div>开始: {fileInfo.earliestTime ? fileInfo.earliestTime.split(' ')[1] : '未知'}</div>
                                                <div>结束: {fileInfo.latestTime ? fileInfo.latestTime.split(' ')[1] : '未知'}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-xs text-slate-500 p-2">暂无可检索的日志文件</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-indigo-600/5 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 size={16} />
                        </div>
                        <div className="text-[11px]">
                            <p className="text-slate-300 font-bold">服务状态正常</p>
                            <p className="text-slate-500">后端服务已连接</p>
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
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>

                        <button 
                            onClick={handleSearch}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            搜索
                        </button>

                        <div className="h-8 w-px bg-slate-800"></div>

                        <div className="flex gap-1 bg-[#0d1117] p-1 rounded-lg border border-slate-800">
                            {["ALL", "INFO", "WARN", "ERROR"].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => handleFilterChange(lvl)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${filterLevel === lvl ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={loadLogs} className="p-2.5 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors">
                            <RefreshCw size={18} className={isLoading ? "animate-spin text-indigo-400" : ""} />
                        </button>
                        <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                            <Download size={16} /> 导出当前日志
                        </button>
                    </div>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="bg-red-900/30 border-l-4 border-red-500 p-3 m-4 rounded">
                        <div className="flex items-center">
                            <span className="text-red-400 mr-2">⚠️</span>
                            <span className="text-red-300 text-sm">{error}</span>
                        </div>
                    </div>
                )}

                {/* 日志视图 */}
                <div className="flex-1 overflow-hidden flex flex-col bg-[#0d1117]">
                    <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[13px] scrollbar-thin scrollbar-thumb-slate-800" ref={scrollRef}>
                        {isLoading && filteredLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                <div className="p-6 bg-slate-900/50 rounded-full">
                                    <RefreshCw size={48} className="opacity-20 animate-spin" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-500">正在加载日志...</p>
                                    <p className="text-sm">请稍候，正在查询日志数据</p>
                                </div>
                            </div>
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <div key={log.id} className="group border-b border-slate-900/50 last:border-0">
                                    <div
                                        onClick={() => toggleExpand(log.id)}
                                        className={`flex items-start gap-4 p-2 rounded-md transition-all cursor-pointer hover:bg-slate-800/30 ${expandedLog === log.id ? 'bg-slate-800/50' : ''}`}
                                    >
                                        <span className="text-slate-700 shrink-0 w-8 text-right select-none">{log.id + 1}</span>
                                        <span className="text-slate-500 shrink-0 select-none">{log.time?.split(' ')[1]?.substring(0, 8) || '--'}</span>
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
                                                    <span className="material-symbols-outlined text-xs">content_copy</span> 复制详情
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
                                                            <span className="material-symbols-outlined text-xs">code</span> JSON Formatted
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
                        ) : !isLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                <div className="p-6 bg-slate-900/50 rounded-full">
                                    <Search size={48} className="opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-500">无匹配日志</p>
                                    <p className="text-sm">尝试调整时间范围或关键词</p>
                                </div>
                            </div>
                        ) : null}
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
                            <span className="material-symbols-outlined text-xs">storage</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase italic">/data/logs/task-center/task-center-info.log</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600">
                        {filteredLogs.length} Lines Displayed | 100MB Per File | Real-time Query
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;