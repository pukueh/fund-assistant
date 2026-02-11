
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Zap,
    Trophy,
    Target,
    Activity,
    UserPlus,
    Users,
    ChevronRight
} from 'lucide-react';
import { shadowApi } from '../api/shadow';
import { ShadowWizard } from '../components/ShadowWizard';
import { Card, Badge } from '../components/ui';
import type { Blogger, BloggerRanking } from '../types';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
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

const BloggerCard = React.memo<{
    blogger: Blogger;
    onUnfollow: (id: number) => void;
}>(({ blogger, onUnfollow }) => (
    <Card className="bg-black/20 border-white/5 hover:border-emerald-500/30 transition-colors group overflow-hidden">
        <div className="p-6">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-black text-lg border border-white/10 shadow-lg"
                        aria-hidden="true"
                    >
                        {blogger.name?.[0]}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg tracking-tight">{blogger.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 h-5">
                                {blogger.platform}
                            </Badge>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
                                {blogger.followers_count ? `${(blogger.followers_count / 10000).toFixed(1)}w 粉丝` : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onUnfollow(blogger.id)}
                    className="text-gray-600 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-lg"
                    aria-label={`取消关注 ${blogger.name}`}
                    title="取消关注"
                >
                    <Users size={18} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        <Target size={12} aria-hidden="true" />
                        近期胜率
                    </div>
                    <div className="text-xl font-bold text-white font-mono">{blogger.win_rate ? (blogger.win_rate * 100).toFixed(0) : '--'}%</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        <Trophy size={12} aria-hidden="true" />
                        Alpha
                    </div>
                    <div className="text-xl font-bold text-emerald-400 font-mono">{blogger.alpha ? blogger.alpha.toFixed(2) : '--'}</div>
                </div>
            </div>

            <button className="w-full py-3 bg-white/5 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-white/10 uppercase tracking-wider group/btn">
                查看持仓分析
                <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
        </div>
    </Card>
));

BloggerCard.displayName = 'BloggerCard';

const RankingRow = React.memo<{
    item: BloggerRanking;
    index: number;
}>(({ item, index }) => (
    <tr className="hover:bg-white/[0.03] transition-colors group" role="row">
        <td className="px-6 py-5 whitespace-nowrap">
            <div
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow-lg ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-black' :
                    index === 1 ? 'bg-gradient-to-br from-gray-100 to-gray-300 text-black' :
                        index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-black' : 'text-gray-500 bg-white/5'
                    }`}
                aria-label={`排名第 ${index + 1}`}
            >
                {index + 1}
            </div>
        </td>
        <td className="px-6 py-5 whitespace-nowrap">
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-xs font-black border border-white/10 shadow-md"
                    aria-hidden="true"
                >
                    {item.name[0]}
                </div>
                <div>
                    <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">{item.name}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.platform}</div>
                </div>
            </div>
        </td>
        <td className={`px-6 py-5 whitespace-nowrap text-right font-mono font-bold ${item.total_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {item.total_return >= 0 ? '+' : ''}{item.total_return}%
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-right text-gray-300 font-mono">
            {item.alpha.toFixed(2)}
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-right text-gray-300 font-mono">
            {item.sharpe_ratio.toFixed(2)}
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-right text-gray-300 font-mono">
            {(item.win_rate * 100).toFixed(0)}%
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-right">
            <button
                className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                aria-label={`关注博主 ${item.name}`}
            >
                关注
            </button>
        </td>
    </tr>
));

RankingRow.displayName = 'RankingRow';

