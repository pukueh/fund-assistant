import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trash2, ArrowRight } from 'lucide-react';
import type { Holding } from '../types';

interface HoldingsTableProps {
    holdings: Holding[];
    onRemove: (fundCode: string) => void;
    onTagsUpdate?: (fundCode: string, newTags: string[]) => void;
}

import { TagManager } from './fund/TagManager';
import { Sparkline } from './charts/Sparkline';

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, onRemove, onTagsUpdate }) => {
    // Deduplicate holdings to prevent key collision
    const uniqueHoldings = React.useMemo(() => {
        const map = new Map();
        holdings.forEach(h => map.set(h.fund_code, h));
        return Array.from(map.values());
    }, [holdings]);

    return (
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="py-4 pl-6 font-bold text-[10px] text-gray-500 uppercase tracking-widest">基金名称</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest">标签管理</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest text-center w-[120px]">30日走势</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right">估算净值</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right">持有总额</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right">持有盈亏</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right">累计收益率</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right">当日涨跌</th>
                        <th className="py-4 font-bold text-[10px] text-gray-500 uppercase tracking-widest text-right pr-6">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                    {uniqueHoldings.map((holding, index) => {
                        const isProfit = (holding.profit || 0) >= 0;
                        const isDayPositive = (holding.day_change || 0) >= 0;

                        return (
                            <motion.tr
                                key={holding.fund_code}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group hover:bg-white/[0.03] transition-colors"
                            >
                                <td className="py-5 pl-6">
                                    <Link to={`/fund/${holding.fund_code}`} className="block group/link">
                                        <div className="font-bold text-white group-hover/link:text-blue-400 transition-colors truncate max-w-[200px] tracking-tight">
                                            {holding.fund_name}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 tracking-tighter uppercase">
                                            {holding.fund_code}
                                        </div>
                                    </Link>
                                </td>

                                <td className="py-5">
                                    <div className="max-w-[180px]">
                                        <TagManager
                                            fundCode={holding.fund_code}
                                            initialTags={holding.tags || []}
                                            onTagsUpdate={(newTags) => onTagsUpdate?.(holding.fund_code, newTags)}
                                        />
                                    </div>
                                </td>

                                <td className="py-5">
                                    <div className="flex justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                        <Sparkline fundCode={holding.fund_code} height={32} width={100} />
                                    </div>
                                </td>

                                <td className="py-5 text-right">
                                    <div className="font-mono text-sm font-bold text-white">
                                        {holding.estimated_nav?.toFixed(4) || '--'}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-medium">成本: {holding.cost_nav.toFixed(4)}</div>
                                </td>

                                <td className="py-5 text-right">
                                    <div className="font-mono text-sm font-black text-white">
                                        <span className="text-[10px] text-gray-500 mr-1 font-sans">¥</span>
                                        {(holding.current_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </td>

                                <td className="py-5 text-right">
                                    <div className={`font-mono text-sm font-bold flex flex-col items-end ${isProfit ? 'text-gain' : 'text-loss'}`}>
                                        <span>{isProfit ? '+' : ''}{(holding.profit || 0).toFixed(2)}</span>
                                        <div className={`w-1 h-1 rounded-full mt-1 ${isProfit ? 'bg-gain shadow-glow-gain' : 'bg-loss shadow-glow-loss'}`} />
                                    </div>
                                </td>

                                <td className="py-5 text-right">
                                    <div className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-black font-mono border ${isProfit
                                        ? 'bg-gain/10 text-gain border-red-500/20'
                                        : 'bg-loss/10 text-loss border-green-500/20'
                                        }`}>
                                        {isProfit ? '+' : ''}{(holding.profit_rate || 0).toFixed(2)}%
                                    </div>
                                </td>

                                <td className="py-5 text-right">
                                    <div className={`font-mono text-sm font-bold ${isDayPositive ? 'text-gain' : 'text-loss'}`}>
                                        <div className="flex flex-col items-end">
                                            <span>{isDayPositive ? '+' : ''}{(holding.day_change_rate || 0).toFixed(2)}%</span>
                                            <span className="text-[10px] opacity-60">¥{(holding.day_change || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </td>

                                <td className="py-5 text-right pr-6">
                                    <div className="flex items-center justify-end gap-2 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <button
                                            onClick={() => onRemove(holding.fund_code)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                            title="移除持仓"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <Link
                                            to={`/fund/${holding.fund_code}`}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                                            title="查看详情"
                                        >
                                            <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
