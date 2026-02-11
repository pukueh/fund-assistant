/**
 * Fund Assistant Pro - Header Component
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Command, Loader2, Star } from 'lucide-react';
import { discoveryApi } from '../../api';
import { useMarketStore } from '../../store';
import type { Fund } from '../../types';

interface HeaderProps {
    title?: string;
}

export function Header({ title }: HeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Fund[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const navigate = useNavigate();
    const headersRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const result = await discoveryApi.searchFunds(searchQuery);
                setSearchResults(result.funds || []);
                setShowDropdown(true);
            } catch (err) {
                console.error('Search failed:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (headersRef.current && !headersRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim() && searchResults.length > 0) {
            navigate(`/fund/${searchResults[0].code}`);
            setShowDropdown(false);
            setSearchQuery('');
        }
    };

    const handleResultClick = (code: string) => {
        navigate(`/fund/${code}`);
        setShowDropdown(false);
        setSearchQuery('');
    };

    return (
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-[#0a0a0f]">
            {/* Left: Title */}
            <div className="flex items-center gap-4">
                {title && (
                    <h2 className="text-xl font-semibold text-white">
                        {title}
                    </h2>
                )}
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-md mx-8 relative" ref={headersRef}>
                <form onSubmit={handleSubmit} className="relative">
                    <div className="relative">
                        {isSearching ? (
                            <Loader2
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00d4aa] animate-spin"
                                size={18}
                            />
                        ) : (
                            <Search
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                size={18}
                            />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="搜索基金代码或名称..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            className="w-full pl-10 pr-12 py-2.5 bg-[#12121a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa]/50 focus:ring-2 focus:ring-[#00d4aa]/20"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500">
                            <Command size={14} />
                            <span className="text-xs">K</span>
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#12121a] border border-white/10 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                            {searchResults.map((fund: Fund) => (
                                <button
                                    key={fund.code}
                                    type="button"
                                    onClick={() => handleResultClick(fund.code)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                                >
                                    <div>
                                        <div className="text-white font-medium">{fund.name}</div>
                                        <div className="text-sm text-gray-500">{fund.code}</div>
                                    </div>
                                    {fund.day_change !== undefined && (
                                        <span className={`font-mono text-sm ${fund.day_change >= 0 ? 'text-gain' : 'text-loss'}`}>
                                            {fund.day_change >= 0 ? '+' : ''}{fund.day_change.toFixed(2)}%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {showDropdown && searchQuery.trim() && searchResults.length === 0 && !isSearching && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#12121a] border border-white/10 rounded-lg shadow-lg p-4 text-center text-gray-500 z-50">
                            未找到匹配的基金
                        </div>
                    )}
                </form>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <button
                    className="p-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-yellow-400 transition-colors"
                    onClick={() => useMarketStore.getState().toggleWatchlist()}
                    aria-label="我的自选"
                >
                    <Star size={20} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <div className="relative" ref={notificationsRef}>
                    <button
                        className={`p-2.5 rounded-lg transition-colors relative ${showNotifications ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        onClick={() => setShowNotifications(!showNotifications)}
                        aria-label="通知"
                    >
                        <Bell size={20} />
                        {!showNotifications && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <span className="font-semibold text-white">通知中心</span>
                                <span className="text-[10px] bg-[#00d4aa]/20 text-[#00d4aa] px-1.5 py-0.5 rounded">2 条新消息</span>
                            </div>
                            <div className="p-2 max-h-96 overflow-y-auto">
                                <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                            🤖
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-white group-hover:text-[#00d4aa] transition-colors">AI 投顾已就绪</div>
                                            <div className="text-xs text-gray-500 mt-1">我是您的专属智能助手，已为您准备好今日市场行情分析。</div>
                                            <div className="text-[10px] text-gray-600 mt-2">1分钟前</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                            📊
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-white group-hover:text-[#00d4aa] transition-colors">持仓数据已更新</div>
                                            <div className="text-xs text-gray-500 mt-1">所有的基金持仓估值已根据最新净值完成更新。</div>
                                            <div className="text-[10px] text-gray-600 mt-2">10分钟前</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 text-center">
                                <button className="text-xs text-gray-400 hover:text-white transition-colors">查看全部历史通知</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
