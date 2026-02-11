/**
 * Fund Assistant Pro - Sidebar Component
 * 
 * Premium glassmorphism sidebar navigation with animated interactions.
 * Strictly aligned with the "Login V2 Enhanced" design system and branding.
 * 
 * Design Standards:
 * - Apple-inspired translucency (backdrop-blur-xl)
 * - Apex Node branding (consistent SVG and typography)
 * - Staggered micro-animations via Framer Motion
 * - Google TypeScript Style Guide compliance
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Compass,
    Briefcase,
    TrendingUp,
    PiggyBank,
    Users,
    Settings,
    Bot,
    FileText,
    ChevronRight,
    Search,
    Shield
} from 'lucide-react';

/**
 * Navigation item definition.
 */
interface NavItem {
    path: string;
    label: string;
    labelEn: string;
    icon: React.ReactNode;
    badge?: string;
}

/**
 * Main navigation items configuration.
 */
const navItems: NavItem[] = [
    { path: '/', label: '仪表盘', labelEn: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/discovery', label: '发现', labelEn: 'Discovery', icon: <Compass size={18} /> },
    { path: '/portfolio', label: '持仓', labelEn: 'Portfolio', icon: <Briefcase size={18} /> },
    { path: '/fund', label: '行情', labelEn: 'Market', icon: <TrendingUp size={18} /> },
    { path: '/investment', label: '定投', labelEn: 'Investment', icon: <PiggyBank size={18} /> },
    { path: '/shadow', label: '影子追踪', labelEn: 'Shadow', icon: <Users size={18} /> },
    { path: '/report', label: '日报', labelEn: 'Daily', icon: <FileText size={18} /> },
    { path: '/agents', label: 'AI 团队', labelEn: 'Agents', icon: <Bot size={18} />, badge: 'New' },
];

/**
 * Sidebar component.
 */
export function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 h-full w-[260px] flex flex-col z-50 overflow-hidden">
            {/* Base Glass Layer */}
            <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-2xl border-r border-white/5" />

            {/* Dynamic Ambient Background */}
            <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-[#00d4aa]/5 to-transparent pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col h-full">

                {/* Branding Section - Aligned with Login Page */}
                <div className="p-6 pb-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            {/* Apex Node Mini Logo */}
                            <div className="relative w-12 h-12 bg-[#0f172a]/80 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-xl overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#00d4aa]/10 via-transparent to-blue-500/10 opacity-50" />
                                <svg width="28" height="28" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]">
                                    <defs>
                                        <linearGradient id="sidebarLogoGradient" x1="0" y1="56" x2="56" y2="0" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#00d4aa" />
                                            <stop offset="50%" stopColor="#00a3cc" />
                                            <stop offset="100%" stopColor="#ffffff" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M28 10L44 19.2376V37.7128L28 47L12 37.7128V19.2376L28 10Z" stroke="url(#sidebarLogoGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="url(#sidebarLogoGradient)" fillOpacity="0.05" />
                                    <path d="M28 22V34M22 26L28 22L34 26" stroke="#00d4aa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="28" cy="18" r="3" fill="white" />
                                </svg>
                                {/* Shine Effect */}
                                <div className="absolute -top-[100%] left-0 w-[20%] h-[300%] bg-gradient-to-b from-transparent via-white/10 to-transparent rotate-45 group-hover:translate-x-[100px] transition-transform duration-1000" />
                            </div>

                            <div className="flex flex-col justify-center">
                                <h1 className="text-base font-black text-white leading-tight tracking-tight">
                                    智能基金助手 <span className="text-[#00d4aa] italic font-serif ml-0.5">Pro</span>
                                </h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.15em] mt-0.5">
                                    Apex Node V2.0
                                </p>
                            </div>
                        </div>

                        {/* Search Bar - Premium Style */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-3.5 w-3.5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-9 pr-4 py-2 bg-black/30 border border-white/5 rounded-xl text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa]/30 focus:ring-1 focus:ring-[#00d4aa]/20 transition-all backdrop-blur-md"
                                placeholder="搜索全站资源..."
                            />
                        </div>
                    </div>
                </div>

                {/* Sub-header Divider */}
                <div className="px-8 pb-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-2 custom-scrollbar">
                    <div className="px-4 mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Navigation Center</span>
                    </div>

                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className="block relative group outline-none"
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active State Highlight */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeGlow"
                                            className="absolute inset-0 bg-gradient-to-r from-[#00d4aa]/15 to-blue-500/5 rounded-2xl border border-[#00d4aa]/20 shadow-[0_0_20px_-5px_rgba(0,212,170,0.2)]"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}

                                    <div className={`relative flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 ${isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}>
                                        <div className="flex items-center gap-3.5">
                                            <span className={`transition-all duration-500 ${isActive ? 'text-[#00d4aa] drop-shadow-[0_0_8px_rgba(0,212,170,0.6)]' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                                {item.icon}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold tracking-tight leading-none mb-0.5">{item.label}</span>
                                                <span className={`text-[9px] font-bold uppercase tracking-widest leading-none opacity-50 ${isActive ? 'text-[#00d4aa]' : 'text-gray-600'}`}>
                                                    {item.labelEn}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Indicators */}
                                        {item.badge ? (
                                            <span className="px-1.5 py-0.5 text-[8px] font-black text-[#0f172a] bg-[#00d4aa] rounded-[4px] shadow-lg animate-pulse">
                                                {item.badge}
                                            </span>
                                        ) : isActive && (
                                            <motion.div initial={{ x: -5, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                                                <ChevronRight size={14} className="text-[#00d4aa]" />
                                            </motion.div>
                                        )}
                                    </div>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer Section - Premium User Account Area */}
                <div className="p-4 mt-auto">
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-1 shadow-2xl overflow-hidden group">
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `
                                flex items-center justify-between p-3 rounded-[22px] transition-all duration-300
                                ${isActive ? 'bg-[#00d4aa]/10 text-white' : 'text-gray-400 hover:bg-white/5'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-[#00d4aa] transition-colors shadow-inner">
                                    <Settings size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-white group-hover:text-[#00d4aa] transition-all">系统设置</span>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Authenticated</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight size={12} />
                            </div>
                        </NavLink>
                    </div>

                    {/* Legal/System Version Footnote */}
                    <div className="mt-4 px-4 flex items-center justify-between text-gray-700">
                        <div className="flex items-center gap-1">
                            <Shield size={10} />
                            <span className="text-[8px] font-black tracking-widest uppercase">Secured</span>
                        </div>
                        <span className="text-[8px] font-black">v2.4.0-STABLE</span>
                    </div>
                </div>
            </div>

            {/* Global Scrollbar Styling */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 212, 170, 0.2);
                }
            `}} />
        </aside>
    );
}
