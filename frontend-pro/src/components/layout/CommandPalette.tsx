import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, LayoutDashboard, Briefcase, Plus, RefreshCw,
    Moon, Sun, Eye, EyeOff, Bot, Sparkles, AlertTriangle,
    ArrowRight, Command, Brain
} from 'lucide-react';
import { useThemeStore } from '../../store';

interface CommandItem {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    category: string;
    shortcut?: string[];
    action: () => void;
}

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredItems, setFilteredItems] = useState<CommandItem[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useThemeStore();

    // Default commands
    const commands: CommandItem[] = [
        {
            id: 'nav-dashboard',
            title: '仪表盘',
            desc: '返回主页仪表盘',
            icon: <LayoutDashboard size={18} />,
            category: '导航',
            shortcut: ['G', 'D'],
            action: () => navigate('/')
        },
        {
            id: 'nav-discovery',
            title: '行情中心',
            desc: '查看全球市场行情',
            icon: <Command size={18} />,
            category: '导航',
            action: () => navigate('/discovery')
        },
        {
            id: 'nav-portfolio',
            title: '我的持仓',
            desc: '查看持仓详情',
            icon: <Briefcase size={18} />,
            category: '导航',
            shortcut: ['G', 'P'],
            action: () => navigate('/portfolio')
        },
        {
            id: 'nav-analysis',
            title: '智能分析',
            desc: '深度基金分析',
            icon: <Sparkles size={18} />,
            category: '导航',
            action: () => navigate('/fund')
        },
        // Actions
        {
            id: 'action-add',
            title: '添加持仓',
            desc: '记录新的基金投资',
            icon: <Plus size={18} />,
            category: '操作',
            action: () => {
                navigate('/portfolio');
            }
        },
        {
            id: 'action-refresh',
            title: '刷新数据',
            desc: '重新加载页面数据',
            icon: <RefreshCw size={18} />,
            category: '操作',
            action: () => window.location.reload()
        },
        {
            id: 'action-watchlist',
            title: '我的自选',
            desc: '查看自选基金列表',
            icon: <Eye size={18} />,
            category: '操作',
            shortcut: ['W'],
            action: () => {
                // Import and toggle watchlist
                import('../../store').then(m => m.useMarketStore.getState().toggleWatchlist());
            }
        },
        {
            id: 'action-achievement',
            title: '我的成就',
            desc: '查看解锁的成就',
            icon: <AlertTriangle size={18} />,
            category: '操作',
            action: () => {
                import('../../store').then(m => m.usePortfolioStore.getState().toggleAchievement());
            }
        },
        // View
        {
            id: 'view-theme',
            title: '切换主题',
            desc: `切换到${theme === 'dark' ? '亮色' : '暗色'}模式`,
            icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />,
            category: '视图',
            shortcut: ['T'],
            action: () => toggleTheme()
        },
        {
            id: 'view-privacy',
            title: '隐私模式',
            desc: '模糊敏感金额信息',
            icon: <EyeOff size={18} />,
            category: '视图',
            shortcut: ['P'],
            action: () => {
                import('../../store').then(m => m.useThemeStore.getState().togglePrivacy());
            }
        },
        // AI
        {
            id: 'ai-memory',
            title: '记忆管理',
            desc: '管理 AI 学习到的用户偏好',
            icon: <Brain size={18} />,
            category: 'AI',
            shortcut: ['M'],
            action: () => {
                // Dispatch custom event to open Memory Manager
                window.dispatchEvent(new CustomEvent('openMemoryManager'));
            }
        },
        {
            id: 'ai-chat',
            title: 'AI 对话',
            desc: '与智能助手交谈',
            icon: <Bot size={18} />,
            category: 'AI',
            action: () => navigate('/agents')
        }
    ];

    // Toggle open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            if (isOpen) {
                if (e.key === 'Escape') {
                    setIsOpen(false);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredItems[selectedIndex]) {
                        filteredItems[selectedIndex].action();
                        setIsOpen(false);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex]);

    // Handle open state
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setFilteredItems(commands);
            // Focus input next tick
            setTimeout(() => inputRef.current?.focus(), 50);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    // Filter items
    useEffect(() => {
        if (!query) {
            setFilteredItems(commands);
            return;
        }

        const lowerQuery = query.toLowerCase().trim();

        // Fund Search Logic (Mock for now, replacing regex check)
        if (/^\d{6}$/.test(lowerQuery)) {
            setFilteredItems([{
                id: 'fund-search',
                title: `搜索基金 ${query}`,
                desc: '跳转至基金详情页',
                icon: <Search size={18} />,
                category: '基金',
                action: () => navigate(`/fund/${query}`)
            }]);
            return;
        }

        const filtered = commands.filter(item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.desc.toLowerCase().includes(lowerQuery) ||
            item.category.toLowerCase().includes(lowerQuery)
        );

        // AI Fallback
        if (filtered.length === 0) {
            filtered.push({
                id: 'ai-ask',
                title: `问 AI: "${query}"`,
                desc: '让 AI 助手回答这个问题',
                icon: <Bot size={18} />,
                category: 'AI',
                action: () => {
                    // Navigate to chat with query (would need state passing)
                    navigate('/agents');
                }
            });
        }

        setFilteredItems(filtered);
        setSelectedIndex(0);
    }, [query]);

    // Scroll to selected
    useEffect(() => {
        if (resultsRef.current) {
            const selectedEl = resultsRef.current.children[selectedIndex] as HTMLElement;
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) setIsOpen(false);
            }}>
            <div className="w-full max-w-xl bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Search Header */}
                <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
                    <Search className="text-white/40" size={20} />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 text-lg"
                        placeholder="搜索命令、基金代码或输入问题..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white/10 rounded text-xs text-white/60 font-mono">ESC</kbd>
                </div>

                {/* Results */}
                <div
                    ref={resultsRef}
                    className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-2"
                >
                    {filteredItems.map((item, index) => (
                        <div
                            key={item.id}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                }`}
                            onClick={() => {
                                item.action();
                                setIsOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div className={`p-2 rounded-md ${index === selectedIndex ? 'text-white bg-blue-500/20' : 'text-white/40 bg-white/5'}`}>
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-medium flex items-center gap-2">
                                    {item.title}
                                    {index === selectedIndex && item.category === '基金' && (
                                        <ArrowRight size={14} className="text-blue-400" />
                                    )}
                                </div>
                                <div className="text-white/40 text-sm truncate">{item.desc}</div>
                            </div>
                            {item.shortcut && (
                                <div className="flex gap-1">
                                    {item.shortcut.map(k => (
                                        <kbd key={k} className="px-1.5 py-0.5 bg-white/10 rounded text-xs text-white/40 font-mono">
                                            {k}
                                        </kbd>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredItems.length === 0 && (
                        <div className="py-12 text-center text-white/40">
                            <p>未找到相关结果</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                    <div className="flex gap-3">
                        <span>↑↓ 导航</span>
                        <span>↵ 选择</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        Smart Search
                    </div>
                </div>
            </div>
        </div>
    );
};
