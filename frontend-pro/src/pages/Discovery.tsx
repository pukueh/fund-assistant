/**
 * Fund Assistant Pro - Discovery Page
 * 
 * Premium fund discovery interface with real-time market movers, 
 * categorized sectors, and intelligent insights.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    Flame,
    Layers,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    ArrowRight
} from 'lucide-react';
import { discoveryApi } from '../api';
import type { Fund, Category } from '../types';
import { Card, Badge } from '../components/ui';

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

// Fund Row Component Optimized with Memo and Accessibility
const FundRow = React.memo<{
    fund: Fund;
    rank?: number;
    showRank?: boolean;
    type?: 'gain' | 'loss' | 'neutral';
}>(({ fund, rank, showRank }) => {
    const { code, name, nav, day_change, type: fundType } = fund;
    const change = day_change ?? 0;
    const isPositive = change >= 0;

    return (
        <Link
            to={`/fund/${code}`}
            className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/5"
            aria-label={`查看基金详情: ${name} (${code})`}
        >
            {showRank && rank && (
                <div
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black shadow-lg ${rank <= 3
                        ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-orange-500/20'
                        : 'bg-white/5 text-gray-500 border border-white/5'
                        }`}
                    aria-hidden="true"
                >
                    {rank}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                    {name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded tracking-tight">
                        {code}
                    </span>
                    {fundType && (
                        <span className="text-[10px] text-gray-400">
                            {fundType}
                        </span>
                    )}
                </div>
            </div>
            <div className="text-right">
                <p className="font-mono text-xs text-gray-300 mb-1">
                    {nav?.toFixed(4) || '--'}
                </p>
                <Badge
                    variant={isPositive ? 'gain' : 'loss'}
                    className={`font-mono text-[10px] tracking-tight ${isPositive ? 'shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'shadow-[0_0_10px_rgba(34,197,94,0.2)]'}`}
                >
                    <span className="flex items-center gap-0.5">
                        {isPositive ? <ArrowUpRight size={10} strokeWidth={3} aria-hidden="true" /> : <ArrowDownRight size={10} strokeWidth={3} aria-hidden="true" />}
                        {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </span>
                </Badge>
            </div>
        </Link>
    );
});

FundRow.displayName = 'FundRow';

// Category Card Component Optimized with Memo and Accessibility
const CategoryCard = React.memo<{ category: Category }>(({ category }) => {
    const { name, slug, icon, day_change, fund_count } = category;
    const change = day_change ?? 0;
    const isPositive = change >= 0;

    return (
        <Link to={`/discovery/view/category/${slug}`} aria-label={`查看板块: ${name}`}>
            <Card className="h-full p-5 hover:bg-white/5 border-white/5 hover:border-white/10 transition-all duration-500 group relative overflow-hidden">
                <div
                    className={`absolute top-0 right-0 w-20 h-20 blur-[50px] -z-10 transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${isPositive ? 'bg-gain/20' : 'bg-loss/20'}`}
                    aria-hidden="true"
                />

                <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                        {icon || '📊'}
                    </div>
                    <Badge variant={isPositive ? 'gain' : 'loss'} className="font-mono">
                        {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </Badge>
                </div>

                <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                    {name}
                </h3>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>{fund_count} 只基金</span>
                    <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" aria-hidden="true" />
                </div>
            </Card>
        </Link>
    );
});

CategoryCard.displayName = 'CategoryCard';

export const Discovery: React.FC = () => {
    const [movers, setMovers] = useState<{
        top_gainers: Fund[];
        top_losers: Fund[];
        most_popular: Fund[];
    } | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [moversData, categoriesData] = await Promise.all([
                    discoveryApi.getDailyMovers(10),
                    discoveryApi.categories.getAll(),
                ]);
                setMovers(moversData);
                setCategories(categoriesData.categories);
            } catch (err) {
                console.error('Failed to fetch discovery data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 space-y-8">
                <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-96 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="p-6 lg:p-10 space-y-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                        发现市场机会
                    </h1>
                    <p className="text-gray-400 font-medium max-w-lg">
                        探索全市场热门基金，追踪资金流向，把握每一个投资风口。
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="搜索基金代码/名称..."
                            className="bg-black/20 border border-white/10 rounded-2xl py-3 pl-11 pr-4 w-full text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all"
                            aria-label="搜索基金"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Daily Movers Section */}
            <motion.section variants={itemVariants} className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-orange-400 to-red-500 rounded-full" />
                        <h2 className="text-xl font-bold text-white tracking-tight">今日行情风向标</h2>
                    </div>
                    <Badge variant="warning" className="animate-pulse">实时数据更新</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
                    {/* Top Gainers */}
                    <Card className="flex flex-col border-white/5 shadow-2xl hover:border-white/10 transition-colors p-0 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[60px] -z-10" />
                        <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 flex items-center justify-center" aria-hidden="true">
                                    <TrendingUp className="text-red-400" size={20} />
                                </div>
                                <header>
                                    <h3 className="font-bold text-white text-base">领涨排行</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Top Gainers</p>
                                </header>
                            </div>
                        </div>
                        <div className="p-2 flex-1">
                            {movers?.top_gainers.slice(0, 5).map((fund, idx) => (
                                <FundRow key={`${fund.code}-${idx}`} fund={fund} rank={idx + 1} showRank type="gain" />
                            ))}
                        </div>
                        <Link
                            to="/discovery/view/gainers"
                            className="p-4 text-center text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 border-t border-white/5 transition-colors flex items-center justify-center gap-1 uppercase tracking-wider"
                        >
                            View All <ChevronRight size={14} />
                        </Link>
                    </Card>

                    {/* Top Losers */}
                    <Card className="flex flex-col border-white/5 shadow-2xl hover:border-white/10 transition-colors p-0 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] -z-10" />
                        <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center" aria-hidden="true">
                                    <TrendingDown className="text-emerald-400" size={20} />
                                </div>
                                <header>
                                    <h3 className="font-bold text-white text-base">领跌排行</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Top Losers</p>
                                </header>
                            </div>
                        </div>
                        <div className="p-2 flex-1">
                            {movers?.top_losers.slice(0, 5).map((fund, idx) => (
                                <FundRow key={`${fund.code}-${idx}`} fund={fund} rank={idx + 1} showRank type="loss" />
                            ))}
                        </div>
                        <Link
                            to="/discovery/view/losers"
                            className="p-4 text-center text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 border-t border-white/5 transition-colors flex items-center justify-center gap-1 uppercase tracking-wider"
                        >
                            View All <ChevronRight size={14} />
                        </Link>
                    </Card>

                    {/* Most Popular */}
                    <Card className="flex flex-col border-white/5 shadow-2xl hover:border-white/10 transition-colors p-0 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] -z-10" />
                        <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center" aria-hidden="true">
                                    <Flame className="text-blue-400" size={20} />
                                </div>
                                <header>
                                    <h3 className="font-bold text-white text-base">热门关注</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Most Popular</p>
                                </header>
                            </div>
                        </div>
                        <div className="p-2 flex-1">
                            {movers?.most_popular.slice(0, 5).map((fund, idx) => (
                                <FundRow key={`${fund.code}-${idx}`} fund={fund} rank={idx + 1} showRank />
                            ))}
                        </div>
                        <Link
                            to="/discovery/view/popular"
                            className="p-4 text-center text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 border-t border-white/5 transition-colors flex items-center justify-center gap-1 uppercase tracking-wider"
                        >
                            View All <ChevronRight size={14} />
                        </Link>
                    </Card>
                </div>
            </motion.section>

            {/* Categories */}
            <motion.section variants={itemVariants} className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full" />
                        <h2 className="text-xl font-bold text-white tracking-tight">热门板块分类</h2>
                    </div>
                    <Link
                        to="/discovery/view/categories"
                        className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 transition-colors uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                        View All Sectors <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {categories.slice(0, 10).map((category, idx) => (
                        <motion.div key={category.id || category.slug || idx} variants={itemVariants}>
                            <CategoryCard category={category} />
                        </motion.div>
                    ))}
                    {/* View More Card */}
                    <motion.div variants={itemVariants}>
                        <Link to="/discovery/view/categories">
                            <Card className="h-full min-h-[140px] p-5 hover:bg-white/5 border-white/5 hover:border-white/10 transition-all duration-300 group flex flex-col items-center justify-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                    <Layers size={24} />
                                </div>
                                <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">查看更多板块</span>
                            </Card>
                        </Link>
                    </motion.div>
                </div>
            </motion.section>
        </motion.div>
    );
};

export default Discovery;
