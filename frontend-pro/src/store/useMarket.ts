/**
 * Fund Assistant Pro - Market Store
 * 
 * Zustand store for global market data.
 */

import { create } from 'zustand';
import type { GlobalMarketData } from '../types';
import { marketApi } from '../api';
import { getRecommendedPollingInterval, shouldPollMarketData } from '../utils/tradingTime';

interface MarketState {
    data: GlobalMarketData | null;
    indices: Array<{ code: string; name: string; value: number; change: number }>;
    isLoading: boolean;
    error: string | null;
    lastUpdated: string | null;

    // Watchlist
    watchlist: string[];
    isWatchlistOpen: boolean;
    addToWatchlist: (code: string) => void;
    removeFromWatchlist: (code: string) => void;
    toggleWatchlist: () => void;

    // Actions
    fetchGlobalMarket: (type?: 'all' | 'cn' | 'us' | 'commodity' | 'crypto' | 'fx') => Promise<void>;
    fetchIndices: () => Promise<void>;
    startPolling: (interval?: number) => void;
    stopPolling: () => void;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

// Load initial watchlist from localStorage
const savedWatchlist = localStorage.getItem('fund_watchlist');
const initialWatchlist = savedWatchlist ? JSON.parse(savedWatchlist) : [];

export const useMarketStore = create<MarketState>()((set, get) => ({
    data: null,
    indices: [],
    isLoading: false,
    error: null,
    lastUpdated: null,

    // Watchlist Initial State
    watchlist: initialWatchlist,
    isWatchlistOpen: false,

    addToWatchlist: (code) => {
        const current = get().watchlist;
        if (!current.includes(code)) {
            const updated = [...current, code];
            set({ watchlist: updated });
            localStorage.setItem('fund_watchlist', JSON.stringify(updated));
        }
    },

    removeFromWatchlist: (code) => {
        const current = get().watchlist;
        const updated = current.filter(c => c !== code);
        set({ watchlist: updated });
        localStorage.setItem('fund_watchlist', JSON.stringify(updated));
    },

    toggleWatchlist: () => set(state => ({ isWatchlistOpen: !state.isWatchlistOpen })),

    fetchGlobalMarket: async (type = 'all') => {
        // Optimization: Check if market is closed to avoid unnecessary API calls
        // But allow initial fetch regardless
        // const status = getMarketStatus();
        // if (status.session === 'closed' || status.session === 'weekend') {
        //     // Maybe skip if data exists and is recent?
        //     // For now, always fetch on manual call or first load
        // }

        set({ isLoading: !get().data, error: null }); // Only show loading on initial fetch
        try {
            const data = await marketApi.getGlobal(type);
            set({
                data,
                isLoading: false,
                lastUpdated: data.update_time,
            });
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : '获取市场数据失败',
                isLoading: false,
            });
        }
    },

    fetchIndices: async () => {
        try {
            const data = await marketApi.getGlobal('all');

            // Aggregate indices from all markets
            const allIndices: Array<{ code: string; name: string; value: number; change: number }> = [];

            // Helper to map indices
            const mapIndices = (list: any[]) => list?.map((idx: any) => ({
                code: idx.code || idx.symbol || '',
                name: idx.name || '',
                value: idx.value || idx.price || 0,
                change: idx.change_percent || idx.change || 0,
            })) || [];

            if (data.markets) {
                if (data.markets.cn?.indices) allIndices.push(...mapIndices(data.markets.cn.indices));
                if (data.markets.us?.indices) allIndices.push(...mapIndices(data.markets.us.indices));
                if (data.markets.commodity?.indices) allIndices.push(...mapIndices(data.markets.commodity.indices));
                if (data.markets.crypto?.indices) allIndices.push(...mapIndices(data.markets.crypto.indices));
            }

            set({ indices: allIndices });
        } catch (err) {
            console.error('Failed to fetch indices:', err);
        }
    },

    startPolling: (interval) => {
        // Clear existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        // Initial fetch
        get().fetchGlobalMarket();

        // Check trading time to determine interval if not provided
        const recommendedInterval = interval || getRecommendedPollingInterval();

        if (recommendedInterval <= 0) {
            console.log('Market is closed, polling disabled');
            return;
        }

        console.log(`Starting market polling with interval: ${recommendedInterval}ms`);

        // Start polling
        pollingInterval = setInterval(() => {
            // Re-check interval on every tick in case session changed? 
            // Better to re-schedule. For simplicity, we stick to the interval 
            // but check inside the fetch if we should abort?
            // Actually, let's just use the logic

            // Check if we should still be polling
            if (!shouldPollMarketData()) {
                console.log('Market closed during polling, stopping...');
                get().stopPolling();
                return;
            }

            get().fetchGlobalMarket();
        }, recommendedInterval);
    },

    stopPolling: () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    },
}));
