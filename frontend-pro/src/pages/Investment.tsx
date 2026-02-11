
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    TrendingUp,
    Calendar,
    AlertCircle,
    Plus,
    Play,
    Pause,
    XOctagon,
    Clock,
    Target,
    ArrowRight,
    Loader2,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { InvestmentWizard } from '../components/InvestmentWizard';
import { investmentApi } from '../api/investment';
import type { InvestmentPlan } from '../types';
import { Card } from '../components/ui';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        },
    },
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
    },
};

const PlanCard = React.memo<{
    plan: InvestmentPlan;
    onPause: (id: number) => void;
    onResume: (id: number) => void;
    onCancel: (id: number) => void;
}>(({ plan, onPause, onResume, onCancel }) => {
    const { id, fund_name, fund_code, status, amount, frequency, total_invested, total_shares, next_date, bargain_nav } = plan;

    return (
        <motion.div variants={itemVariants} className="bg-[#12121a] border border-white/5 rounded-2xl p-6 hover:border-[#00d4aa]/30 transition-colors group">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">{fund_name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${status === 'active' ? 'bg-[#00d4aa]/10 text-[#00d4aa]' :
                            status === 'paused' ? 'bg-yellow-500/10 text-yellow-500' :
                                'bg-red-500/10 text-red-500'
                            }`}>
                            {status === 'active' ? '进行中' :
                                status === 'paused' ? '已暂停' : '已终止'}
                        </span>
                    </div>
                    <div className="text-sm text-gray-400 font-mono" aria-label={`基金代码: ${fund_code}`}>{fund_code}</div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {status === 'active' ? (
                        <button
                            onClick={() => onPause(id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                            aria-label="暂停计划"
                            title="暂停计划"
                        >
                            <Pause size={18} />
                        </button>
                    ) : status === 'paused' ? (
                        <button
                            onClick={() => onResume(id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                            aria-label="恢复计划"
                            title="恢复计划"
                        >
                            <Play size={18} />
                        </button>
                    ) : null}
                    {status !== 'cancelled' && (
                        <button
                            onClick={() => onCancel(id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-500"
                            aria-label="终止计划"
                            title="终止计划"
                        >
                            <XOctagon size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">定投金额</div>
                    <div className="text-lg font-bold text-white font-mono">¥{amount.toLocaleString()}</div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">频率</div>
                    <div className="text-lg font-bold text-white">
                        {frequency === 'weekly' ? '每周' :
                            frequency === 'biweekly' ? '每两周' : '每月'}
                    </div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">累计投入</div>
                    <div className="text-lg font-bold text-white font-mono">¥{(total_invested || 0).toLocaleString()}</div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">累计份额</div>
                    <div className="text-lg font-bold text-white font-mono">{(total_shares || 0).toFixed(2)}</div>
                </div>
            </div>

            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={14} aria-hidden="true" />
                    <span className="text-xs">下次扣款: <span className="font-mono">{next_date || '未定'}</span></span>
                </div>
                {bargain_nav && (
                    <div className="flex items-center gap-2 text-[#00d4aa]">
                        <ArrowRight size={14} aria-hidden="true" />
                        <span className="text-xs font-bold">低吸目标: <span className="font-mono">{bargain_nav.toFixed(4)}</span></span>
                    </div>
                )}
            </div>
        </motion.div>
    );
});

PlanCard.displayName = 'PlanCard';

const Investment = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'plans' | 'alerts'>('plans');
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Queries
    const { data: plansData, isLoading: plansLoading } = useQuery({
        queryKey: ['investment-plans'],
        queryFn: investmentApi.plans.get,
    });

    const { data: alertsData, isLoading: alertsLoading } = useQuery({
        queryKey: ['investment-alerts'],
        queryFn: () => investmentApi.alerts.get(false),
    });

    // Mutations
    const pauseMutation = useMutation({
        mutationFn: investmentApi.plans.pause,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investment-plans'] }),
    });

    const resumeMutation = useMutation({
        mutationFn: investmentApi.plans.resume,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investment-plans'] }),
    });

    const cancelMutation = useMutation({
        mutationFn: investmentApi.plans.cancel,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investment-plans'] }),
    });

    const plans = plansData?.plans || [];
    const alerts = alertsData?.alerts || [];

    const activePlansCount = plans.filter(p => p.status === 'active').length;
    const totalInvested = plans.reduce((sum, p) => sum + (p.total_invested || 0), 0);

    return (
        <motion.div
            className="p-8 space-y-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-[#00d4aa]/10 flex items-center justify-center border border-[#00d4aa]/20 shadow-inner">
                            <Target className="text-[#00d4aa]" size={22} />
                        </div>
                        <span className="text-[10px] font-black text-[#00d4aa] uppercase tracking-[0.3em]">Wealth Builder</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                        智能定投中心
                    </h1>
                    <p className="text-gray-400 font-medium">自动化定额投资计划，穿越牛熊波动的资产增值引擎</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[#00d4aa] text-black font-black text-sm rounded-xl hover:bg-[#00d4aa]/90 transition-all shadow-lg shadow-[#00d4aa]/20 active:scale-95 uppercase tracking-wider"
                    aria-label="新建定投计划"
                >
                    <Plus size={20} strokeWidth={3} />
                    新建定投计划
                </button>
            </motion.div>

            {/* Summary Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 relative overflow-hidden group border-white/5 bg-white/[0.02]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] -z-10" aria-hidden="true" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">总投入资金</span>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white font-mono">¥{totalInvested.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Cumulative Principal</div>
                </Card>

                <Card className="p-6 relative overflow-hidden group border-white/5 bg-white/[0.02]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4aa]/5 blur-[50px] -z-10" aria-hidden="true" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">运行中计划</span>
                        <div className="w-10 h-10 rounded-xl bg-[#00d4aa]/10 flex items-center justify-center text-[#00d4aa] border border-[#00d4aa]/20">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white font-mono">{activePlansCount}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Active Strategies</div>
                </Card>

                <Card className="p-6 relative overflow-hidden group border-white/5 bg-white/[0.02]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] -z-10" aria-hidden="true" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">下次扣款</span>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white">3天内</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Next Execution Window</div>
                </Card>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={itemVariants} className="flex items-center gap-8 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('plans')}
                    className={`pb-4 px-2 text-sm font-black transition-all relative ${activeTab === 'plans' ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    我的计划
                    {activeTab === 'plans' && (
                        <motion.div layoutId="activeTabPlan" className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00d4aa] shadow-[0_0_10px_rgba(0,212,170,0.5)]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`pb-4 px-2 text-sm font-black transition-all relative ${activeTab === 'alerts' ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    提醒消息
                    {alerts.filter(a => !a.is_read).length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full" aria-label={`${alerts.filter(a => !a.is_read).length} 条未读提醒`}>
                            {alerts.filter(a => !a.is_read).length}
                        </span>
                    )}
                    {activeTab === 'alerts' && (
                        <motion.div layoutId="activeTabPlan" className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00d4aa] shadow-[0_0_10px_rgba(0,212,170,0.5)]" />
                    )}
                </button>
            </motion.div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'plans' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plansLoading ? (
                            <div className="col-span-2 flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                                <Loader2 className="animate-spin text-[#00d4aa]" size={40} />
                                <span className="font-bold text-xs tracking-widest uppercase">Fetching Plans...</span>
                            </div>
                        ) : plans.length === 0 ? (
                            <motion.div variants={itemVariants} className="col-span-2 text-center py-24 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-600 border border-white/5">
                                    <Target size={40} />
                                </div>
                                <h3 className="text-xl font-black text-white mb-2">暂无定投计划</h3>
                                <p className="text-gray-500 mb-8 max-w-xs font-medium">开启自动化投资计划，让 AI 助您平滑持仓成本，建立长期财富基石。</p>
                                <button
                                    onClick={() => setIsWizardOpen(true)}
                                    className="px-10 py-3 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all border border-white/10 hover:border-[#00d4aa]/30 active:scale-95 uppercase tracking-widest text-xs"
                                >
                                    立即开启首个计划
                                </button>
                            </motion.div>
                        ) : (
                            plans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    onPause={(id) => pauseMutation.mutate(id)}
                                    onResume={(id) => resumeMutation.mutate(id)}
                                    onCancel={(id) => cancelMutation.mutate(id)}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alertsLoading ? (
                            <div className="text-center text-gray-500 py-10">加载中...</div>
                        ) : alerts.length === 0 ? (
                            <div className="text-center py-20 bg-[#12121a] rounded-2xl border border-white/5">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <AlertCircle size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">暂无提醒</h3>
                                <p className="text-gray-400">当基金净值触达低吸目标时，这里会出现提醒</p>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`bg-[#12121a] border border-white/5 rounded-xl p-4 flex items-start gap-4 ${!alert.is_read ? 'border-l-4 border-l-[#00d4aa]' : ''}`}>
                                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center ${alert.type === 'bargain' ? 'bg-[#00d4aa]/10 text-[#00d4aa]' :
                                        alert.type === 'target' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-purple-500/10 text-purple-500'
                                        }`}>
                                        <AlertCircle size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-white">
                                                {alert.type === 'bargain' ? '低吸机会' :
                                                    alert.type === 'target' ? '止盈提醒' : '调仓建议'}
                                            </span>
                                            <span className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-400">{alert.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            {/* Investment Wizard Modal */}
            <InvestmentWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />
        </motion.div>
    );
};

export default Investment;
