/**
 * Fund Assistant Pro - Portfolio Store
 * 
 * Zustand store for portfolio and holdings state.
 */

import { create } from 'zustand';
import type { Holding, PortfolioSummary, Achievement } from '../types';
import { portfolioApi } from '../api';

interface PortfolioState {
    holdings: Holding[];
    summary: PortfolioSummary | null;
    achievements: Achievement[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchHoldings: (showLoading?: boolean) => Promise<void>;
    fetchSummary: (showLoading?: boolean) => Promise<void>;
    fetchAchievements: () => Promise<void>;
    addHolding: (holding: {
        fund_code: string;
        fund_name?: string;
        shares: number;
        cost_nav: number;
    }) => Promise<boolean>;
    batchAddHoldings: (holdings: Array<{
        fund_code: string;
        fund_name?: string;
        shares: number;
        cost_nav: number;
    }>) => Promise<boolean>;
    removeHolding: (fundCode: string) => Promise<boolean>;
    refreshAll: () => Promise<void>;

    // UI State
    isAchievementOpen: boolean;
    toggleAchievement: () => void;
}

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
    holdings: [],
    summary: null,
    achievements: [],
    isLoading: false,
    error: null,

    fetchHoldings: async (showLoading = true) => {
        if (showLoading) set({ isLoading: true, error: null });
        try {
            const data = await portfolioApi.getValuation();
            set({
                holdings: data.holdings || [],
                isLoading: false,
            });
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : '获取持仓失败',
                isLoading: false,
            });
        }
    },

    fetchSummary: async (showLoading = true) => {
        if (showLoading) set({ isLoading: true, error: null });
        try {
            const summary = await portfolioApi.getSummary();
            set({ summary, isLoading: false });
        } catch (err) {
            console.error('Failed to fetch summary:', err);
            set({
                error: err instanceof Error ? err.message : '获取资产概览失败',
                isLoading: false
            });
        }
    },

    fetchAchievements: async () => {
        try {
            const data = await portfolioApi.getAchievements();
            set({ achievements: data.earned });
        } catch (err) {
            console.error('Failed to fetch achievements:', err);
        }
    },

    addHolding: async (holding) => {
        try {
            await portfolioApi.addHolding(holding);
            set({ error: null }); // Clear previous error

            // Silent refresh to avoid background flash while modal is open
            await Promise.all([
                get().fetchHoldings(false),
                get().fetchSummary(false)
            ]);

            // Check if fetch failed
            if (get().error) return false;

            return true;
        } catch (err) {
            set({ error: err instanceof Error ? err.message : '添加持仓失败' });
            return false;
        }
    },

    batchAddHoldings: async (holdings) => {
        try {
            await portfolioApi.batchAddHoldings(holdings);
            set({ error: null }); // Clear previous error

            // Silent refresh to avoid background flash while modal is open
            await Promise.all([
                get().fetchHoldings(false),
                get().fetchSummary(false)
            ]);

            // Check if fetch failed
            if (get().error) return false;

            return true;
        } catch (err) {
            set({ error: err instanceof Error ? err.message : '批量添加失败' });
            return false;
        }
    },

    removeHolding: async (fundCode) => {
        // Snapshot current state for rollback
        const previousHoldings = get().holdings;
        const previousSummary = get().summary;

        // Optimistic update: Remove immediately
        set(state => ({
            holdings: state.holdings.filter(h => h.fund_code !== fundCode),
            error: null
        }));

        try {
            await portfolioApi.removeHolding(fundCode);

            // Silent refresh in background to get updated summary/calculations
            await Promise.all([
                get().fetchSummary(false),
                // Optionally refresh holdings to confirm sync, but usually not needed if calculation is done locally
                // get().fetchHoldings(false) 
            ]);

            return true;
        } catch (err) {
            // Revert on failure
            set({
                holdings: previousHoldings,
                summary: previousSummary,
                error: err instanceof Error ? err.message : '删除持仓失败，已恢复数据'
            });
            return false;
        }
    },

    refreshAll: async () => {
        set({ isLoading: true });
        await Promise.all([
            get().fetchHoldings(),
            get().fetchSummary(),
            get().fetchAchievements(),
        ]);
        set({ isLoading: false });
    },

    isAchievementOpen: false,
    toggleAchievement: () => set(state => ({ isAchievementOpen: !state.isAchievementOpen })),
}));
