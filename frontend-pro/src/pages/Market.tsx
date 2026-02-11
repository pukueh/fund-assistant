/**
 * Fund Assistant Pro - Market Page
 * 
 * Real-time market overview and fund rankings.
 * Features a high-performance data table with glassmorphism design.
 */

import React, { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    ArrowRight
} from 'lucide-react';
import { marketApi } from '../api';
import { Card, Badge } from '../components/ui';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        },
    },
};

interface RankingFund {
    fund_code: string;
    fund_name: string;
    nav: number;
    estimated_nav?: number;
    change_percent: number;
    update_time: string;
}

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

// Optimized Ranking Row
const RankingRow = React.memo<{ fund: RankingFund, idx: number }>(({ fund, idx }) => {
    const isPositive = fund.change_percent >= 0;
    return (
        <motion.tr
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="group hover:bg-white/[0.03] transition-colors"
            role="row"
        >
            <td className="px-6 py-5">
                <div className="flex flex-col">
                    <span className="font-bold text-gray-200 text-sm group-hover:text-blue-400 transition-colors duration-300 truncate max-w-[240px]">{fund.fund_name}</span>
                    <span className="text-[11px] font-mono text-gray-500 uppercase mt-1 tracking-tight group-hover:text-blue-400/50 transition-colors bg-white/5 w-fit px-1.5 py-0.5 rounded" aria-label={`代码: ${fund.fund_code}`}>{fund.fund_code}</span>
                </div>
            </td>
            <td className="px-6 py-5 text-right font-mono font-bold text-gray-300 text-sm tracking-tight">{fund.nav?.toFixed(4)}</td>
            <td className="px-6 py-5 text-right font-mono font-bold text-gray-300 text-sm tracking-tight">{fund.estimated_nav?.toFixed(4) || '--'}</td>
            <td className="px-6 py-5 text-right">
                <Badge
                    variant={isPositive ? 'gain' : 'loss'}
                    className="font-mono text-xs justify-end min-w-[90px] py-1"
                    aria-label={`涨跌幅: ${isPositive ? '+' : ''}${fund.change_percent}%`}
                >
                    <div className="flex items-center gap-1">
                        {isPositive ? <ArrowUpRight size={14} strokeWidth={3} aria-hidden="true" /> : <ArrowDownRight size={14} strokeWidth={3} aria-hidden="true" />}
                        {fund.change_percent?.toFixed(2)}%
                    </div>
                </Badge>
            </td>
            <td className="px-6 py-5 text-right text-gray-500 text-xs font-bold font-mono whitespace-nowrap uppercase tracking-wider">
                {fund.update_time?.split(' ')[1] || fund.update_time}
            </td>
            <td className="px-6 py-5 text-right">
                <Link
                    to={`/fund/${fund.fund_code}`}
                    className="inline-flex items-center justify-center gap-1 h-8 px-4 text-xs font-bold text-gray-300 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-300 uppercase tracking-wider group/btn"
                    aria-label={`查看 ${fund.fund_name} 的行情分析`}
                >
                    Analyze
                    <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" aria-hidden="true" />
                </Link>
            </td>
        </motion.tr>
    );
});

RankingRow.displayName = 'RankingRow';

export const Market: React.FC = () => {
    const [rankings, setRankings] = useState<RankingFund[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sort, setSort] = useState('1r'); // Default sort: 1 day return

    useEffect(() => {
        const fetchRankings = async () => {
            setIsLoading(true);
            try {
                const data = await marketApi.getRankings(sort, 50) as any;
                if (data && data.status === 'success') {
                    setRankings(data.data || []);
                } else if (Array.isArray(data)) {
                    setRankings(data);
                }
            } catch (err) {
                console.error('Failed to fetch rankings:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRankings();
    }, [sort]);

    const sortOptions = [
        { value: '1r', label: '日涨跌' },
        { value: '1w', label: '近一周' },
        { value: '1m', label: '近一月' },
        { value: '3m', label: '近三月' },
        { value: '6m', label: '近六月' },
        { value: '1y', label: '近一年' },
        { value: 'n', label: '今年以来' },
    ];

    const handleSort = (value: string) => {
        if (sort === value) {
            setSort(`${value}_asc`);
        } else if (sort === `${value}_asc`) {
            setSort(value);
        } else {
            setSort(value);
        }
    };

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
                        市场动态仪表盘
                    </h1>
                    <p className="text-gray-400 font-medium max-w-lg">
                        实时追踪全市场基金表现，毫秒级数据更新，助您把握每一个投资机会。
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="搜索基金..."
                            className="bg-black/20 border border-white/10 rounded-2xl py-3 pl-11 pr-4 w-64 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Rankings Section */}
            <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-white/5 shadow-2xl bg-black/20 backdrop-blur-md">
                    <div className="px-6 py-5 border-b border-white/5 bg-white/[0.02] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                <Activity className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white leading-none tracking-tight">基金风云榜</h2>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5 font-bold">Top Performance Rankings</p>
                            </div>
                        </div>

                        {/* Sort Filter - Segmented Control style */}
                        <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm overflow-x-auto no-scrollbar max-w-full">
                            {sortOptions.map(option => {
                                const isActive = sort === option.value || sort === `${option.value}_asc`;
                                const isAsc = sort === `${option.value}_asc`;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSort(option.value)}
                                        className={`relative px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 whitespace-nowrap z-10 flex items-center gap-1 ${isActive
                                            ? 'text-white'
                                            : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeSort"
                                                className="absolute inset-0 bg-white/10 rounded-lg border border-white/5 shadow-sm -z-10"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        {option.label}
                                        {isActive && (
                                            <span className="opacity-70">
                                                {isAsc ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="overflow-x-auto selection:bg-blue-500/30">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/[0.01] border-b border-white/5">
                                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest">基金名称</th>
                                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">最新净值</th>
                                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">估算净值</th>
                                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">涨跌幅</th>
                                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">更新时间</th>
                                    <th className="px-6 py-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-6"><div className="h-4 bg-white/5 rounded w-48"></div></td>
                                            <td className="px-6 py-6"><div className="h-4 bg-white/5 rounded w-16 ml-auto"></div></td>
                                            <td className="px-6 py-6"><div className="h-4 bg-white/5 rounded w-16 ml-auto"></div></td>
                                            <td className="px-6 py-6"><div className="h-4 bg-white/5 rounded w-20 ml-auto"></div></td>
                                            <td className="px-6 py-6"><div className="h-4 bg-white/5 rounded w-24 ml-auto"></div></td>
                                            <td className="px-6 py-6 text-right"><div className="h-8 bg-white/5 rounded-xl w-24 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : (
                                    rankings.map((fund, idx) => (
                                        <RankingRow key={fund.fund_code} fund={fund} idx={idx} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
};

export default Market;
