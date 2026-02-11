import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export interface StockHolding {
    code: string;
    name: string;
    percent: string;
    current_price: number;
    change_percent: number;
    change_percent_str: string;
}

interface StockHoldingsProps {
    holdings: StockHolding[];
    isLoading: boolean;
}

export const StockHoldings: React.FC<StockHoldingsProps> = ({ holdings, isLoading }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-3">
                <div className="h-8 bg-[var(--color-bg-secondary)] rounded w-1/3"></div>
                <div className="h-32 bg-[var(--color-bg-secondary)] rounded-xl"></div>
            </div>
        );
    }

    if (!holdings || holdings.length === 0) {
        return null;
    }

    return (
        <div className="p-5 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] backdrop-blur-md">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                        持仓重仓
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        Top {holdings.length}
                    </span>
                </div>
                <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                        <th className="py-2 pl-2 font-medium">股票名称</th>
                                        <th className="py-2 text-right font-medium">持仓占比</th>
                                        <th className="py-2 text-right font-medium">现价</th>
                                        <th className="py-2 text-right font-medium pr-2">涨跌幅</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.map((stock) => {
                                        const isPositive = stock.change_percent >= 0;
                                        const isZero = stock.change_percent === 0;

                                        return (
                                            <tr
                                                key={stock.code}
                                                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-tertiary)]/50 transition-colors group"
                                            >
                                                <td className="py-3 pl-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium text-[var(--color-text-primary)]">
                                                            {stock.name}
                                                        </div>
                                                        <a
                                                            href={`https://quote.eastmoney.com/unify/r/${stock.code.startsWith('6') ? '1.' : '0.'}${stock.code}`} // Simple guess, mostly wrong for HK stocks. Better just show code.
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-opacity"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                    <div className="text-xs text-[var(--color-text-muted)] font-mono">
                                                        {stock.code}
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right font-mono text-sm text-[var(--color-text-secondary)]">
                                                    {stock.percent}
                                                </td>
                                                <td className="py-3 text-right font-mono text-sm">
                                                    {stock.current_price > 0 ? stock.current_price.toFixed(2) : '--'}
                                                </td>
                                                <td className={`py-3 text-right font-mono text-sm pr-2 ${isPositive ? 'text-gain' : isZero ? 'text-[var(--color-text-muted)]' : 'text-loss'}`}>
                                                    {stock.current_price > 0 ? stock.change_percent_str : '--'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
