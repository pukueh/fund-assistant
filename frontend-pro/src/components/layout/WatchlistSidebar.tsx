import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useMarketStore } from '../../store';
import { fundApi } from '../../api';

const WatchlistItem: React.FC<{ code: string; onRemove: (code: string) => void }> = ({ code, onRemove }) => {
    const navigate = useNavigate();
    const { data: fund, isLoading, isError } = useQuery({
        queryKey: ['fund', code, 'nav'],
        queryFn: () => fundApi.getNav(code),
        staleTime: 60000, // 1 minute
    });

    if (isLoading) return <div className="h-16 bg-white/5 rounded-lg animate-pulse" />;

    if (isError || !fund) return (
        <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <span className="text-red-400 text-sm">Failed to load {code}</span>
            <button onClick={(e) => { e.stopPropagation(); onRemove(code); }} className="text-white/40 hover:text-red-400">
                <Trash2 size={14} />
            </button>
        </div>
    );

    const change = parseFloat(fund.day_growth || '0');
    const isPositive = change >= 0;

    return (
        <div
            onClick={() => navigate(`/fund/${code}`)}
            className="group relative flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all border border-transparent hover:border-white/10"
        >
            <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium truncate">{fund.fund_name}</span>
                    <span className="text-xs text-white/40 font-mono">{code}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold font-mono text-white">{fund.nav}</span>
                    <span className={`text-sm font-medium flex items-center ${isPositive ? 'text-gain' : 'text-loss'}`}>
                        {isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                        {change > 0 ? '+' : ''}{change}%
                    </span>
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onRemove(code); }}
                className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-400 transition-opacity"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};

export const WatchlistSidebar: React.FC = () => {
    const { watchlist, isWatchlistOpen, toggleWatchlist, removeFromWatchlist } = useMarketStore();

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isWatchlistOpen) toggleWatchlist();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isWatchlistOpen, toggleWatchlist]);

    return (
        <>
            {/* Backdrop */}
            {isWatchlistOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                    onClick={toggleWatchlist}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-[#12121a] border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out ${isWatchlistOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Star className="text-yellow-500" size={20} fill="currentColor" />
                        <h2 className="text-lg font-bold text-white">我的自选</h2>
                        <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/60">
                            {watchlist.length}
                        </span>
                    </div>
                    <button
                        onClick={toggleWatchlist}
                        className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-3 h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {watchlist.length === 0 ? (
                        <div className="text-center py-12 text-white/40">
                            <Star size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm">暂无自选基金</p>
                            <p className="text-xs mt-2">点击基金详情页的 "加入自选" 添加</p>
                        </div>
                    ) : (
                        watchlist.map(code => (
                            <WatchlistItem
                                key={code}
                                code={code}
                                onRemove={removeFromWatchlist}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
