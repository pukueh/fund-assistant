/**
 * @fileoverview Register page for Fund Assistant Pro.
 * 
 * Provides a secure and visually premium registration experience.
 * Matches the "V2 Enhanced" design system of the Login page.
 * 
 * Features:
 * - Floating 3D Geometric Logo
 * - Glassmorphism card aesthetics
 * - Dynamic background animations
 * - Staggered entrance animations
 * - Form validation and error handling
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Lock,
    Mail,
    ArrowRight,
    AlertCircle,
    Shield,
    TrendingUp,
    Zap,
    ShieldCheck,
    Briefcase,
    CheckCircle,
    Eye,
    EyeOff
} from 'lucide-react';
import { useAuthStore } from '../store';

/**
 * Animation variants for the container.
 */
const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.6,
            ease: "easeOut",
            staggerChildren: 0.08
        }
    }
};

/**
 * Animation variants for form elements.
 */
const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

/**
 * Floating animation for the logo.
 */
const floatVariants: any = {
    animate: {
        y: [0, -10, 0],
        rotate: [0, 1, -1, 0],
        transition: {
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

const Register = () => {
    const navigate = useNavigate();
    const { register, isLoading, error: authError } = useAuthStore();

    // Form State
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    // UI State
    const [localError, setLocalError] = useState('');
    const [isPendingApproval, setIsPendingApproval] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!username || !password || !confirmPassword || !inviteCode) {
            setLocalError('请填写所有必填项');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('两次输入的密码不一致');
            return;
        }

        if (password.length < 6) {
            setLocalError('密码长度至少为6位');
            return;
        }

        const status = await register(username, password, email || undefined, inviteCode);

        if (status === 'success') {
            navigate('/');
        } else if (status === 'pending') {
            setIsPendingApproval(true);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);
    const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

    // Render "Pending Approval" State
    if (isPendingApproval) {
        return (
            <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-green-500/10 rounded-full blur-[120px]"
                    />
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" style={{ backgroundSize: '40px 40px' }} />
                </div>

                <motion.div
                    className="w-full max-w-md relative z-10"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.div
                        className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-1 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]"
                        variants={itemVariants}
                    >
                        <div className="bg-[#0f172a]/40 rounded-[22px] p-8 border border-white/5 relative overflow-hidden text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-20 h-20 bg-[#00d4aa]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#00d4aa]/20"
                            >
                                <CheckCircle className="text-[#00d4aa]" size={40} />
                            </motion.div>

                            <h2 className="text-2xl font-bold text-white mb-2">申请已提交</h2>
                            <p className="text-gray-400 mb-6 leading-relaxed">
                                您的账号 <strong className="text-white">{username}</strong> 已创建成功。<br />
                                为了确保平台安全，我们会对新用户进行审核。<br />请耐心等待管理员批准。
                            </p>

                            <div className="bg-[#1a1a24]/80 p-4 rounded-xl text-sm text-gray-400 mb-8 border border-white/5">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Shield size={14} className="text-[#00d4aa]" />
                                    <span className="font-medium text-gray-300">安全审核中</span>
                                </div>
                                <span className="text-xs opacity-70">预计审核时间: 1-2 小时</span>
                            </div>

                            <Link to="/login">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold text-[#00d4aa] transition-all"
                                >
                                    返回登录页面
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // Render Registration Form
    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], x: [0, -100, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#00d4aa]/10 rounded-full blur-[120px]"
                />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" style={{ backgroundSize: '40px 40px' }} />
            </div>

            <motion.div
                className="w-full max-w-md relative z-10"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Logo & Branding */}
                <motion.div className="flex flex-col items-center mb-8" variants={itemVariants}>
                    <motion.div
                        className="relative group cursor-pointer"
                        variants={floatVariants}
                        animate="animate"
                    >
                        <div className="absolute -inset-4 bg-gradient-to-r from-[#00d4aa] to-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500 animate-pulse"></div>
                        <div className="relative w-16 h-16 bg-[#0f172a] border border-[#00d4aa]/30 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4aa]/10 to-transparent"></div>
                            <div className="relative z-10 flex flex-col items-center gap-0.5">
                                <TrendingUp className="text-[#00d4aa]" size={28} strokeWidth={2.5} />
                                <div className="h-0.5 w-6 bg-[#00d4aa] rounded-full mt-1"></div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div className="mt-4 text-center" variants={itemVariants}>
                        <h1 className="text-2xl font-bold text-white tracking-wide">
                            创建新账户
                        </h1>
                        <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider">
                            Join Fund Assistant Pro
                        </p>
                    </motion.div>
                </motion.div>

                {/* Main Card */}
                <motion.div
                    className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-1 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]"
                    variants={itemVariants}
                >
                    <div className="bg-[#0f172a]/40 rounded-[22px] p-7 border border-white/5 relative overflow-hidden group">

                        {/* Interactive Border Hover Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00d4aa]/0 via-[#00d4aa]/5 to-[#00d4aa]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ transform: 'skewX(-20deg) translateX(-100%)', transition: 'transform 1s' }} />

                        {/* Error Message */}
                        <AnimatePresence>
                            {(localError || authError) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm backdrop-blur-md overflow-hidden"
                                >
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{localError || authError}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Username */}
                            <motion.div variants={itemVariants} className="group relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300 sm:text-sm"
                                    placeholder="用户名"
                                />
                            </motion.div>

                            {/* Email */}
                            <motion.div variants={itemVariants} className="group relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300 sm:text-sm"
                                    placeholder="邮箱 (可选)"
                                />
                            </motion.div>

                            {/* Password */}
                            <div className="grid grid-cols-2 gap-4">
                                <motion.div variants={itemVariants} className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-9 pr-8 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300 sm:text-xs"
                                        placeholder="设置密码"
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </motion.div>

                                <motion.div variants={itemVariants} className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Shield className="h-4 w-4 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                    </div>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-9 pr-8 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300 sm:text-xs"
                                        placeholder="确认密码"
                                    />
                                    <button
                                        type="button"
                                        onClick={toggleConfirmPasswordVisibility}
                                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
                                    >
                                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </motion.div>
                            </div>

                            {/* Invite Code */}
                            <motion.div variants={itemVariants} className="space-y-1">
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Briefcase className="h-5 w-5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                    </div>
                                    <input
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300 sm:text-sm"
                                        placeholder="请输入邀请码"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 ml-1 pl-1 border-l-2 border-[#00d4aa]/30">
                                    本系统为内部邀请制，请联系管理员获取
                                </p>
                            </motion.div>

                            <motion.button
                                variants={itemVariants}
                                type="submit"
                                whileHover={{ scale: 1.02, boxShadow: "0 10px 30px -10px rgba(0, 212, 170, 0.4)" }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isLoading}
                                className="w-full relative overflow-hidden group py-3.5 px-4 rounded-xl font-bold text-[#0f172a] bg-gradient-to-r from-[#00d4aa] to-[#00a3cc] hover:from-[#00cba2] hover:to-[#0092b7] transition-all duration-300 shadow-[0_4px_14px_0_rgba(0,212,170,0.39)] mt-2"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <Zap size={18} className="animate-spin" />
                                            <span>提交申请中...</span>
                                        </>
                                    ) : (
                                        <>
                                            立即注册
                                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                                {/* Button Shine Effect */}
                                <div className="absolute top-0 left-[-100%] w-[100%] h-full bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:left-[200%] transition-all duration-700 ease-in-out"></div>
                            </motion.button>
                        </form>

                        <motion.div
                            variants={itemVariants}
                            className="mt-6 pt-5 border-t border-white/5 text-center"
                        >
                            <p className="text-xs text-gray-400 font-medium">
                                已经有账户了?{' '}
                                <Link to="/login" className="text-[#00d4aa] hover:text-white transition-colors hover:underline decoration-[#00d4aa] underline-offset-4">
                                    直接登录系统
                                </Link>
                            </p>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Footer Badge */}
                <motion.div
                    variants={itemVariants}
                    className="mt-8 flex justify-center opacity-60 hover:opacity-100 transition-opacity"
                >
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <ShieldCheck size={12} />
                        <span>SECURE ENCRYPTED REGISTRATION</span>
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
};

export default Register;
