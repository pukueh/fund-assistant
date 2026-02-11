/**
 * Fund Assistant Pro - Dashboard Page
 * 
 * The primary mission control for the user's investment journey.
 * Features real-time market overviews, portfolio snapshots, and AI interaction.
 * 
 * Design Philosophy:
 * - Premium Apple-inspired aesthetics (Glassmorphism V2)
 * - Staggered entrance animations for data components
 * - Direct alignment with Login/Register branding system
 */

import React, { useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
    Wallet,
    Activity,
    ChevronRight,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Sparkles,
    LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarketStore, usePortfolioStore } from '../store';
import type { MarketIndex } from '../types';
import { Card, Badge } from '../components/ui';
import { DataSourceStatus } from '../components/layout/DataSourceStatus';
import { AIChat } from '../components/chat/AIChat';

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
            duration: 0.6,
            ease: "easeOut"
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 15
        }
    },
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * Market Card Component - Optimized with Memo and Accessibility.
 */
const MarketCard = React.memo<{ title: string; indices: MarketIndex[] }>(({ title, indices }) => (
    <Card className="overflow-hidden border-white/5 bg-black/30 backdrop-blur-2xl group hover:border-white/10 transition-all duration-500 shadow-xl relative" role="region" aria-label={title}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" aria-hidden="true" />
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between relative z-10">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{title}</h3>
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse" aria-hidden="true" />
        </div>
        <div className="p-3 space-y-1 relative z-10">
            {indices.slice(0, 4).map((index) => {
                const { code, name, price, change } = index;
                const isGain = (change || 0) >= 0;
                return (
                    <motion.div
                        key={code}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group/item cursor-pointer"
                        whileHover={{ x: 3 }}
                        role="button"
                        aria-label={`查看行情: ${name} (${code}), 价格: ${price}, 涨跌幅: ${change?.toFixed(2)}%`}
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white group-hover/item:text-blue-400 transition-colors">
                                {name}
                            </span>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 opacity-60">{code}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-mono text-sm font-black text-white px-2">
                                {typeof price === 'number'
                                    ? price.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })
                                    : price}
                            </span>
                            <Badge
                                variant={isGain ? 'gain' : 'loss'}
                                className="font-mono text-[10px] w-[65px] h-6 justify-center rounded-lg shadow-sm border-white/5"
                            >
                                {isGain ? '+' : ''}{change?.toFixed(2)}%
                            </Badge>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    </Card>
));

MarketCard.displayName = 'MarketCard';

/**
 * Portfolio Summary Section - The "Hero" component of the dashboard.
 */
const PortfolioSummarySection: React.FC = () => {
    const { summary, isLoading, error, fetchSummary } = usePortfolioStore();

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    if (isLoading && !summary) {
        return (
            <Card className="p-10 h-[320px] flex items-center justify-center border-white/5 bg-black/20 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#00d4aa]/20 blur-xl rounded-full scale-150 animate-pulse" />
                        <Zap className="text-[#00d4aa] relative z-10" size={40} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black text-gray-500 uppercase tracking-[0.25em] animate-pulse">Syncing Assets...</span>
                </div>
            </Card>
        );
    }

    if (error && !summary) {
        return (
            <Card className="p-8 border-red-500/20 bg-red-500/5 backdrop-blur-xl">
                <div className="flex items-center gap-4 text-red-400 mb-4">
                    <AlertCircle size={24} />
                    <span className="text-lg font-black tracking-tight">API 端点响应异常</span>
                </div>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">系统未能成功从服务器获取您的投资组合摘要，这可能是由于网络波动或会话超时导致的。</p>
                <div className="flex gap-4">
                    <button
                        onClick={() => fetchSummary()}
                        className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all border border-red-500/30 text-xs font-bold uppercase tracking-widest"
                    >
                        Retry Connection
                    </button>
                </div>
            </Card>
        );
    }

    if (!summary) return null;

    const isPositive = summary.total_profit >= 0;

    return (
        <motion.div variants={itemVariants}>
            <Card className="relative p-10 overflow-hidden group border-white/10 hover:border-[#00d4aa]/20 transition-all duration-700 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] bg-black/40">
                {/* Premium Background Visuals */}
                <div className={`absolute top-0 right-0 w-[600px] h-[600px] blur-[150px] opacity-[0.15] transition-all duration-1000 -translate-y-1/2 translate-x-1/3 pointer-events-none ${isPositive ? 'bg-gain' : 'bg-loss'}`} />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-[length:40px_40px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#0f172a] flex items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden group/icon">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#00d4aa]/10 to-transparent opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                                <Wallet size={28} className="text-[#00d4aa] drop-shadow-[0_0_8px_rgba(0,212,170,0.4)]" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white tracking-tight">账户总览</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mt-0.5">Investment Portfolio Snapshot</p>
                            </div>
                        </div>
                        <Link
                            to="/portfolio"
                            className="bg-white/5 hover:bg-[#00d4aa]/10 border border-white/10 hover:border-[#00d4aa]/30 px-5 py-2 rounded-2xl transition-all duration-300 group/btn"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-400 group-hover/btn:text-white uppercase tracking-widest transition-colors">Details</span>
                                <ChevronRight size={16} className="text-gray-500 group-hover/btn:text-[#00d4aa] group-hover/btn:translate-x-1 transition-all" />
                            </div>
                        </Link>
                    </div>

                    <div className="mb-12">
                        <div className="flex items-baseline gap-3 mb-4" aria-live="polite">
                            <span className="text-3xl font-black text-gray-600 tracking-tighter uppercase font-mono" aria-hidden="true">¥</span>
                            <div className="text-6xl md:text-8xl font-black font-mono tracking-tighter text-white drop-shadow-2xl selection:bg-[#00d4aa] selection:text-black" aria-label={`当前值: ${summary.total_value} 元`}>
                                {summary.total_value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <Badge
                                variant={isPositive ? 'gain' : 'loss'}
                                className="px-5 py-2.5 text-base font-black shadow-2xl rounded-2xl border-white/5"
                                aria-label={`总利润: ${isPositive ? '+' : ''}${summary.total_profit}`}
                            >
                                <div className="flex items-center gap-2">
                                    {isPositive ? <ArrowUpRight size={20} strokeWidth={3} aria-hidden="true" /> : <ArrowDownRight size={20} strokeWidth={3} aria-hidden="true" />}
                                    <span className="font-mono tracking-tight">
                                        {Math.abs(summary.total_profit).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            </Badge>
                            <div className={`px-5 py-2.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-500 ${isPositive ? 'bg-gain/10 text-gain border-red-500/20' : 'bg-loss/10 text-loss border-green-500/20'}`}>
                                <span className="text-lg font-black font-mono tracking-tight">
                                    {isPositive ? '+' : '-'}{(summary.total_profit_rate || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 pt-10 border-t border-white/5 -mx-10 -mb-10 px-10 pb-10 mt-10 bg-white/[0.01]">
                        <div className="space-y-1.5 group/stat">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/stat:text-white transition-colors duration-300">昨日回报率</div>
                            <div className={`font-mono text-2xl font-black flex items-center gap-1.5 ${summary.day_change >= 0 ? 'text-gain' : 'text-loss'}`}>
                                {summary.day_change >= 0 ? <ArrowUpRight size={18} strokeWidth={3} /> : <ArrowDownRight size={18} strokeWidth={3} />}
                                <span>{Math.abs(summary.day_change_pct || 0).toFixed(2)}%</span>
                            </div>
                        </div>
                        <div className="space-y-1.5 group/stat">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/stat:text-white transition-colors duration-300">持有产品</div>
                            <div className="font-mono text-2xl font-black text-gray-200 flex items-center gap-3">
                                {summary.holdings_count} <span className="text-[10px] font-bold text-gray-600 bg-white/5 px-2 py-1 rounded-md border border-white/10 uppercase tracking-widest">Holdings</span>
                            </div>
                        </div>
                        <div className="space-y-1.5 hidden md:block group/stat">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/stat:text-white transition-colors duration-300">资金利用率</div>
                            <div className="font-mono text-2xl font-black text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]">
                                {(summary.total_value / (summary.total_value + 5000) * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="space-y-1.5 hidden md:block group/stat">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/stat:text-white transition-colors duration-300">系统风险建议</div>
                            <div className="font-mono text-2xl font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)] uppercase tracking-tighter">
                                Stable
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export const Dashboard: React.FC = () => {
    const { data: marketData, fetchGlobalMarket, isLoading: isMarketLoading, error: marketError } = useMarketStore();

    useEffect(() => {
        fetchGlobalMarket();
    }, [fetchGlobalMarket]);

    return (
        <motion.div
            className="p-6 lg:p-10 space-y-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Page Header Area */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00d4aa]/10 flex items-center justify-center border border-[#00d4aa]/20 shadow-inner">
                            <LayoutDashboard className="text-[#00d4aa]" size={22} />
                        </div>
                        <span className="text-[10px] font-black text-[#00d4aa] uppercase tracking-[0.3em]">Management Console</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-3 leading-tight">
                        资产仪表盘
                    </h1>
                    <div className="flex items-center gap-3 text-gray-400 font-medium bg-white/[0.03] w-fit px-4 py-2 rounded-2xl border border-white/5">
                        <Sparkles size={16} className="text-amber-400" />
                        <span className="text-sm">今日策略：市场情绪向好，持仓待涨。</span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                    <div className="flex items-center gap-3 bg-black/40 px-5 py-2.5 rounded-2xl border border-white/10 shadow-lg group">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Network Status</span>
                            <span className="text-xs font-bold text-emerald-400">Stable Connection</span>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite] shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mr-2">Synced: Just Now</span>
                </div>
            </motion.div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Primary Column (Left) */}
                <div className="xl:col-span-2 space-y-10">
                    <PortfolioSummarySection />

                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-1">
                            <Activity className="text-[#00d4aa]" size={20} />
                            <h2 className="text-xl font-black text-white tracking-tight">智能投顾对话</h2>
                        </div>
                        <AIChat />
                    </div>
                </div>

                {/* Secondary Column (Right) - Market Data View */}
                <div className="space-y-8">
                    <motion.div variants={itemVariants} className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center border border-blue-500/10">
                                <Activity className="text-blue-400" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight text-white">全球实时行情</h2>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest leading-none mt-0.5">Global Market Pulse</p>
                            </div>
                        </div>
                        <Link to="/fund" className="text-[10px] font-black text-gray-500 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 uppercase tracking-[0.15em]">Explore All</Link>
                    </motion.div>

                    {marketError && (
                        <div className="scale-up bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-3xl backdrop-blur-xl flex flex-col gap-4 shadow-2xl">
                            <div className="flex items-center gap-3">
                                <AlertCircle size={20} />
                                <span className="font-black tracking-tight text-white">Market Data Offline</span>
                            </div>
                            <p className="text-xs leading-relaxed opacity-70">系统暂时无法连接至行情数据中心。请检查网络状态或稍后点击下方按钮重试。</p>
                            <button
                                onClick={() => fetchGlobalMarket()}
                                className="w-full bg-rose-500/20 hover:bg-rose-500/30 py-3 rounded-2xl transition-all font-black border border-rose-500/30 text-[10px] uppercase tracking-widest shadow-lg"
                            >
                                Retry Sync
                            </button>
                        </div>
                    )}

                    <div className="space-y-6">
                        {marketData ? (
                            <>
                                {marketData.markets.cn && (
                                    <motion.div variants={itemVariants}>
                                        <MarketCard title="A-Share Market" indices={marketData.markets.cn.indices} />
                                    </motion.div>
                                )}
                                {marketData.markets.us && (
                                    <motion.div variants={itemVariants}>
                                        <MarketCard title="Wall Street Indices" indices={marketData.markets.us.indices} />
                                    </motion.div>
                                )}
                                {marketData.markets.commodity && (
                                    <motion.div variants={itemVariants}>
                                        <MarketCard title="Commodity Futures" indices={marketData.markets.commodity.indices} />
                                    </motion.div>
                                )}
                                {marketData.markets.crypto && (
                                    <motion.div variants={itemVariants}>
                                        <MarketCard title="Digital Assets" indices={marketData.markets.crypto.indices} />
                                    </motion.div>
                                )}
                            </>
                        ) : isMarketLoading ? (
                            <div className="space-y-6">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-48 rounded-3xl bg-white/[0.02] animate-pulse border border-white/5 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Footer Metadata */}
            <motion.div
                variants={itemVariants}
                className="mt-16 pt-10 border-t border-white/5"
            >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity duration-700">
                    <DataSourceStatus />
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Platform Version</span>
                            <span className="text-[8px] font-bold text-gray-700 font-mono">2026.02.11-PRO-BUILD</span>
                        </div>
                        <div className="h-8 w-px bg-white/5" />
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Encryption</span>
                            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Military Grade AES-256</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}} />
        </motion.div>
    );
};

export default Dashboard;
