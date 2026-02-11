/**
 * Fund Assistant Pro - Settings Page
 * 
 * Premium control center for user profile, system preferences, and security management.
 * Strictly aligned with the "Apex Node V2" design language seen in Login and Sidebar.
 * 
 * Design Principles:
 * - Ultra-Premium Glassmorphism (V2)
 * - Deep Ambient Lighting & Blurred Accents
 * - Integrated Dual-Language Typography (CN/EN)
 * - Apple-inspired Spring Physics & Staggered Animations
 * - Google TypeScript Style Guide compliance
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
    Settings as SettingsIcon,
    Bell,
    LogOut,
    Smartphone,
    ChevronRight,
    Info,
    User as UserIcon,
    Mail,
    UserCheck,
    AlertTriangle,
    Globe,
    ArrowRight
} from 'lucide-react';
import { authApi } from '../api/auth';
import type { User } from '../types';

// ============================================================
// ANIMATION & VISUAL VARIANTS
// ============================================================

/**
 * Main container staggering.
 */
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
            duration: 0.8,
            ease: "easeOut"
        }
    }
};

/**
 * Individual item entrance animation.
 */
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 18
        }
    }
};

/**
 * Pulsing glow for the profile card.
 */
const profileGlowVariants: Variants = {
    initial: { opacity: 0.3, scale: 0.8 },
    animate: {
        opacity: [0.3, 0.6, 0.3],
        scale: [0.8, 1.2, 0.8],
        transition: { duration: 8, repeat: Infinity, ease: "easeInOut" }
    },
    visible: { opacity: 1 } // Required for Framer Motion variant matching if needed
};

// ============================================================
// MODALS
// ============================================================