const Shadow = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'following' | 'ranking'>('following');
    const [rankingPeriod, setRankingPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
    const [rankingSort, setRankingSort] = useState<'alpha' | 'total_return' | 'sharpe_ratio'>('alpha');
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Queries
    const { data: followingData, isLoading: followingLoading } = useQuery({
        queryKey: ['shadow-following'],
        queryFn: () => shadowApi.bloggers.list(true),
    });

    const { data: rankingData, isLoading: rankingLoading } = useQuery({
        queryKey: ['shadow-ranking', rankingPeriod, rankingSort],
        queryFn: () => shadowApi.ranking.get(rankingPeriod, rankingSort),
    });

    const { data: topPicksData } = useQuery({
        queryKey: ['shadow-top-picks'],
        queryFn: () => shadowApi.ranking.topPicks(3),
    });

    const following = followingData?.bloggers || [];
    const ranking = rankingData?.ranking || [];
    const topPicks = topPicksData?.top_picks || [];

    // Mutations
    const unfollowMutation = useMutation({
        mutationFn: (id: number) => shadowApi.bloggers.stopTracking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shadow-following'] });
        },
    });

    return (
        <motion.div
            className="p-6 lg:p-10 space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                        影子追踪
                    </h1>
                    <p className="text-gray-400 font-medium max-w-lg">
                        跟踪市场顶级投资者的持仓，复刻他们的超额收益策略。
                    </p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                    <UserPlus size={18} />
                    添加追踪对象
                </button>
            </motion.div>

            {/* Top Picks / Recommendations (Only show on Following tab) */}
            {activeTab === 'following' && topPicks.length > 0 && (
                <motion.div variants={itemVariants}>
                    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 shadow-[0_0_30px_rgba(245,158,11,0.05)] overflow-hidden">
                        <div className="px-6 py-4 flex items-center gap-3 border-b border-amber-500/10">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <Zap className="text-amber-500" size={18} fill="currentColor" />
                            </div>
                            <h3 className="text-lg font-black text-white tracking-tight">本周精选</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {topPicks.map((pick) => (
                                <div key={pick.blogger_id} className="bg-black/20 rounded-2xl p-5 hover:bg-black/40 transition-colors cursor-pointer border border-white/5 hover:border-amber-500/30 group">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-white text-lg">{pick.name}</span>
                                        <Badge variant="warning" className="font-mono font-bold">
                                            Alpha: {pick.alpha.toFixed(2)}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed group-hover:text-gray-300 transition-colors">{pick.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Tabs */}
            <motion.div variants={itemVariants} className="flex items-center gap-8 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('following')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'following' ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    我的关注
                    {activeTab === 'following' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('ranking')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'ranking' ? 'text-white' : 'text-gray-400 hover:text-white'
                        }`}
                >
                    大神榜单
                    {activeTab === 'ranking' && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    )}
                </button>
            </motion.div>

            {/* Content */}
            <motion.div variants={itemVariants} className="min-h-[400px]">
                {activeTab === 'following' ? (
                    <div className="space-y-4">
                        {followingLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                                <Zap className="animate-pulse text-emerald-500" size={48} />
                                <span className="font-bold text-sm tracking-widest uppercase">Loading Trackers...</span>
                            </div>
                        ) : following.length === 0 ? (
                            <div className="text-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-gray-600 border border-white/5">
                                    <Users size={40} />
                                </div>
                                <h3 className="text-xl font-black text-white mb-2">暂无关注</h3>
                                <p className="text-gray-500 mb-8 font-medium">关注优秀博主，获取他们的持仓动态</p>
                                <button
                                    onClick={() => setActiveTab('ranking')}
                                    className="px-8 py-3 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all border border-white/10 hover:border-emerald-500/30 active:scale-95"
                                >
                                    浏览大神榜单
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {following.map((blogger) => (
                                    <BloggerCard
                                        key={blogger.id}
                                        blogger={blogger}
                                        onUnfollow={(id) => unfollowMutation.mutate(id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Filter Bar */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-1 bg-black/20 rounded-xl p-1 border border-white/5 w-fit backdrop-blur-sm">
                                {(['1M', '3M', '6M', '1Y'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setRankingPeriod(p)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${rankingPeriod === p ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            <div className="relative">
                                <select
                                    value={rankingSort}
                                    onChange={(e) => setRankingSort(e.target.value as 'alpha' | 'total_return' | 'sharpe_ratio')}
                                    className="appearance-none bg-black/20 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer hover:bg-white/5"
                                >
                                    <option value="alpha">按 Alpha 排序</option>
                                    <option value="total_return">按 收益率 排序</option>
                                    <option value="sharpe_ratio">按 夏普比率 排序</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <Activity size={14} className="rotate-90" />
                                </div>
                            </div>
                        </div>

                        {rankingLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                                <Zap className="animate-pulse text-emerald-500" size={48} />
                                <span className="font-bold text-sm tracking-widest uppercase">Loading Rankings...</span>
                            </div>
                        ) : (
                            <Card className="overflow-hidden border-white/5 shadow-2xl bg-black/20 backdrop-blur-md">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">排名</th>
                                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">博主</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">收益率</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Alpha</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">夏普比率</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">胜率</th>
                                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {ranking.map((item, index) => (
                                                <RankingRow key={item.blogger_id} item={item} index={index} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </motion.div>
            {/* Shadow Wizard Modal */}
            <ShadowWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />
        </motion.div>
    );
};

export default Shadow;
