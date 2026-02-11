/**
 * Fund Assistant Pro - AI Agents Page
 * 
 * Overview of the 7 specialized AI agents powering the system.
 * Presented in a premium, futuristic grid layout.
 */

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import {
    Bot,
    LineChart,
    Newspaper,
    Search,
    Database,
    Cpu,
    Activity,

    Users,
    MessageSquare,
    Briefcase,
    Sparkles,
    Network,
    ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '../components/ui';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    },
};

interface Agent {
    id: string;
    name: string;
    nameEn: string;
    role: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgGradient: string;
    capabilities: string[];
    status: 'active' | 'idle' | 'offline';
}

const agents: Agent[] = [
    {
        id: 'coordinator',
        name: '首席投顾',
        nameEn: 'Coordinator',
        role: '总控与路由',
        description: '整个系统的核心大脑，负责理解用户意图，智能分发任务，如同交响乐团的指挥家。',
        icon: <Bot size={32} />,
        color: 'text-blue-400',
        bgGradient: 'from-blue-500/20 to-indigo-500/5',
        capabilities: ['意图识别', '任务分发', '多轮对话', '回复整合'],
        status: 'active',
    },
    {
        id: 'quant',
        name: '量化分析师',
        nameEn: 'Quant',
        role: '数据分析与风控',
        description: '专注于数字和统计分析，计算夏普比率、回撤等关键指标，用数据驱动决策。',
        icon: <Activity size={32} />,
        color: 'text-emerald-400',
        bgGradient: 'from-emerald-500/20 to-teal-500/5',
        capabilities: ['收益回撤', '相关性分析', '风险评估', '组合优化'],
        status: 'active',
    },
    {
        id: 'fund_manager',
        name: '基金经理',
        nameEn: 'Fund Manager',
        role: '资产配置与选基',
        description: '资深的基金研究专家，负责筛选优质基金，根据市场风向构建稳健的投资组合。',
        icon: <Briefcase size={32} />,
        color: 'text-purple-400',
        bgGradient: 'from-purple-500/20 to-pink-500/5',
        capabilities: ['基金筛选', '组合构建', '调仓建议', '市场点评'],
        status: 'active',
    },
    {
        id: 'chart',
        name: '可视化专家',
        nameEn: 'Chart',
        role: '图表生成',
        description: '将复杂的数据转化为直观的图表，支持K线、饼图、雷达图等多种专业金融图表。',
        icon: <LineChart size={32} />,
        color: 'text-orange-400',
        bgGradient: 'from-orange-500/20 to-amber-500/5',
        capabilities: ['K线图绘制', '资产分布', '业绩对比', '技术指标'],
        status: 'active',
    },
    {
        id: 'news',
        name: '情报官',
        nameEn: 'News',
        role: '资讯聚合',
        description: '实时监控全网金融资讯，提取关键信息，为投资决策提供宏观和行业背景支持。',
        icon: <Newspaper size={32} />,
        color: 'text-rose-400',
        bgGradient: 'from-rose-500/20 to-red-500/5',
        capabilities: ['新闻摘要', '舆情分析', '公告解读', '宏观跟踪'],
        status: 'active',
    },
    {
        id: 'search',
        name: '研究员',
        nameEn: 'RAG',
        role: '知识库检索',
        description: '基于 RAG 技术，从海量研报和历史数据中精准检索信息，提供有据可依的深度回答。',
        icon: <Search size={32} />,
        color: 'text-cyan-400',
        bgGradient: 'from-cyan-500/20 to-blue-500/5',
        capabilities: ['研报检索', '历史回溯', '知识问答', '文档解析'],
        status: 'active',
    },
    {
        id: 'memory',
        name: '记忆助理',
        nameEn: 'Memory',
        role: '个性化记忆',
        description: '记录用户的投资偏好、历史对话和关注标的，提供千人千面的个性化服务体验。',
        icon: <Database size={32} />,
        color: 'text-yellow-400',
        bgGradient: 'from-yellow-500/20 to-amber-500/5',
        capabilities: ['偏好记录', '上下文保持', '长期记忆', '个性化推荐'],
        status: 'active',
    },
    {
        id: 'daily_report',
        name: '每日简报',
        nameEn: 'Daily Report',
        role: '投资汇报',
        description: '自动生成每日市场复盘与持仓分析报告，让您不错过任何重要信息。',
        icon: <Bot size={32} />, // Reusing Bot icon or could use FileText
        color: 'text-green-400',
        bgGradient: 'from-green-500/20 to-lime-500/5',
        capabilities: ['市场复盘', '持仓分析', '每日推送', '风险提示'],
        status: 'active',
    },
];

