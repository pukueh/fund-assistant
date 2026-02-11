/**
 * Fund Assistant Pro - Portfolio Page
 * 
 * Holdings management with growth curve and achievements.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase,
    Plus,
    Trophy,
    PieChart,
    Loader2,
    Activity
} from 'lucide-react';
import { usePortfolioStore, useAuthStore } from '../store';
import type { Achievement } from '../types';
import { HoldingsTable } from '../components/HoldingsTable';
import { ImportHoldingsModal } from '../components/ImportHoldingsModal';
import { AnalyticsDashboard } from '../components/analytics';
import { AccountSelector } from '../components/portfolio/AccountSelector';
import { discoveryApi } from '../api';
import { Card, Badge, ConfirmDialog } from '../components/ui';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// Achievement Badge Component - Optimized with Memo
const AchievementBadge = React.memo<{ achievement: Achievement }>(({
    achievement,
}) => (
    <div
        className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group shadow-sm"
        role="article"
        aria-label={`成就: ${achievement.name} - ${achievement.description}`}
    >
        <div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/10 to-orange-500/5 flex items-center justify-center text-xl shadow-inner border border-amber-500/10 transition-transform group-hover:scale-110"
            aria-hidden="true"
        >
            {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate tracking-tight">
                {achievement.name}
            </p>
            <p className="text-[10px] text-gray-500 truncate font-medium uppercase tracking-wider mt-0.5">
                {achievement.description}
            </p>
        </div>
    </div>
));

AchievementBadge.displayName = 'AchievementBadge';

// Add Holding Modal
const AddHoldingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (holding: {
        fund_code: string;
        fund_name: string;
        shares: number;
        cost_nav: number;
    }) => Promise<void>;
}> = ({ isOpen, onClose, onAdd }) => {
    const [fundCode, setFundCode] = useState('');
    const [fundName, setFundName] = useState('');
    const [shares, setShares] = useState('');
    const [costNav, setCostNav] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (fundCode.length === 6 && !fundName) {
            const fetchName = async () => {
                setIsSearching(true);
                try {
                    const result = await discoveryApi.searchFunds(fundCode);
                    if (result.funds && result.funds.length > 0) {
                        const match = result.funds.find(f => f.code === fundCode) || result.funds[0];
                        setFundName(match.name);
                    }
                } catch (err) {
                    console.error('Failed to fetch fund name:', err);
                } finally {
                    setIsSearching(false);
                }
            };
            fetchName();
        }
    }, [fundCode, fundName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fundCode || !shares || !costNav) return;

        setIsLoading(true);
        try {
            await onAdd({
                fund_code: fundCode,
                fund_name: fundName || fundCode,
                shares: parseFloat(shares),
                cost_nav: parseFloat(costNav),
            });
            onClose();
            setFundCode('');
            setFundName('');
            setShares('');
            setCostNav('');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-md z-10"
            >
                <Card className="p-8 border-white/10 shadow-2xl overflow-visible">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
                            <Plus className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">添加持仓份额</h2>
                            <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">Add Portfolio Assets</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                                基金代码 (6位)
                            </label>
                            <input
                                type="text"
                                value={fundCode}
                                onChange={(e) => setFundCode(e.target.value)}
                                placeholder="如: 000001"
                                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                required
                            />
                        </div>

                        <div className="relative space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                                基金名称
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={fundName}
                                    onChange={(e) => setFundName(e.target.value)}
                                    placeholder={isSearching ? "正在自动获取..." : "系统自动识别"}
                                    className={`w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${isSearching ? 'opacity-70' : ''}`}
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-blue-400 text-[10px] font-bold">
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>AI 识别中</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                                    持有份额
                                </label>
                                <input
                                    type="number"
                                    value={shares}
                                    onChange={(e) => setShares(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    required
                                    step="0.01"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
                                    成本净值
                                </label>
                                <input
                                    type="number"
                                    value={costNav}
                                    onChange={(e) => setCostNav(e.target.value)}
                                    placeholder="0.0000"
                                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    required
                                    step="0.0001"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 transition-all active:scale-95"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isLoading ? '处理中...' : '提交记录'}
                            </button>
                        </div>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
};

export const Portfolio: React.FC = () => {
    const {
        holdings,
        summary,
        achievements,
        isLoading,
        error,
        refreshAll,
        addHolding,
        removeHolding,
        toggleAchievement,
    } = usePortfolioStore();

    const { user } = useAuthStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'holdings' | 'analytics'>('holdings');

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    const handleRemove = (fundCode: string) => {
        setDeleteConfirm(fundCode);
    };

    const handleAddHolding = async (holding: {
        fund_code: string;
        fund_name: string;
        shares: number;
        cost_nav: number;
    }) => {
        await addHolding(holding);
    };

    return (
        <motion.div
            className="p-6 lg:p-10 space-y-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl backdrop-blur-md flex justify-between items-center shadow-lg"
                >
                    <span className="font-medium">{error}</span>
                    <button onClick={() => usePortfolioStore.setState({ error: null })} className="text-xs font-bold hover:text-white transition-colors">关闭</button>
                </motion.div>
            )}

            {/* Header Area */}
            <motion.div
                className="flex flex-col xl:flex-row xl:items-end justify-between gap-8"
                variants={itemVariants}
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                            <Briefcase className="text-blue-400" size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">我的持仓全景</h1>
                    </div>
                    <p className="text-gray-400 text-lg">实时追踪您的投资组合，享受智能资产管理体验</p>
                </div>

                {/* Actions & Tabs */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="flex items-center p-1 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('holdings')}
                            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'holdings'
                                ? 'bg-white/10 text-white shadow-lg'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            持仓明细
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'analytics'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            量化分析
                            <span className="text-[9px] uppercase tracking-tighter bg-white/20 px-1.5 rounded-sm">Pro</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <AccountSelector />
                        <div className="w-px h-8 bg-white/5 hidden md:block" />
                        <button
                            onClick={() => {
                                if (user?.role === 'guest') {
                                    alert('体验模式无法导入持仓');
                                    return;
                                }
                                setShowImportModal(true);
                            }}
                            className={`flex items-center justify-center gap-2 h-11 px-5 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-xl border border-white/10 transition-all ${user?.role === 'guest' ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                        >
                            <span className="text-base">📸</span>
                            <span>截图识别</span>
                        </button>
                        <button
                            onClick={() => {
                                if (user?.role === 'guest') {
                                    alert('体验模式无法添加持仓');
                                    return;
                                }
                                setShowAddModal(true);
                            }}
                            className={`flex items-center justify-center gap-2 h-11 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all ${user?.role === 'guest' ? 'opacity-50 cursor-not-allowed grayscale' : 'active:scale-95'}`}
                        >
                            <Plus size={18} />
                            <span>新增投资</span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Content Switcher */}
            {activeTab === 'holdings' ? (
                <div className="space-y-10">
                    {/* Summary Section */}
                    {summary && (
                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                            variants={itemVariants}
                        >
                            <Card className="p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] -z-10" />
                                <div className="flex items-center gap-3 mb-4 text-gray-400">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <PieChart size={16} className="text-blue-400" />
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-widest">总投资额</span>
                                </div>
                                <div className="text-3xl font-black text-white font-mono tracking-tighter">
                                    <span className="text-sm text-gray-500 mr-1.5">¥</span>
                                    {summary.total_value.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                    })}
                                </div>
                            </Card>

                            <Card className="p-6 relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] -z-10 ${summary.total_profit >= 0 ? 'bg-gain/5' : 'bg-loss/5'}`} />
                                <div className="flex items-center gap-3 mb-4 text-gray-400">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.total_profit >= 0 ? 'bg-gain/10' : 'bg-loss/10'}`}>
                                        <Trophy size={16} className={summary.total_profit >= 0 ? 'text-gain' : 'text-loss'} />
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-widest">累计收益盈亏</span>
                                </div>
                                <div className={`text-3xl font-black font-mono tracking-tighter ${summary.total_profit >= 0 ? 'text-gain' : 'text-loss'}`}>
                                    <span className="text-sm mr-1.5 opacity-60">¥</span>
                                    {summary.total_profit >= 0 ? '+' : ''}
                                    {summary.total_profit.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                    })}
                                </div>
                            </Card>

                            <Card className="p-6 relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] -z-10 ${summary.total_profit_rate >= 0 ? 'bg-gain/5' : 'bg-loss/5'}`} />
                                <div className="flex items-center gap-3 mb-4 text-gray-400">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.total_profit_rate >= 0 ? 'bg-gain/10' : 'bg-loss/10'}`}>
                                        <Activity size={16} className={summary.total_profit_rate >= 0 ? 'text-gain' : 'text-loss'} />
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-widest">总盈亏率</span>
                                </div>
                                <div className={`text-3xl font-black font-mono tracking-tighter ${summary.total_profit_rate >= 0 ? 'text-gain' : 'text-loss'}`}>
                                    {summary.total_profit_rate >= 0 ? '+' : ''}
                                    {(summary.total_profit_rate || 0).toFixed(2)}
                                    <span className="text-lg ml-0.5">%</span>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                        {/* Holdings Detail Container */}
                        <motion.div className="lg:col-span-3 space-y-6" variants={itemVariants}>
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-white tracking-tight">资产布局明细</h2>
                                    <Badge variant="default">{holdings.length} 只基金</Badge>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Card key={i} className="p-6 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
                                                <div className="space-y-2">
                                                    <div className="h-4 w-32 bg-white/5 rounded-md animate-pulse" />
                                                    <div className="h-3 w-16 bg-white/5 rounded-md animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                                                <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : holdings.length === 0 ? (
                                <Card className="py-20 text-center border-dashed border-white/10">
                                    <div className="w-20 h-20 rounded-3xl bg-white/5 mx-auto mb-6 flex items-center justify-center">
                                        <Briefcase size={32} className="text-gray-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">资产清单空空如也</h3>
                                    <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">开始您的财富增长之旅。现在添加第一笔持仓，我们的 AI 将为您进行全面分析。</p>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="h-11 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                                    >
                                        立即添加
                                    </button>
                                </Card>
                            ) : (
                                <Card className="overflow-hidden border-white/5 shadow-2xl">
                                    <HoldingsTable holdings={holdings} onRemove={handleRemove} />
                                </Card>
                            )}
                        </motion.div>

                        {/* Achievements Sidebar */}
                        <motion.div className="space-y-6" variants={itemVariants}>
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Trophy size={18} className="text-amber-400" />
                                    <h2 className="text-lg font-bold text-white">投资里程碑</h2>
                                </div>
                                <button
                                    onClick={toggleAchievement}
                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                                >
                                    查看全部
                                </button>
                            </div>

                            <div className="space-y-3">
                                {achievements.length === 0 ? (
                                    <Card className="p-8 text-center bg-white/[0.01]">
                                        <Trophy
                                            size={24}
                                            className="mx-auto text-gray-700 mb-3"
                                        />
                                        <p className="text-xs text-gray-500 font-medium">
                                            继续累计收益即刻解锁稀有成就
                                        </p>
                                    </Card>
                                ) : (
                                    achievements.slice(0, 5).map((achievement) => (
                                        <motion.div
                                            key={achievement.id}
                                            whileHover={{ x: 5 }}
                                            transition={{ type: "spring" as const, stiffness: 400, damping: 10 }}
                                        >
                                            <AchievementBadge achievement={achievement} />
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-1"
                >
                    <AnalyticsDashboard />
                </motion.div>
            )}

            {/* Modals with premium styling */}
            <AddHoldingModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddHolding}
            />

            <ImportHoldingsModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
            />

            <ConfirmDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={async () => {
                    if (deleteConfirm) {
                        const success = await removeHolding(deleteConfirm);
                        if (!success) {
                            // Error is handled by store
                        }
                        setDeleteConfirm(null);
                    }
                }}
                title="删除持仓"
                description="确定要删除这个持仓吗？此操作无法撤销。"
                confirmText="确认删除"
                cancelText="取消"
                isDestructive
            />
        </motion.div>
    );
};

export default Portfolio;
