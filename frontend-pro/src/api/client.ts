/**
 * Fund Assistant Pro - API Client
 * 
 * Centralized HTTP client with authentication, error handling, and type safety.
 * Handles all communication with the FastAPI backend.
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================================
// TYPES
// ============================================================

export interface ApiError {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

// ============================================================
// CLIENT CONFIGURATION
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'fund_assistant_token';

/**
 * Create configured Axios instance
 */
const createClient = (): AxiosInstance => {
    const client = axios.create({
        baseURL: API_BASE_URL,
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor - attach auth token
    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    client.interceptors.response.use(
        (response) => response,
        (error: AxiosError<ApiError>) => {
            if (error.response?.status === 401) {
                // Token expired or invalid - clear and redirect
                localStorage.removeItem(TOKEN_KEY);
                window.dispatchEvent(new CustomEvent('auth:logout'));
            }
            return Promise.reject(formatError(error));
        }
    );

    return client;
};

/**
 * Format error for consistent handling
 */
const formatError = (error: AxiosError<any>): ApiError => {
    if (error.response?.data) {
        // FastAPI returns errors in 'detail' field, standard APIs often use 'message'
        const data = error.response.data;
        return {
            message: data.detail || data.message || error.message,
            code: error.code,
            details: data.details,
        };
    }
    return {
        message: error.message || 'An unexpected error occurred',
        code: error.code,
    };
};

// Singleton client instance
const apiClient = createClient();

// ============================================================
// AUTH HELPERS
// ============================================================

export const setAuthToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
};

export const getAuthToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
};

// ============================================================
// EXPORTS
// ============================================================

export { apiClient };
export default apiClient;
