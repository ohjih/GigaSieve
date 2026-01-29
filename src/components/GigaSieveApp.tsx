import React, { useState, useCallback, useRef, useEffect } from 'react';

interface FileStats {
    totalLines: number;
    totalBytes: number;
    scanProgress: number;
    topValues: Map<string, number>;
}

interface ParsedLine {
    lineNumber: number;
    content: string;
}

const GigaSieveApp: React.FC = () => {
    // State
    const [file, setFile] = useState<File | null>(null);
    const [lines, setLines] = useState<ParsedLine[]>([]);
    const [filteredLines, setFilteredLines] = useState<ParsedLine[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [stats, setStats] = useState<FileStats | null>(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
    const [worker, setWorker] = useState<Worker | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Filter Logic
    useEffect(() => {
        if (!filterQuery.trim()) {
            setFilteredLines(lines);
            return;
        }
        const lowerQuery = filterQuery.toLowerCase();
        // For 1M+ lines, this filter needs to be debounced or moved to worker too. 
        // Keeping main thread for MVP responsive typing, but limiting dataset size if needed.
        const filtered = lines.filter(l => l.content.toLowerCase().includes(lowerQuery));
        setFilteredLines(filtered);
        setVisibleRange({ start: 0, end: 50 }); // Reset scroll
    }, [filterQuery, lines]);

    // Worker Init & File Processing
    const processFile = useCallback((selectedFile: File) => {
        // Reset State
        setLines([]);
        setFilteredLines([]);
        setStats(null);
        setFilterQuery('');
        setScanProgress(0);
        setIsScanning(true);

        // Terminate old worker if exists
        if (worker) worker.terminate();

        const newWorker = new Worker('/parser-worker.js');
        setWorker(newWorker);

        newWorker.postMessage({ file: selectedFile });

        newWorker.onmessage = (e) => {
            const { type, lines: newLines, progress, stats: workerStats, error } = e.data;

            if (type === 'LINES') {
                setLines(prev => {
                    // Safety Cap: If > 1M lines, we might crash browser RAM. 
                    // Production 'Giga' sieve would use OPFS. 
                    // For this version we appends up to safe limit or user warns.
                    if (prev.length > 500000) return prev; // Soft cap for stability
                    return [...prev, ...newLines];
                });
            }
            else if (type === 'PROGRESS') {
                setScanProgress(progress);
                if (workerStats) {
                    setStats(prev => ({
                        totalLines: workerStats.totalLines,
                        totalBytes: workerStats.totalBytes,
                        scanProgress: progress,
                        topValues: new Map(workerStats.topValues),
                        timeHistogram: new Map() // Simplified for worker version
                    }));
                }
            }
            else if (type === 'DONE') {
                setIsScanning(false);
                setScanProgress(100);
                if (workerStats) {
                    setStats({
                        totalLines: workerStats.totalLines,
                        totalBytes: workerStats.totalBytes,
                        scanProgress: 100,
                        topValues: new Map(workerStats.topValues),
                        timeHistogram: new Map()
                    });
                }
            }
            else if (type === 'ERROR') {
                console.error(error);
                setIsScanning(false);
                alert('Error parsing file: ' + error);
            }
        };
    }, [worker]);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        processFile(selectedFile);
    };

    // Export Report
    const handleExport = () => {
        if (!stats) return;
        const report = {
            fileName: file?.name,
            fileSize: file?.size,
            stats: {
                totalLines: stats.totalLines,
                topValues: Array.from(stats.topValues.entries())
            },
            generatedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gigasieve-report-${file?.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };


    // Virtual Scroll Logic
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, clientHeight } = scrollContainerRef.current;
        const ROW_HEIGHT = 28; // Compact rows
        const BUFFER = 20;

        const start = Math.floor(scrollTop / ROW_HEIGHT);
        const end = start + Math.ceil(clientHeight / ROW_HEIGHT);

        setVisibleRange({
            start: Math.max(0, start - BUFFER),
            end: end + BUFFER
        });
    };

    // Drag Drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        dropZoneRef.current?.classList.remove('border-emerald-500', 'bg-emerald-500/10');
        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const sortedTopValues = stats?.topValues
        ? Array.from(stats.topValues.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
        : [];

    // Render Helpers
    const ROW_HEIGHT = 28;
    const totalContentHeight = filteredLines.length * ROW_HEIGHT;
    const visibleItems = filteredLines.slice(visibleRange.start, visibleRange.end);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[80vh] min-h-[600px] text-slate-300">
            {/* Sidebar Control Panel */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                {/* File Drop Area */}
                <div
                    ref={dropZoneRef}
                    onDragOver={e => { e.preventDefault(); dropZoneRef.current?.classList.add('border-emerald-500', 'bg-emerald-500/10'); }}
                    onDragLeave={e => { e.preventDefault(); dropZoneRef.current?.classList.remove('border-emerald-500', 'bg-emerald-500/10'); }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        relative group cursor-pointer rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-6 text-center transition-all 
                        hover:border-emerald-500/50 hover:bg-slate-800
                        ${file ? 'border-emerald-500/30 bg-emerald-900/10' : ''}
                    `}
                >
                    <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />

                    {!file ? (
                        <>
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:text-emerald-400 transition-colors">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <p className="text-sm font-medium text-slate-300">Click to Open File</p>
                            <p className="text-xs text-slate-500 mt-1">or drag & drop here</p>
                        </>
                    ) : (
                        <div className="text-left">
                            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Active File</p>
                            <p className="font-semibold text-white truncate mb-1" title={file.name}>{file.name}</p>
                            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                        </div>
                    )}
                </div>

                {/* Progress / Stats */}
                {file && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className={isScanning ? "text-emerald-400 animate-pulse" : "text-slate-400"}>
                                    {isScanning ? 'SCANNING...' : 'READY'}
                                </span>
                                <span className="text-slate-500">{scanProgress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                                <p className="text-xs text-slate-500 mb-1">Total Lines</p>
                                <p className="text-lg font-bold text-slate-200">
                                    {stats ? stats.totalLines.toLocaleString() : '-'}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                                <p className="text-xs text-slate-500 mb-1">Processed</p>
                                <p className="text-lg font-bold text-slate-200">
                                    {stats ? formatBytes(stats.totalBytes) : '-'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={!stats}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export Report
                        </button>
                    </div>
                )}

                {/* Top Values Insight */}
                {sortedTopValues.length > 0 && (
                    <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Top Status Codes
                        </h3>
                        <div className="space-y-3">
                            {sortedTopValues.map(([key, count]) => {
                                const max = sortedTopValues[0][1];
                                const pct = (count / max) * 100;
                                const isError = key.startsWith('4') || key.startsWith('5');
                                return (
                                    <div key={key} className="group">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className={`font-mono font-bold ${isError ? 'text-red-400' : 'text-slate-300'}`}>{key}</span>
                                            <span className="text-slate-500">{count.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${isError ? 'bg-red-500' : 'bg-emerald-500'} opacity-70 group-hover:opacity-100 transition-opacity`}
                                                style={{ width: `${pct}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Viewer */}
            <div className="lg:col-span-3 flex flex-col rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
                {/* Viewer Header / Toolbar */}
                <div className="h-14 border-b border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                    </div>
                    <div className="relative max-w-md w-full mx-4">
                        <input
                            type="text"
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            placeholder="Filter output... (e.g. 'error' or '502')"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                        />
                        <svg className="absolute left-3 top-2 w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                        {filteredLines.length.toLocaleString()} lines
                    </div>
                </div>

                {/* Virtual Scroll Area */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-950 select-text"
                >
                    {lines.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-700">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="font-medium">No file loaded</p>
                            <p className="text-sm">Select a log file to begin analysis</p>
                        </div>
                    ) : filteredLines.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-600">
                            No matches found for "{filterQuery}"
                        </div>
                    ) : (
                        <div style={{ height: totalContentHeight, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: visibleRange.start * ROW_HEIGHT, left: 0, right: 0 }}>
                                {visibleItems.map((line) => (
                                    <div
                                        key={line.lineNumber}
                                        className="flex items-center px-4 hover:bg-slate-900/80 transition-colors border-b border-white/5 border-dashed"
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        <span className="w-16 shrink-0 text-xs font-mono text-slate-600 select-none text-right pr-4">{line.lineNumber}</span>
                                        <span className="font-mono text-sm text-slate-300 whitespace-pre truncate">{line.content}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GigaSieveApp;
