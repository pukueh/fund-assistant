/**
 * Fund Assistant Pro - Auth API
 * 
 * API functions for user authentication and profile management.
 */

import { apiClient, setAuthToken, clearAuthToken } from './client';
import type { User, AuthResponse } from '../types';

// ============================================================
// AUTHENTICATION
// ============================================================

/**
 * Register a new user
 */
export const register = async (
    username: string,
    password: string,
    email: string | undefined, // Fixed type
    inviteCode: string,
    riskLevel: string = '中等'
): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/auth/register', {
        username,
        password,
        email,
        risk_level: riskLevel,
        invite_code: inviteCode,
    });
    return data;
};

/**
 * Login user
 */
export const login = async (
    username: string,
    password: string
): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
        username,
        password,
    });

    if (data.status === 'success' && data.token) {
        setAuthToken(data.token);
    }

    return data;
};

/**
 * Logout user
 */
export const logout = (): void => {
    clearAuthToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
};

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/profile');
    return data;
};
/**
 * Login as guest
 */
export const loginAsGuest = async (): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/guest-login');

    if (data.status === 'success' && data.token) {
        setAuthToken(data.token);
    }

    return data;
};

/**
 * Reset password
 */
export const resetPassword = async (
    username: string,
    newPassword: string,
    inviteCode: string
): Promise<{ status: string; message: string }> => {
    const { data } = await apiClient.post('/auth/reset-password', {
        username,
        new_password: newPassword,
        invite_code: inviteCode,
    });
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const authApi = {
    register,
    login,
    logout,
    getProfile,
    resetPassword,
    loginAsGuest,
};

export default authApi;