interface EditProfileModalProps {
    user: User | undefined;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Edit Profile Modal - Matching the Login Card style.
 */
const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, isOpen, onClose }) => {
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Simulated delay for premium feel
            await new Promise(resolve => setTimeout(resolve, 1500));
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-2xl"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 40 }}
                    className="relative w-full max-w-lg z-10"
                >
                    <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] p-1 shadow-2xl relative overflow-hidden">
                        <div className="bg-[#0f172a]/60 rounded-[28px] p-10 border border-white/5 relative z-10">
                            <div className="flex flex-col items-center mb-10">
                                <div className="w-20 h-20 rounded-[24px] bg-[#0f172a]/80 border border-[#00d4aa]/30 flex items-center justify-center mb-5 shadow-[0_0_30px_-5px_rgba(0,212,170,0.4)]">
                                    <UserIcon className="text-[#00d4aa]" size={36} />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">更新账户身份</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold mt-2">Identity Configuration</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                        账户名 / Username
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <UserIcon size={18} className="text-gray-600 group-focus-within:text-[#00d4aa] transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-[#00d4aa]/50 focus:ring-4 focus:ring-[#00d4aa]/5 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                        安全邮箱 / Secure Email
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail size={18} className="text-gray-600 group-focus-within:text-[#00d4aa] transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white font-bold placeholder-gray-700 focus:outline-none focus:border-[#00d4aa]/50 focus:ring-4 focus:ring-[#00d4aa]/5 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 h-14 bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 font-bold rounded-2xl border border-white/5 transition-all tracking-widest text-[10px] uppercase"
                                    >
                                        取消 / Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 h-14 bg-gradient-to-r from-[#00d4aa] to-[#00a3cc] text-[#0f172a] font-black rounded-2xl shadow-xl shadow-[#00d4aa]/20 transition-all tracking-widest text-[10px] uppercase disabled:opacity-50"
                                    >
                                        {isLoading ? '同步中 / Syncing...' : '保存更改 / Save'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// ============================================================
// UI BUILDING BLOCKS
// ============================================================

interface SettingSectionProps {
    title: string;
    labelEn: string;
    children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({ title, labelEn, children }) => (
    <div className="space-y-5">
        <div className="flex items-center gap-3 px-1">
            <div className="w-1 h-4 bg-[#00d4aa] rounded-full shadow-[0_0_10px_rgba(0,212,170,0.5)]" />
            <div className="flex flex-col">
                <h3 className="text-xs font-black text-white/90 uppercase tracking-[0.2em]">{title}</h3>
                <span className="text-[8px] font-black text-[#00d4aa] uppercase tracking-[0.3em] mt-0.5 opacity-60">{labelEn}</span>
            </div>
        </div>
        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[28px] p-2 shadow-2xl relative overflow-hidden group/section transition-all hover:border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4aa]/2 to-transparent opacity-0 group-hover/section:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex flex-col gap-1.5 relative z-10">
                {children}
            </div>
        </div>
    </div>
);

interface SettingItemProps {
    icon: React.ElementType;
    label: string;
    labelEn: string;
    value?: React.ReactNode;
    action?: () => void;
    danger?: boolean;
    color?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon: Icon,
    label,
    labelEn,
    value,
    action,
    danger = false,
    color = "blue"
}) => {
    const colorClasses = {
        blue: "bg-blue-500/10 border-blue-500/15 text-blue-400 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]",
        emerald: "bg-emerald-500/10 border-emerald-500/15 text-emerald-400 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]",
        rose: "bg-rose-500/10 border-rose-500/15 text-rose-400 shadow-[0_0_15px_-5px_rgba(244,63,94,0.3)]",
        amber: "bg-amber-500/10 border-amber-500/15 text-amber-400 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]",
    }[color as 'blue' | 'emerald' | 'rose' | 'amber'] || "bg-white/5 border-white/10 text-gray-500";

    return (
        <div
            onClick={action}
            className={`flex items-center justify-between px-6 py-4.5 rounded-[20px] transition-all duration-500 group ${action ? 'cursor-pointer hover:bg-white/[0.04] active:scale-[0.99]' : ''}`}
        >
            <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center border transition-all duration-500 ${danger ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' :
                    action ? `bg-[#0f172a]/80 border-white/5 text-gray-500 group-hover:${colorClasses.split(' ')[2]} group-hover:${colorClasses.split(' ')[1]} group-hover:${colorClasses.split(' ')[0]}` :
                        colorClasses
                    }`}>
                    <Icon size={20} className="drop-shadow-[0_0_5px_currentColor]" />
                </div>
                <div className="flex flex-col">
                    <span className={`text-[13px] font-black tracking-tight leading-none ${danger ? 'text-rose-500/80 group-hover:text-rose-500' : 'text-gray-300 group-hover:text-white'} transition-colors`}>
                        {label}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5 opacity-40">
                        {labelEn}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-5">
                <div className={`text-[11px] font-black font-mono tracking-tight transition-all ${danger ? 'text-rose-500/40 font-black' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {value}
                </div>
                {action && (
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-700 group-hover:text-[#00d4aa] group-hover:bg-[#00d4aa]/10 transition-all shadow-sm">
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                )}
            </div>
        </div>
    );
};


// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

/**
 * Settings Page Component.
 */
export const Settings = () => {
    const [notifications, setNotifications] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data: user } = useQuery<User>({
        queryKey: ['auth-profile'],
        queryFn: authApi.getProfile,
        retry: false,
    });

    const handleLogout = () => {
        authApi.logout();
        window.location.href = '/login';
    };

    return (
        <motion.div
            className="p-10 lg:p-16 max-w-7xl mx-auto space-y-20 relative"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Background Ambience - Aligned with Login Page */}
            <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute top-[-10%] left-[10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 20, repeat: Infinity, delay: 2 }}
                    className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[#00d4aa]/10 rounded-full blur-[120px]"
                />
            </div>

            {/* Page Header Area */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-white/5 pb-10">
                <div className="flex flex-col">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="relative w-14 h-14 bg-[#0f172a]/80 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4aa]/10 via-transparent to-blue-500/10 opacity-50" />
                            <SettingsIcon className="text-[#00d4aa] drop-shadow-[0_0_8px_rgba(0,212,170,0.5)]" size={30} />
                            {/* Shine Effect */}
                            <div className="absolute -top-[100%] left-0 w-[20%] h-[300%] bg-gradient-to-b from-transparent via-white/10 to-transparent rotate-45 group-hover:translate-x-[100px] transition-transform duration-1000" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[#00d4aa] uppercase tracking-[0.4em] leading-none mb-2">Platform Control</span>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">系统高级设置</h1>
                        </div>
                    </div>
                    <p className="text-gray-500 font-bold text-lg leading-relaxed max-w-2xl">
                        管理您的全局身份凭证、多端同步策略及安全防御引擎。
                    </p>
                </div>

                <div className="flex items-center gap-5 bg-black/40 px-7 py-4 rounded-[24px] border border-white/5 shadow-2xl backdrop-blur-3xl group">
                    <div className="w-10 h-10 rounded-xl bg-[#00d4aa]/10 flex items-center justify-center border border-[#00d4aa]/20 transition-all group-hover:scale-110">
                        <Globe size={20} className="text-[#00d4aa] animate-spin-slow" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-none">Global Reach</span>
                        <span className="text-[11px] font-black text-gray-300 mt-1 uppercase tracking-tight">V2.4.0-Pro Stable</span>
                    </div>
                </div>
            </motion.div>

            {/* Premium Profile Hero Card */}
            {user ? (
                <motion.div variants={itemVariants} className="relative group">
                    {/* Visual Card Accent */}
                    <motion.div
                        variants={profileGlowVariants}
                        initial="initial"
                        animate="animate"
                        className="absolute -inset-8 bg-gradient-to-tr from-[#00d4aa]/40 to-blue-500/40 rounded-[3rem] blur-3xl opacity-30"
                    />

                    <div className="relative bg-white/[0.01] backdrop-blur-3xl border border-white/10 rounded-[40px] p-1 shadow-2xl overflow-hidden">
                        <div className="bg-[#0f172a]/60 rounded-[36px] p-12 md:p-14 flex flex-col md:flex-row items-center gap-14 border border-white/5 relative z-10">

                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#00d4aa]/5 to-transparent blur-[120px] pointer-events-none" />
                            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] bg-[length:30px_30px] pointer-events-none" />

                            <div className="relative shrink-0 perspective-1000">
                                <motion.div
                                    className="w-40 h-40 rounded-[36px] bg-gradient-to-br from-gray-800 via-[#0f172a] to-black p-[3px] shadow-2xl group-hover:rotate-3 transition-all duration-700 ease-out"
                                    whileHover={{ scale: 1.05 }}
                                >
                                    <div className="w-full h-full bg-[#0f172a] rounded-[33px] flex items-center justify-center text-white font-black text-6xl border border-white/5 relative overflow-hidden group/avatar">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-[#00d4aa]/20 to-transparent opacity-50 group-hover/avatar:opacity-100 transition-opacity" />
                                        <span className="relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] selection:bg-[#00d4aa]">
                                            {user.username?.[0]?.toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                </motion.div>
                                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-[#00d4aa] rounded-[20px] border-[8px] border-[#0f172a] shadow-[0_0_25px_rgba(0,212,170,0.5)] flex items-center justify-center">
                                    <UserCheck size={20} className="text-[#0f172a] stroke-[3]" />
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center gap-5 mb-5">
                                    <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                                        {user.username}
                                    </h2>
                                    <div className="flex gap-3 justify-center md:justify-start">
                                        <div className="h-7 px-4 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 bg-white/5 backdrop-blur-md rounded-full text-white">
                                            {user.role === 'guest' ? 'Visitor Mode' : (user.risk_level || 'Investor') + ' ID'}
                                        </div>
                                        <div className="h-7 px-4 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full">
                                            {user.role === 'guest' ? 'LIMITED' : 'PREMIUM'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center md:justify-start gap-3 mb-10 opacity-60">
                                    <Mail size={16} className="text-[#00d4aa]" />
                                    <span className="text-sm font-black uppercase tracking-[0.2em]">{user.email || 'No Secure Identity Linked'}</span>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="h-14 px-10 bg-gradient-to-r from-[#00d4aa] to-[#00a3cc] text-[#0f172a] font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-[#00d4aa]/30 border-none group/btn"
                                    >
                                        编辑个人身份 / Edit Profile
                                        <ArrowRight size={16} className="inline ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="h-14 px-10 bg-white/[0.03] hover:bg-rose-500/10 text-gray-500 hover:text-rose-500 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/5 active:scale-[0.98]"
                                    >
                                        退出登录 / Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div variants={itemVariants}>
                    <div className="p-20 text-center bg-black/40 backdrop-blur-3xl border border-dashed border-white/10 rounded-[40px]">
                        <div className="w-24 h-24 rounded-3xl bg-white/5 mx-auto mb-8 flex items-center justify-center border border-white/5">
                            <AlertTriangle className="text-gray-600" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3">未连接账户</h3>
                        <p className="text-gray-500 mb-10 max-w-sm mx-auto text-sm">请登录以同步您的投资组合并启动 AI 决策分析引擎。</p>
                        <button
                            onClick={handleLogout}
                            className="px-12 py-4 bg-[#00d4aa] text-[#0f172a] font-black rounded-2xl transition-all"
                        >
                            Establish Identity
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Settings Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                <motion.div variants={itemVariants} className="space-y-16">
                    <SettingSection title="环境与多端连通性" labelEn="Devices & Connectivity">
                        <SettingItem
                            icon={Smartphone}
                            label="独立移动端同步"
                            labelEn="Cloud Identity Relay"
                            value={<span className="text-[#00d4aa] font-black uppercase text-[10px] tracking-widest px-3 py-1 bg-[#00d4aa]/10 rounded-lg shadow-sm">Verified</span>}
                            color="emerald"
                        />
                    </SettingSection>

                    <SettingSection title="实时交互与推送" labelEn="Interactive Logic">
                        <SettingItem
                            icon={Bell}
                            label="行情异动预警"
                            labelEn="Live Market Alerts"
                            value={
                                <div
                                    onClick={(e) => { e.stopPropagation(); setNotifications(!notifications); }}
                                    className={`w-14 h-7 rounded-full p-1 transition-all duration-500 cursor-pointer shadow-inner border border-white/10 relative ${notifications ? 'bg-[#00d4aa]' : 'bg-gray-800'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-[6px] shadow-2xl transition-all duration-500 transform ${notifications ? 'translate-x-[28px]' : 'translate-x-0'}`} />
                                </div>
                            }
                            color="emerald"
                        />
                    </SettingSection>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-16">
                    <SettingSection title="系统元数据" labelEn="Architecture Info">
                        <SettingItem
                            icon={Info}
                            label="架构内核版本"
                            labelEn="Kernel Build"
                            value={<span className="font-mono text-[10px] text-gray-500 font-bold uppercase tracking-widest">v2.4.0 PRO-MAX</span>}
                            color="blue"
                        />
                        <SettingItem
                            icon={LogOut}
                            label="退出登录"
                            labelEn="Log Out"
                            danger
                            action={handleLogout}
                        />
                    </SettingSection>
                </motion.div>
            </div>

            {/* Footer Metadata - Consistent with Login V2 */}
            <motion.div variants={itemVariants} className="text-center pt-20 border-t border-white/5 opacity-20 hover:opacity-100 transition-opacity duration-1000">
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.8em]">
                    Apex Node Global Infrastructure • Secured by Military-Grade AES-GCM
                </p>
            </motion.div>

            <EditProfileModal
                user={user}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
            `}} />
        </motion.div>
    );
};

export default Settings;
