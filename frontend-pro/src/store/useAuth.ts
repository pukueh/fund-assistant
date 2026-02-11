/**
 * Fund Assistant Pro - Auth Store
 * 
 * Zustand store for authentication state management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../api';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    register: (username: string, password: string, email: string | undefined, inviteCode: string) => Promise<string>;
    resetPassword: (username: string, newPassword: string, inviteCode: string) => Promise<boolean>;
    loginAsGuest: () => Promise<boolean>;
    fetchProfile: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (username: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.login(username, password);
                    if (response.status === 'success' && response.user) {
                        set({
                            user: response.user,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                        return true;
                    } else {
                        set({
                            error: response.message || '登录失败',
                            isLoading: false,
                        });
                        return false;
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : '登录失败',
                        isLoading: false,
                    });
                    return false;
                }
            },

            logout: () => {
                authApi.logout();
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null,
                });
            },

            register: async (username: string, password: string, email: string | undefined, inviteCode: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.register(username, password, email, inviteCode);

                    if (!response) throw new Error('注册失败');

                    // If simple success response
                    if (response.status === 'success' || response.account_status === 'active') {
                        // Auto-login
                        const loginSuccess = await get().login(username, password);
                        return loginSuccess ? 'success' : 'error';
                    }

                    // Handle other statuses
                    if (response.account_status === 'pending') {
                        set({ isLoading: false });
                        return 'pending';
                    }

                    set({
                        error: response.message || '注册失败',
                        isLoading: false,
                    });
                    return 'error';

                } catch (err: any) {
                    set({
                        error: err.response?.data?.detail || err.message || '注册失败',
                        isLoading: false,
                    });
                    // Re-throw to let component handle specific errors if needed
                    throw err;
                }
            },

            resetPassword: async (username: string, newPassword: string, inviteCode: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.resetPassword(username, newPassword, inviteCode);
                    if (response.status === 'success') {
                        set({ isLoading: false });
                        return true;
                    }
                    set({
                        error: response.message || '重置失败',
                        isLoading: false,
                    });
                    return false;
                } catch (err: any) {
                    set({
                        error: err.response?.data?.detail || err.message || '重置失败',
                        isLoading: false,
                    });
                    return false;
                }
            },

            loginAsGuest: async () => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authApi.loginAsGuest();
                    if (response.status === 'success' && response.user) {
                        set({
                            user: response.user,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                        return true;
                    }
                    set({ error: '体验模式登录失败', isLoading: false });
                    return false;
                } catch (err) {
                    set({
                        error: '体验模式登录失败',
                        isLoading: false,
                    });
                    return false;
                }
            },

            fetchProfile: async () => {
                try {
                    const user = await authApi.getProfile();
                    set({ user, isAuthenticated: true });
                } catch {
                    set({ user: null, isAuthenticated: false });
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'fund-assistant-auth',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);

// Listen for logout events
if (typeof window !== 'undefined') {
    window.addEventListener('auth:logout', () => {
        useAuthStore.getState().logout();
    });
}
