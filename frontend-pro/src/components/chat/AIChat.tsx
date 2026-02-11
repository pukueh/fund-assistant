
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    MessageSquare,
    Send,
    Sparkles,
    Cpu,
    Database,
    Zap,
    ChevronDown,
    Activity,
    Briefcase,
    LineChart,
    Newspaper,
    Search,
} from 'lucide-react';
import { chatApi } from '../../api';
import type { Agent } from '../../types';
import { Card } from '../ui';

interface AIChatProps {
    defaultAgent?: string;
    className?: string;
    compact?: boolean;
}

const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring" as const,
            stiffness: 300,
            damping: 25
        }
    },
};

const ChatMessage = React.memo<{
    msg: { role: 'user' | 'assistant'; content: string };
    idx: number;
}>(({ msg, idx }) => (
    <motion.div
        key={idx}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        role="log"
        aria-live="polite"
    >
        <div
            className={`max-w-[85%] lg:max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed font-medium shadow-xl backdrop-blur-sm ${msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm border border-blue-400/20'
                : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'
                }`}
        >
            {msg.content || (
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    <span className="text-xs">思考中...</span>
                </div>
            )}
        </div>
    </motion.div>
));

ChatMessage.displayName = 'ChatMessage';

const AgentMetadata: Record<string, { icon: React.ElementType, color: string }> = {
    'coordinator': { icon: Bot, color: 'text-blue-400' },
    'quant': { icon: Activity, color: 'text-emerald-400' },
    'fund_manager': { icon: Briefcase, color: 'text-purple-400' },
    'chart': { icon: LineChart, color: 'text-orange-400' },
    'news': { icon: Newspaper, color: 'text-rose-400' },
    'search': { icon: Search, color: 'text-cyan-400' },
    'memory': { icon: Database, color: 'text-yellow-400' },
    'strategist': { icon: Sparkles, color: 'text-indigo-400' }, // Default fallback
};