const AgentCard = React.memo<{ agent: Agent }>(({ agent }) => (
    <motion.div
        variants={itemVariants}
        whileHover={{ y: -5 }}
        role="article"
        aria-labelledby={`agent-name-${agent.id}`}
    >
        <Card className="h-full p-0 overflow-hidden border-white/5 hover:border-white/10 group relative transition-all duration-300">
            {/* Header Gradient */}
            <div className={`h-24 bg-gradient-to-br ${agent.bgGradient} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 bg-[length:20px_20px]" aria-hidden="true" />
                <div
                    className={`absolute top-4 left-4 p-3 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 ${agent.color}`}
                    aria-hidden="true"
                >
                    {agent.icon}
                </div>
                <div className="absolute top-4 right-4">
                    <Badge variant="default" className="bg-black/20 border-white/5 backdrop-blur-md text-[10px] uppercase font-bold tracking-widest">
                        {agent.status === 'active' ? 'Active' : agent.status}
                    </Badge>
                </div>
            </div>

            {/* Content body */}
            <div className="p-6 pt-2">
                <div className="mb-4">
                    <h3 id={`agent-name-${agent.id}`} className="text-xl font-black text-white tracking-tight">{agent.name}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 mt-0.5">
                        <span aria-label="English Name">{agent.nameEn}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" aria-hidden="true" />
                        <span className={agent.color}>{agent.role}</span>
                    </div>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed font-medium mb-6 h-16 line-clamp-3">
                    {agent.description}
                </p>

                {/* Capabilities */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles size={10} aria-hidden="true" /> Core Capabilities
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {agent.capabilities.map((cap, index) => (
                            <span
                                key={index}
                                className="px-2 py-1 text-[10px] font-bold text-gray-300 bg-white/5 rounded-md border border-white/5 group-hover:bg-white/10 transition-colors"
                            >
                                {cap}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat Action Overlay */}
            <Link
                to={`/chat?agent=${agent.id}`}
                className="absolute top-4 right-16 z-20 p-2 bg-black/20 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 border border-white/10"
                aria-label={`与 ${agent.name} 对话`}
                title={`Chat with ${agent.name}`}
            >
                <MessageSquare size={18} />
            </Link>
        </Card>
    </motion.div>
));

AgentCard.displayName = 'AgentCard';

export function Agents() {
    return (
        <motion.div
            className="p-6 lg:p-10 space-y-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-3xl font-black text-white mb-3 flex items-center gap-3 tracking-tight">
                        <Cpu className="text-blue-500" size={32} />
                        AI 智能体集群
                    </h1>
                    <p className="text-gray-400 max-w-2xl font-medium leading-relaxed">
                        Fund Assistant Pro 由 7 个专业分工的 AI 智能体协同工作。
                        每个智能体都在其领域拥有专家级的能力，共同为您提供全方位的智能投顾服务。
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="info" className="px-3 py-1.5 text-xs uppercase tracking-widest font-bold">
                        <span className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            System Online
                        </span>
                    </Badge>
                </div>
            </motion.div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="list">
                {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                ))}
            </div>

            {/* System Architecture Diagram (Conceptual) */}
            <Card className="p-10 border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 to-purple-900/5 -z-10" />
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h2 className="text-2xl font-black text-white tracking-tight mb-3 flex items-center justify-center gap-3">
                        <Network size={24} className="text-blue-500" />
                        多智能体协同架构
                    </h2>
                    <p className="text-sm text-gray-400">
                        基于 LLM 的自主智能体集群，通过 Coordinator 协调，实现复杂金融任务的拆解与执行
                    </p>
                </div>

                <div className="relative flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20 py-8">
                    {/* User */}
                    <div className="flex flex-col items-center gap-4 z-10 relative group bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white border border-white/10 shadow-lg">
                            <Users size={32} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">User Request</span>
                    </div>

                    {/* Flow Animation */}
                    <div className="hidden md:flex flex-1 max-w-xs h-px bg-gradient-to-r from-gray-700 via-blue-500 to-gray-700 relative items-center">
                        <div className="absolute left-0 w-full h-8 overflow-hidden">
                            <div className="w-2 h-2 bg-blue-400 rounded-full blur-[2px] absolute top-1/2 -translate-y-1/2 animate-[shimmer_2s_infinite]" aria-hidden="true" />
                        </div>
                        <ChevronRight className="absolute right-0 text-blue-500" size={16} aria-hidden="true" />
                    </div>

                    {/* Coordinator */}
                    <div className="flex flex-col items-center gap-4 z-10 relative group">
                        <div className="absolute inset-0 bg-blue-500/10 blur-[40px] rounded-full animate-pulse" />
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white border border-blue-400/30 shadow-[0_0_40px_rgba(37,99,235,0.3)] relative z-10">
                            <Bot size={48} />
                        </div>
                        <div className="text-center z-10">
                            <span className="block text-lg font-black text-white">Coordinator</span>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Central Router</span>
                        </div>
                    </div>

                    {/* Flow Animation */}
                    <div className="hidden md:flex flex-1 max-w-xs h-px bg-gradient-to-r from-gray-700 via-blue-500 to-gray-700 relative items-center">
                        <div className="absolute right-0 w-full h-8 overflow-hidden rotate-180">
                            <div className="w-2 h-2 bg-blue-400 rounded-full blur-[2px] absolute top-1/2 -translate-y-1/2 animate-[shimmer_2s_infinite]" />
                        </div>
                        <ChevronRight className="absolute right-0 text-blue-500" size={16} />
                    </div>
                </div>

                <div className="mt-8 flex justify-center gap-4 flex-wrap">
                    {/* Sub Agents Row */}
                    {agents.slice(1).map((agent, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 w-24">
                            <div className={`${agent.color} opacity-80`}>{agent.icon}</div>
                            <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center">{agent.nameEn}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </motion.div>
    );
}

export default Agents;
