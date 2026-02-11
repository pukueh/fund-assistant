/**
 * Fund Assistant Pro - Daily Investment Report Page
 * 
 * Displays AI-generated daily investment advice with premium animations.
 */

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, RefreshCw, AlertCircle, Printer, CheckCircle2 } from 'lucide-react';
import { marketApi } from '../api';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring" as const,
            stiffness: 260,
            damping: 20
        }
    }
};

interface DailyReportData {
    report: string;
    date: string;
}

export const DailyReport = () => {
    const [data, setData] = useState<DailyReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchReport = async () => {
        if (isLoading) return;

        setIsLoading(true);
        setError(null);
        console.log("Fetching daily report...");

        try {
            const result = await marketApi.getDailyReport();
            console.log("Daily report received:", result);

            if (result.error) throw new Error(result.error);

            setData(result);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Error fetching report:", err);
            setError(err instanceof Error ? err.message : '加载失败');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    return (
        <motion.div
            className="p-8 max-w-5xl mx-auto space-y-10 mb-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Area */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                            <FileText className="text-blue-500" size={22} />
                        </div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Insights & Report</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                        每日投资简报
                    </h1>
                    <div className="flex flex-col gap-1 mt-2">
                        <p className="text-gray-400 font-medium flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-gray-600" />
                            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                        </p>
                        {lastUpdated && (
                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={10} className="text-green-500/50" />
                                Last Updated: {lastUpdated.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center justify-center w-12 h-12 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/10 active:scale-95"
                        aria-label="打印简报"
                    >
                        <Printer size={20} />
                    </button>
                    <button
                        onClick={fetchReport}
                        disabled={isLoading}
                        className="relative overflow-hidden group flex items-center gap-2 px-6 py-3 bg-[#00d4aa] text-black font-black text-sm rounded-xl hover:bg-[#00d4aa]/90 transition-all shadow-lg shadow-[#00d4aa]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} strokeWidth={3} />
                        {isLoading ? '生成中...' : '重新生成'}

                        {/* Button Glow Effect */}
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
                    </button>
                </div>
            </motion.div>

            {/* Error State */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-2xl flex items-center gap-5 shadow-2xl overflow-hidden"
                    >
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight mb-1">报告生成失败</h3>
                            <p className="text-sm opacity-80 font-medium">{error}</p>
                            <button onClick={fetchReport} className="mt-4 text-xs font-black uppercase tracking-widest hover:underline">再次尝试</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="relative min-h-[400px]">
                {/* Main Loading Skeleton (Only for initial load) */}
                {isLoading && !data && (
                    <motion.div
                        variants={itemVariants}
                        className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-10 space-y-8"
                    >
                        <div className="h-10 bg-white/5 rounded-xl w-1/3 animate-pulse" />
                        <div className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-4 bg-white/5 rounded-lg w-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        <div className="h-64 bg-white/5 rounded-2xl w-full animate-pulse" />
                    </motion.div>
                )}

                {/* Report Content */}
                {data && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-10 shadow-2xl relative overflow-hidden group print:bg-white print:text-black print:p-0 print:border-none print:shadow-none"
                    >
                        {/* Loading Overlay (Simpler) */}
                        {isLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
                                <RefreshCw size={32} className="text-[#00d4aa] animate-spin" />
                            </div>
                        )}

                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] -z-10 pointer-events-none" />

                        <div className="text-gray-300 prose prose-invert max-w-none prose-headings:text-white prose-headings:font-black prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-[#00d4aa] prose-code:text-blue-400 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 print:prose-neutral print:max-w-full">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {data.report}
                            </ReactMarkdown>
                        </div>

                        <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center gap-4 print:border-gray-200">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                <RefreshCw size={10} />
                                AI generated insights
                            </div>
                            <p className="text-xs text-center text-gray-500 max-w-lg font-medium italic leading-relaxed">
                                此报告由 AI 投资顾问基于当前市场数据生成，仅供参考，不构成任何形式的投资建议。投资有风险，入市需谨慎。
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default DailyReport;
