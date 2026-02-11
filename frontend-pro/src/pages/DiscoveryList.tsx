
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    Flame,
    Layers,
    Search
} from 'lucide-react';
import { discoveryApi } from '../api';
import type { Fund, Category } from '../types';
import { Card, Badge } from '../components/ui';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring" as const, stiffness: 260, damping: 20 }
    },
};

export const DiscoveryList: React.FC = () => {
    const { type, slug } = useParams<{ type: string; slug?: string }>();
    const navigate = useNavigate();
    const [funds, setFunds] = useState<Fund[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState<React.ReactNode>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                if (type === 'gainers') {
                    const data = await discoveryApi.getDailyMovers(50);
                    setFunds(data.top_gainers);
                    setTitle('今日领涨排行');
                    setIcon(<TrendingUp className="text-red-400" />);
                } else if (type === 'losers') {
                    const data = await discoveryApi.getDailyMovers(50);
                    setFunds(data.top_losers);
                    setTitle('今日领跌排行');
                    setIcon(<TrendingDown className="text-emerald-400" />);
                } else if (type === 'popular') {
                    const data = await discoveryApi.getDailyMovers(50);
                    setFunds(data.most_popular);
                    setTitle('热门关注排行');
                    setIcon(<Flame className="text-blue-400" />);
                } else if (type === 'categories') {
                    const data = await discoveryApi.categories.getAll();
                    setCategories(data.categories);
                    setTitle('全板块分类');
                    setIcon(<Layers className="text-purple-400" />);
                } else if (type === 'category' && slug) {
                    const cat = await discoveryApi.categories.get(slug);
                    const data = await discoveryApi.categories.getFunds(slug, 50);
                    // The API returns { category: string, funds: Fund[] }
                    // But we need to fetch the actual fund details if needed, 
                    // though the API usually returns Fund objects.
                    setFunds(data.funds);
                    setTitle(`${cat.name} 板块基金`);
                    setIcon(<span className="text-2xl">{cat.icon || '📈'}</span>);
                }
            } catch (err) {
                console.error('Failed to load discovery list:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [type, slug]);

    const filteredFunds = funds.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.code.includes(searchTerm)
    );

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slug.includes(searchTerm)
    );

    return (
        <motion.div
            className="p-6 lg:p-10 space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/discovery')}
                        className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                            {icon}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Discovery / {type}</p>
                        </div>
                    </div>
                </div>

                <div className="relative group w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="在列表中搜索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded-2xl py-3 pl-11 pr-4 w-full text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/5 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : type === 'categories' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredCategories.map((category) => (
                        <motion.div key={category.id} variants={itemVariants}>
                            <Link to={`/discovery/category/${category.slug}`}>
                                <Card className="p-5 hover:bg-white/5 border-white/5 hover:border-white/10 transition-all duration-300 group text-center flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                                        {category.icon || '📊'}
                                    </div>
                                    <h3 className="font-bold text-sm text-white">{category.name}</h3>
                                    <Badge variant={(category.day_change || 0) >= 0 ? 'gain' : 'loss'} className="mt-2 font-mono text-[10px]">
                                        {(category.day_change || 0) >= 0 ? '+' : ''}{(category.day_change || 0).toFixed(2)}%
                                    </Badge>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFunds.map((fund, idx) => {
                        const isPositive = (fund.day_change || 0) >= 0;
                        return (
                            <motion.div key={fund.code} variants={itemVariants}>
                                <Link to={`/fund/${fund.code}`}>
                                    <Card
                                        noPadding
                                        className="hover:bg-white/5 border-white/5 hover:border-white/10 transition-all group overflow-hidden"
                                    >
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[10px] font-black text-gray-500 border border-white/5">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-sm truncate max-w-[140px] group-hover:text-blue-400 transition-colors">
                                                        {fund.name}
                                                    </h3>
                                                    <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full mt-1 inline-block border border-white/5">
                                                        {fund.code}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono text-xs text-gray-200 font-bold mb-1">
                                                    {fund.nav?.toFixed(4) || '--'}
                                                </div>
                                                <Badge variant={isPositive ? 'gain' : 'loss'} className="font-mono text-[10px] px-2 py-0.5">
                                                    {isPositive ? '+' : ''}{(fund.day_change || 0).toFixed(2)}%
                                                </Badge>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {!isLoading && filteredFunds.length === 0 && filteredCategories.length === 0 && (
                <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                    <p className="text-gray-500 font-medium">未找到匹配的結果</p>
                </div>
            )}
        </motion.div>
    );
};

export default DiscoveryList;
