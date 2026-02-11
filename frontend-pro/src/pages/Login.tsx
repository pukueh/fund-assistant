/**
 * @fileoverview Login page for Fund Assistant Pro.
 * 
 * Provides a secure and visually premium login experience with support for
 * regular username/password authentication, password reset, and guest access.
 * 
 * Reverted to "V2 Enhanced" Style:
 * - Floating 3D Geometric Logo
 * - Glassmorphism aesthetics
 * - Staggered entrance animations
 * - Restored Registration Link
 * 
 * Complies with Google TypeScript Style Guide.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock,
    User,
    ArrowRight,
    AlertCircle,
    Eye,
    EyeOff,
    ShieldCheck,
    Briefcase,
    Zap,
    ChevronLeft
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
            staggerChildren: 0.1
        }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
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

/**
 * Login Component.
 */
const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, resetPassword, loginAsGuest, isLoading, error: authError, clearError } = useAuthStore();

    // Form State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // UI State
    const [localError, setLocalError] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetSuccess, setResetSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Clear errors on mount and when switching modes
    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    useEffect(() => {
        setLocalError('');
        setResetSuccess('');
        clearError();
    }, [isResetMode, clearError]);

    const handleGuestLogin = async () => {
        setLocalError('');
        const success = await loginAsGuest();
        if (success) {
            navigate('/');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        setResetSuccess('');

        if (isResetMode) {
            if (!username || !newPassword || !inviteCode) {
                setLocalError('请填写所有必填项');
                return;
            }
            if (newPassword.length < 8) {
                setLocalError('新密码长度不能少于8位');
                return;
            }

            const result = await resetPassword(username, newPassword, inviteCode);
            if (result) {
                setResetSuccess('密码重置成功，正在自动登录...');

                // Auto login and redirect to home
                const loginSuccess = await login(username, newPassword);
                if (loginSuccess) {
                    setTimeout(() => {
                        navigate('/');
                    }, 1000);
                } else {
                    // Fallback if auto-login fails - STAY on page
                    setResetSuccess('重置成功！请点击下方按钮返回登录');
                }
            }
            return;
        }

        if (!username || !password) {
            setLocalError('请输入用户名和密码');
            return;
        }

        const success = await login(username, password);
        if (success) {
            navigate('/');
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);
    const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        x: [0, 100, 0],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"
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
                <motion.div className="flex flex-col items-center mb-10" variants={itemVariants}>
                    <motion.div
                        className="relative group cursor-pointer"
                        variants={floatVariants}
                        animate="animate"
                    >
                        {/* Premium Glow Effect */}
                        <div className="absolute -inset-6 bg-gradient-to-tr from-[#00d4aa]/40 via-blue-500/20 to-purple-600/40 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000 animate-pulse"></div>

                        {/* Logo Container - Hexagon Node */}
                        <div className="relative w-24 h-24 bg-[#0f172a]/80 border border-white/10 rounded-[28px] flex items-center justify-center shadow-[0_0_50px_-10px_rgba(0,212,170,0.3)] backdrop-blur-2xl overflow-hidden group-hover:border-[#00d4aa]/50 transition-all duration-500">

                            {/* Inner Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4aa]/10 via-transparent to-blue-500/10 opacity-50"></div>

                            {/* Custom SVG Logo: "The Apex Node" - Abstract Growth */}
                            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 drop-shadow-[0_0_15px_rgba(0,212,170,0.5)] transform group-hover:scale-110 transition-transform duration-700 ease-out">
                                <defs>
                                    <linearGradient id="logoGradient" x1="0" y1="56" x2="56" y2="0" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#00d4aa" />
                                        <stop offset="50%" stopColor="#00a3cc" />
                                        <stop offset="100%" stopColor="#ffffff" />
                                    </linearGradient>
                                </defs>

                                {/* Abstract Crystal Form */}
                                <path
                                    d="M28 10L44 19.2376V37.7128L28 47L12 37.7128V19.2376L28 10Z"
                                    stroke="url(#logoGradient)"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="url(#logoGradient)"
                                    fillOpacity="0.05"
                                />
                                {/* Inner Core */}
                                <path
                                    d="M28 22V34M22 26L28 22L34 26"
                                    stroke="#00d4aa"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <circle cx="28" cy="18" r="2.5" fill="white" className="animate-pulse" />
                            </svg>

                            {/* Shine Effect */}
                            <div className="absolute -top-[100%] left-[20%] w-[20%] h-[300%] bg-gradient-to-b from-transparent via-white/20 to-transparent rotate-45 group-hover:translate-x-[200px] transition-transform duration-1000 ease-in-out"></div>
                        </div>
                    </motion.div>

                    <motion.div className="mt-6 text-center" variants={itemVariants}>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
                            智能基金助手 <span className="text-[#00d4aa] font-mono italic text-2xl ml-1">Pro</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm tracking-widest uppercase font-medium opacity-80">
                            Professional Investment Copilot
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

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white tracking-wide">
                                    {isResetMode ? '重置密码' : '欢迎回来'}
                                </h2>

                            </div>

                            {/* Alert Messages */}
                            <AnimatePresence>
                                {(resetSuccess || localError || authError) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        className={`px-4 py-3 rounded-xl flex items-start gap-3 text-sm border backdrop-blur-md overflow-hidden ${resetSuccess
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}
                                    >
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <span>{resetSuccess || localError || authError}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-4 relative min-h-[120px]">
                                    <motion.div variants={itemVariants} className="group relative z-10">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300"
                                            placeholder="请输入用户名"
                                            autoComplete="username"
                                        />
                                    </motion.div>

                                    <AnimatePresence mode="wait" initial={false}>
                                        {isResetMode ? (
                                            <motion.div
                                                key="reset-fields"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="space-y-4"
                                            >
                                                <div className="group relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                                    </div>
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="block w-full pl-12 pr-12 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300"
                                                        placeholder="设置新密码 (至少8位)"
                                                        autoComplete="new-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={toggleNewPasswordVisibility}
                                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
                                                        tabIndex={-1}
                                                    >
                                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>

                                                <div className="group relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <Briefcase className="h-5 w-5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={inviteCode}
                                                        onChange={(e) => setInviteCode(e.target.value)}
                                                        className="block w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300"
                                                        placeholder="请输入邀请码身份验证"
                                                    />
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="login-fields"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <div className="group relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-[#00d4aa] transition-colors duration-300" />
                                                    </div>
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="block w-full pl-12 pr-12 py-3.5 bg-black/20 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] focus:ring-1 focus:ring-[#00d4aa] transition-all duration-300"
                                                        placeholder="请输入密码"
                                                        autoComplete="current-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={togglePasswordVisibility}
                                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors focus:outline-none"
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {!isResetMode && (
                                    <motion.div
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="flex items-center justify-between pt-2 relative z-40"
                                    >
                                        <label className="flex items-center gap-2 cursor-pointer group select-none pl-1">
                                            <div className="relative flex items-center">
                                                <input type="checkbox" className="peer sr-only" />
                                                <div className="w-4 h-4 border border-gray-600 rounded bg-[#1a1a24] peer-checked:bg-[#00d4aa] peer-checked:border-[#00d4aa] transition-all flex items-center justify-center shadow-inner">
                                                    <svg className="w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">自动登录</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsResetMode(true);
                                                setLocalError('');
                                                setResetSuccess('');
                                            }}
                                            className="text-sm font-semibold text-[#00d4aa] hover:text-[#00d4aa]/80 transition-colors focus:outline-none hover:underline decoration-[#00d4aa]/30 underline-offset-4 flex items-center gap-1.5 py-2 px-2 -mr-2 cursor-pointer relative z-50"
                                        >
                                            <ShieldCheck size={14} />
                                            忘记密码?
                                        </button>
                                    </motion.div>
                                )}

                                <div className="space-y-4 pt-3">
                                    <motion.button
                                        variants={itemVariants}
                                        type="submit"
                                        whileHover={{ scale: 1.02, boxShadow: "0 10px 30px -10px rgba(0, 212, 170, 0.4)" }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={isLoading}
                                        className="w-full relative overflow-hidden group py-3.5 px-4 rounded-xl font-bold text-[#0f172a] bg-gradient-to-r from-[#00d4aa] to-[#00a3cc] hover:from-[#00cba2] hover:to-[#0092b7] transition-all duration-300 shadow-[0_4px_14px_0_rgba(0,212,170,0.39)]"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isLoading ? (
                                                <>
                                                    <Zap size={18} className="animate-spin" />
                                                    <span>{isResetMode ? '提交重置申请...' : '身份验证中...'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    {isResetMode ? '确认重置密码' : '立即登录'}
                                                    {!isResetMode && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                                                </>
                                            )}
                                        </span>
                                        {/* Button Shine Effect */}
                                        <div className="absolute top-0 left-[-100%] w-[100%] h-full bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:left-[200%] transition-all duration-700 ease-in-out"></div>
                                    </motion.button>

                                    {/* Secondary Action Button (Guest Mode OR Back to Login) */}
                                    <motion.button
                                        variants={itemVariants}
                                        type="button"
                                        whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={isResetMode ? () => {
                                            setIsResetMode(false);
                                            setLocalError('');
                                            setResetSuccess('');
                                        } : handleGuestLogin}
                                        disabled={isLoading}
                                        className="w-full flex justify-center py-3.5 px-4 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-[#00d4aa] transition-all focus:outline-none"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isResetMode ? <ChevronLeft size={16} /> : <Zap size={16} />}
                                            <span>{isResetMode ? '返回主登录页' : '体验模式 (免登录访问)'}</span>
                                        </div>
                                    </motion.button>
                                </div>
                            </form>
                        </div>

                        {/* Registration Link - RESTORED */}
                        {!isResetMode && (
                            <motion.div
                                variants={itemVariants}
                                className="mt-6 pt-4 border-t border-white/5 text-center"
                            >
                                <p className="text-xs text-gray-400 font-medium">
                                    还没有账户?{' '}
                                    <Link to="/register" className="text-[#00d4aa] hover:text-white transition-colors hover:underline decoration-[#00d4aa]">
                                        立即注册新用户
                                    </Link>
                                </p>
                            </motion.div>
                        )}

                        {isResetMode && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 pt-4 border-t border-white/5 space-y-3"
                            >
                                <p className="text-[10px] text-gray-500 bg-[#0f172a]/50 py-2 rounded-lg border border-white/5 text-center px-4">
                                    <span className="text-[#00d4aa] block mb-1 font-medium">需要重置邀请码?</span>
                                    由于安全限制，重置密码需要特定的内部邀请码。<br />若您遗忘了邀请码，请直接联系系统管理员处理。
                                </p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Secure Badge */}
                <motion.div
                    variants={itemVariants}
                    className="mt-8 flex justify-center"
                >
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] text-gray-500 uppercase tracking-widest">
                        <ShieldCheck size={12} className="text-green-500" />
                        <span>256-Bit Secure SSL Connection</span>
                    </div>
                </motion.div>
            </motion.div>
        </div >
    );
};

export default Login;