const AgentSelector: React.FC<{
    agents: Agent[];
    selectedKey: string;
    onSelect: (key: string) => void;
}> = ({ agents, selectedKey, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedAgent = agents.find(a => a.key === selectedKey) || agents[0];
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!selectedAgent && agents.length === 0) return null;

    const metadata = AgentMetadata[selectedKey] || AgentMetadata['strategist'];
    const Icon = metadata.icon;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.08] hover:border-white/20 transition-all group active:scale-95"
            >
                <div className={`p-1.5 rounded-lg bg-black/20 ${metadata.color}`}>
                    <Icon size={14} />
                </div>
                <span className="text-xs font-black text-gray-200 tracking-tight">
                    {selectedAgent?.name || '选择智能体'}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-72 z-[100] bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2"
                    >
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1">
                            Switch specialised agent
                        </div>
                        <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1">
                            {agents.map((agent) => {
                                const agentMeta = AgentMetadata[agent.key] || AgentMetadata['strategist'];
                                const AgentIcon = agentMeta.icon;
                                const isSelected = agent.key === selectedKey;

                                return (
                                    <button
                                        key={agent.key}
                                        onClick={() => {
                                            onSelect(agent.key);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all ${isSelected ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className={`mt-0.5 p-2 rounded-lg bg-black/20 ${agentMeta.color}`}>
                                            <AgentIcon size={16} />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className={`text-xs font-black tracking-tight ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                {agent.name}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5 line-clamp-1">
                                                {agent.description}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const AIChat: React.FC<AIChatProps> = ({
    defaultAgent = 'strategist',
    className = '',
    compact = false
}) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState(defaultAgent);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isFirstMount = useRef(true);

    useEffect(() => {
        chatApi.listAgents().then((data) => setAgents(data.agents));
    }, []);

    useEffect(() => {
        if (defaultAgent) {
            setSelectedAgent(defaultAgent);
        }
    }, [defaultAgent]);

    const scrollToBottom = (instant = false) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            });
        }
    };

    useEffect(() => {
        // Skip scroll on mount to prevent the page from jumping 
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        scrollToBottom();
    }, [messages, isLoading]);

    const [enhancementInfo, setEnhancementInfo] = useState<{ memory_used: boolean; rag_used: boolean } | null>(null);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!message.trim() || isLoading) return;

        const userMessage = message.trim();
        setMessage('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Add user message AND an empty assistant message for streaming
        setMessages((prev) => [
            ...prev,
            { role: 'user', content: userMessage },
            { role: 'assistant', content: '' }
        ]);

        setIsLoading(true);

        try {
            await chatApi.sendMessageStream(
                userMessage,
                selectedAgent,
                (chunk) => {
                    // Update the LAST message (which is our assistant placeholder)
                    setMessages((prev) => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.content += chunk;
                        }
                        return newMsgs;
                    });
                },
                undefined,
                (info) => {
                    setEnhancementInfo(info);
                },
                (error) => {
                    console.error('Streaming error:', error);
                    setMessages((prev) => {
                        const newMsgs = [...prev];
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.content = '抱歉，发生了错误：' + error;
                        }
                        return newMsgs;
                    });
                }
            );
        } catch (err) {
            console.error('Send error:', err);
            setMessages((prev) => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = '抱歉，连接服务器失败。';
                }
                return newMsgs;
            });
        } finally {
            // Check if response is still empty (e.g. timeout or no chunks)
            setMessages((prev) => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
                    lastMsg.content = '抱歉，AI 暂时无法回答这个问题（超时或无响应）。';
                }
                return newMsgs;
            });
            setIsLoading(false);
        }
    };

    return (
        <motion.div variants={itemVariants} className={`${className} h-full flex flex-col`}>
            <Card className={`flex flex-col ${compact ? 'h-[500px]' : 'h-full'} p-0 overflow-hidden border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl ring-1 ring-white/10`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-md relative z-30">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                                <Bot className="text-white" size={20} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f172a] shadow-sm"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                                AI 智能投顾
                                {enhancementInfo && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex gap-1"
                                    >
                                        {enhancementInfo.memory_used && <Database size={12} className="text-blue-400" />}
                                        {enhancementInfo.rag_used && <Sparkles size={12} className="text-purple-400" />}
                                    </motion.div>
                                )}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                <Cpu size={10} />
                                Powered by LLM
                            </span>
                        </div>
                    </div>

                    {/* Premium Custom Agent Selector */}
                    <div className="relative">
                        <AgentSelector
                            agents={agents}
                            selectedKey={selectedAgent}
                            onSelect={setSelectedAgent}
                        />
                    </div>
                </div>

                {/* Messages */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-gradient-to-b from-transparent to-black/20"
                >
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-60">
                            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] flex items-center justify-center border border-white/5 shadow-inner mb-6 backdrop-blur-sm animate-pulse">
                                <MessageSquare size={32} className="text-gray-500" />
                            </div>
                            <h3 className="text-lg font-black text-white mb-2 tracking-tight">How can I help you?</h3>
                            <p className="text-sm text-gray-500 text-center max-w-xs font-medium">
                                ask me about market trends, your portfolio, or specific funds.
                            </p>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => (
                            <ChatMessage key={idx} msg={msg} idx={idx} />
                        ))}
                    </AnimatePresence>

                    {/* Loading State Bubble handled in ChatMessage now */}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-black/20 border-t border-white/5 backdrop-blur-md">
                    <form
                        onSubmit={handleSend}
                        className="relative flex items-end gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 focus-within:border-blue-500/30 focus-within:bg-white/[0.08] transition-all shadow-inner group"
                    >
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 px-3 resize-none max-h-32 text-white placeholder-gray-500 scrollbar-none font-medium leading-relaxed"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !message.trim()}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${isLoading || !message.trim()
                                ? 'bg-white/5 text-gray-600'
                                : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95'
                                }`}
                        >
                            {isLoading ? <Zap size={18} className="animate-pulse" /> : <Send size={18} />}
                        </button>
                    </form>
                    {/* Disclaimer */}
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">AI Generated Content • Not Financial Advice</p>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};
