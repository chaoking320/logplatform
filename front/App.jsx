import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Calendar, Clock, FileText, ChevronDown, Download, RefreshCw, Terminal, CheckCircle2, Server, Database } from 'lucide-react';

// 自定义滚动条样式
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.3);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.6);
    border-radius: 3px;
    transition: background 0.2s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.8);
  }
  
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: rgba(30, 41, 59, 0.3);
  }
  
  /* Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(100, 116, 139, 0.6) rgba(30, 41, 59, 0.3);
  }
`;

// 将样式注入到页面
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = scrollbarStyles;
  document.head.appendChild(styleElement);
}

// --- 获取服务器配置的基础函数（不经过getApiUrl处理，避免循环依赖）---
const fetchServerConfig = async () => {
    const response = await fetch('/api/config/servers');
    const data = await response.json();
    if (data.success) {
        return data.data || [];
    } else {
        throw new Error(data.message || 'Failed to fetch server config');
    }
};

// --- API 请求封装 ---
const getApiUrl = async (endpoint, selectedServer = null, selectedApp = null) => {
  // 如果选择了远程服务器，使用远程服务器的API地址
  if (selectedServer) {
    try {
      const servers = await fetchServerConfig();
      const server = servers.find(s => s.id === selectedServer);
      if (server) {
        // 远程服务器：如果nginx配置是 proxy_pass http://127.0.0.1:9876; (没有斜杠)
        // 那么 /logapi/api/logs/query 会被传递给后端作为完整路径
        // 所以我们需要直接使用 /logapi + endpoint，让后端处理 /logapi 前缀
        return `http://${server.host}/logapi${endpoint}`;
      } else {
        throw new Error(`找不到服务器配置: ${selectedServer}`);
      }
    } catch (error) {
      console.error('Error fetching server config:', error);
      throw error;
    }
  }

  // 本地服务器：通过nginx的/api/代理或vite代理，直接使用endpoint
  return endpoint;
};

const fetchLogs = async (
    date,
    keyword,
    startTime,
    endTime,
    selectedServer = null,
    selectedApp = null,
    logType = 'all'
) => {
    try {
        const baseUrl = await getApiUrl('/api/logs/query', selectedServer, selectedApp);
        let url = `${baseUrl}?date=${date}&startTime=${startTime}&endTime=${endTime}`;
        
        if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
        if (selectedApp) url += `&appId=${selectedApp}`;
        if (logType !== 'all') url += `&type=${logType}`;

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
const fetchAvailableDates = async (selectedServer = null, selectedApp = null) => {
    try {
        const baseUrl = await getApiUrl('/api/logs/dates', selectedServer, selectedApp);
        let url = baseUrl;
        if (selectedApp) url += `?appId=${selectedApp}`;
        
        const response = await fetch(url);
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
const fetchDateLogFiles = async (date, selectedServer = null, selectedApp = null, logType = 'all') => {
    try {
        const baseUrl = await getApiUrl(`/api/logs/files/${date}`, selectedServer, selectedApp);
        let url = baseUrl;
        const params = [];
        if (selectedApp) params.push(`appId=${selectedApp}`);
        if (logType !== 'all') params.push(`type=${logType}`); // 添加类型参数
            
        if (params.length > 0) url += '?' + params.join('&');
            
        const response = await fetch(url);
        console.log('response', response)
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

// --- 获取服务器列表 ---
const fetchServers = async () => {
    try {
        return await fetchServerConfig();
    } catch (error) {
        console.error('Error fetching servers:', error);
        return [];
    }
};

// --- 获取服务器下的应用列表 ---
const fetchAppsByServer = async (serverId) => {
    try {
        const baseUrl = await getApiUrl(`/api/config/apps/server/${serverId}`);
        const response = await fetch(baseUrl);
        const data = await response.json();
        if (data.success) {
            return data.data || [];
        } else {
            throw new Error(data.message || 'Failed to fetch apps');
        }
    } catch (error) {
        console.error('Error fetching apps by server:', error);
        return [];
    }
};


// --- 增强的日志行解析器 ---
// 针对：[task-center:172.28.243.190:30736] [,] 2026-01-08 14:02:00.894 INFO 6762 [xxl-job...]
const parseLogLine = (raw, id) => {
    const regex = /^\[(.*?)] \[(.*?)] (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) (\w+) (\d+) \[(.*?)] (.*?) (.*)$/;
    const match = raw.match(regex);
    if (match) {
        return {
            id,
            type: 'standard', // 标准格式日志
            node: match[1],
            traceId: match[2],
            time: match[3],
            level: match[4],
            pid: match[5],
            thread: match[6],
            className: match[7],
            msg: match[8],
            raw,
            additionalLines: [] // 用于存储后续的非标准格式行
        };
    }
    return { 
        id, 
        type: 'additional', // 非标准格式行
        raw, 
        time: "Unknown", 
        level: "OTHER", 
        msg: raw 
    };
};

// --- 日志行分组处理器 ---
// 将非标准格式的行归并到前面的标准格式日志中
const groupLogLines = (rawLogs) => {
    const parsedLogs = rawLogs.map((raw, index) => parseLogLine(raw, index));
    const groupedLogs = [];
    let currentStandardLog = null;

    for (const log of parsedLogs) {
        if (log.type === 'standard') {
            // 如果是标准格式日志，保存之前的日志（如果有的话）
            if (currentStandardLog) {
                groupedLogs.push(currentStandardLog);
            }
            currentStandardLog = log;
        } else if (log.type === 'additional' && currentStandardLog) {
            // 如果是非标准格式行，且有当前的标准日志，则添加到其补充信息中
            currentStandardLog.additionalLines.push(log);
        } else if (log.type === 'additional' && !currentStandardLog) {
            // 如果是非标准格式行，但没有前置的标准日志，则作为独立日志处理
            groupedLogs.push({
                ...log,
                type: 'standalone', // 独立的非标准格式日志
                additionalLines: []
            });
        }
    }

    // 添加最后一个标准日志（如果有的话）
    if (currentStandardLog) {
        groupedLogs.push(currentStandardLog);
    }

    return groupedLogs;
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


// --- 主组件 ---
const App = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState("00:00");
    const [endTime, setEndTime] = useState("23:59");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLevel, setFilterLevel] = useState("INFO"); // 这里改名为filterType更合适，但我们保持原名
    const [expandedLog, setExpandedLog] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [servers, setServers] = useState([]);
    const [apps, setApps] = useState([]);
    const [selectedServer, setSelectedServer] = useState(null);
    const [selectedApp, setSelectedApp] = useState(null);
    const scrollRef = useRef(null);

    // 获取可用日期列表
    const [availableDates, setAvailableDates] = useState([]);
    // 获取指定日期下的日志文件列表
    const [dateLogFiles, setDateLogFiles] = useState([]);

    // 加载服务器列表
    useEffect(() => {
        const loadServers = async () => {
            try {
                const serverList = await fetchServers();
                setServers(serverList);
                if (serverList.length > 0 && !selectedServer) {
                    setSelectedServer(serverList[0].id);
                }
            } catch (error) {
                console.error('Error fetching servers:', error);
            }
        };

        loadServers();
    }, []);

    // 当服务器改变时，加载该服务器的应用列表
    useEffect(() => {
        const loadApps = async () => {
            if (selectedServer) {
                try {
                    const appList = await fetchAppsByServer(selectedServer);
                    setApps(appList);
                    if (appList.length > 0 && !selectedApp) {
                        setSelectedApp(appList[0].id);
                    } else if (appList.length === 0) {
                        setSelectedApp(null);
                    }
                } catch (error) {
                    console.error('Error fetching apps:', error);
                    setApps([]);
                    setSelectedApp(null);
                }
            } else {
                setApps([]);
                setSelectedApp(null);
            }
        };

        loadApps();
    }, [selectedServer]);

    // 获取可用日期列表
    useEffect(() => {
        const loadAvailableDates = async () => {
            try {
                const dates = await fetchAvailableDates(selectedServer, selectedApp);
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
    }, [selectedServer, selectedApp]); // 当服务器或应用改变时重新获取日期

    // 获取选定日期下的日志文件列表
    useEffect(() => {
        const loadDateLogFiles = async () => {
            if (selectedDate) {
                try {
                    let logType = 'all';
                    if (filterLevel === 'INFO') {
                        logType = 'info';
                    } else if (filterLevel === 'ERROR') {
                        logType = 'error';
                    }
                    
                    const files = await fetchDateLogFiles(selectedDate, selectedServer, selectedApp, logType);
                    setDateLogFiles(files);
                } catch (error) {
                    console.error('Error fetching date log files:', error);
                    setDateLogFiles([]);
                }
            }
        };

        loadDateLogFiles();
    }, [selectedDate, selectedServer, selectedApp, filterLevel]); // 添加filterLevel到依赖数组

    // 加载日志数据
    const loadLogs = async () => {
        // 如果没有选择特定文件，则不执行后端请求
        // if (!selectedFile) {
        //     setLogs([]);
        //     setIsLoading(false);
        //     return;
        // }

        setIsLoading(true);
        setError(null);
        try {
            // 根据过滤级别确定日志类型
            let logType = 'all';
            if (filterLevel === 'INFO') {
                logType = 'info';
            } else if (filterLevel === 'ERROR') {
                logType = 'error';
            }

            const baseUrl = await getApiUrl('/api/logs/query', selectedServer, selectedApp);
            let url = `${baseUrl}?date=${selectedDate}&startTime=${startTime}&endTime=${endTime}`;
            
            if (searchQuery) url += `&keyword=${encodeURIComponent(searchQuery)}`;
            if (selectedFile) url += `&file=${encodeURIComponent(selectedFile)}`;
            if (selectedApp) url += `&appId=${selectedApp}`;
            if (logType !== 'all') url += `&type=${logType}`;

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
                const groupedLogs = groupLogLines(logData);
                setLogs(groupedLogs);
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

    // useEffect(() => {
    //     loadLogs();
    // }, [selectedDate, selectedServer, selectedApp]); // 当服务器或应用改变时也重新加载日志

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

    // 处理服务器选择
    const handleServerChange = (serverId) => {
        console.log('Selected server:', serverId)
        setSelectedServer(serverId);
        setSelectedApp(null); // 重置应用选择
        setSelectedFile(null); // 清空之前选择的文件
    };

    // 处理应用选择
    const handleAppChange = (appId) => {
        setSelectedApp(appId);
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

    // 处理过滤类型变化
    const handleFilterChange = (type) => {
        setFilterLevel(type);
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
                        <p className="text-[10px] text-slate-500 font-mono uppercase">Platform v2.4</p>
                    </div>
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">

                    {/* 服务器选择 */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Server size={12} /> 服务器
                        </label>
                        <select
                            value={selectedServer || ''}
                            onChange={(e) => handleServerChange(e.target.value)}
                            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="">本地服务器</option>
                            {servers.map(server => (
                                <option key={server.id} value={server.id}>
                                    {server.name} ({server.host}:{server.port})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 应用选择 */}
                    {selectedServer && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Database size={12} /> 应用
                            </label>
                            <select
                                value={selectedApp || ''}
                                onChange={(e) => handleAppChange(e.target.value)}
                                className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                disabled={!selectedServer}
                            >
                                <option value="">请选择应用</option>
                                {apps.map(app => (
                                    <option key={app.id} value={app.id}>
                                        {app.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Calendar size={12} /> 检索日期
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            max={new Date().toISOString().split('T')[0]} // 限制最大日期为今天
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Clock size={12} /> 时间范围:
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

                    <div className="pt-3 border-t border-slate-800">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">文件分片检索</label>
                        <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar"> {/* 减少高度和间距 */}
                            {dateLogFiles.length > 0 ? (
                                dateLogFiles.map((fileInfo, index) => {
                                    const isSelected = selectedFile === fileInfo.fileName;
                                    return (
                                        <div 
                                            key={index}
                                            className={`flex flex-col p-2 rounded-md border cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'bg-indigo-500/30 border-indigo-400 text-indigo-100' 
                                                    : 'bg-slate-800/30 border-slate-700 hover:bg-slate-700/50'
                                            }`}
                                            onClick={() => handleFileSelect(fileInfo.fileName)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={11} /> {/* 减小图标尺寸 */}
                                                    <span className="text-[11px] font-mono truncate max-w-[130px]">{fileInfo.fileName}</span>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                )}
                                            </div>
                                            <div className="mt-1 text-[8px] text-slate-400"> {/* 减小文字尺寸 */}
                                                <div>开始: {fileInfo.earliestTime ? fileInfo.earliestTime.split(' ')[1] : '未知'}</div>
                                                <div>结束: {fileInfo.latestTime ? fileInfo.latestTime.split(' ')[1] : '未知'}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-[11px] text-slate-500 p-2">暂无可检索的日志文件</div>
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
                            <p className="text-slate-300 font-bold">当前服务器: {selectedServer ? servers.find(s => s.id === selectedServer)?.name : '本地'}</p>
                            <p className="text-slate-500">状态: {selectedServer ? '已连接' : '本地服务'}</p>
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
                            {[ "INFO", "ERROR","ALL"].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleFilterChange(type)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${filterLevel === type ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {type}
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
                    <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[13px] custom-scrollbar" ref={scrollRef}>
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
                                        <span className={`shrink-0 font-bold px-1.5 rounded text-[10px] ${log.level === 'ERROR' ? 'text-red-400 bg-red-400/10' : log.level === 'WARN' ? 'text-yellow-400 bg-yellow-400/10' : log.level === 'OTHER' ? 'text-gray-400 bg-gray-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                                            {log.level}
                                        </span>
                                        {log.type === 'standard' && (
                                            <span className="text-indigo-400/80 truncate max-w-[120px] shrink-0">[{log.thread}]</span>
                                        )}
                                        <span className="text-slate-300 flex-1 break-words">{log.msg}</span>
                                        {/* 显示补充信息指示器 */}
                                        {log.additionalLines && log.additionalLines.length > 0 && (
                                            <span className="text-orange-400 text-[10px] bg-orange-400/10 px-2 py-1 rounded shrink-0">
                                                +{log.additionalLines.length}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={`text-slate-600 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} />
                                    </div>

                                    {/* 展开详情：包含补充信息 */}
                                    {expandedLog === log.id && (
                                        <div className="ml-12 mr-4 my-2 p-4 bg-[#161b22] border border-slate-800 rounded-lg shadow-inner animate-in slide-in-from-top-2 duration-200">
                                            {log.type === 'standard' && (
                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                                                    <div className="flex items-center gap-4 text-xs">
                                                        <span className="text-slate-500">节点: <span className="text-slate-300 font-mono">{log.node}</span></span>
                                                        <span className="text-slate-500">类: <span className="text-slate-300 font-mono">{log.className}</span></span>
                                                    </div>
                                                    <button className="text-slate-500 hover:text-white flex items-center gap-1 text-[10px]">
                                                        <span className="material-symbols-outlined text-xs">content_copy</span> 复制详情
                                                    </button>
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                <div className="text-xs text-slate-400 leading-relaxed bg-black/30 p-3 rounded">
                                                    <p className="font-bold mb-1 text-slate-500 uppercase tracking-tighter">Raw Message:</p>
                                                    {log.msg}
                                                </div>
                                                
                                                {/* 显示补充信息（堆栈跟踪等） */}
                                                {log.additionalLines && log.additionalLines.length > 0 && (
                                                    <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-md">
                                                        <p className="text-[10px] font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-xs">*</span> 详细信息 ({log.additionalLines.length} 行)
                                                        </p>
                                                        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                                            {log.additionalLines.map((additionalLine, index) => (
                                                                <div key={index} className="text-xs text-blue-300/80 font-mono leading-relaxed bg-black/20 p-2 rounded border-l-2 border-blue-500/50">
                                                                    {additionalLine.raw}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
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
                            <span className="text-[10px] font-bold text-slate-500 uppercase italic">{selectedServer ? `Server: ${servers.find(s => s.id === selectedServer)?.name}` : 'Local Service'}</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600">
                        {filteredLogs.length} Lines Displayed | Multi-Server Platform | Real-time Query
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;