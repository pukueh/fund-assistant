/**
 * Fund Assistant Pro - Market API
 * 
 * API functions for market data and real-time quotes.
 */

import { apiClient } from './client';
import type { GlobalMarketData, MarketIndex } from '../types';

/**
 * Get global market data (A股, US, Commodities, Crypto, FX)
 */
export const getGlobalMarket = async (
    marketType: 'all' | 'cn' | 'us' | 'commodity' | 'crypto' | 'fx' = 'all'
): Promise<GlobalMarketData> => {
    const { data } = await apiClient.get<GlobalMarketData>('/market/global', {
        params: { market_type: marketType },
    });
    return data;
};

/**
 * Get market indices (simplified view)
 */
export const getMarketIndices = async (): Promise<{
    indices: MarketIndex[];
    update_time: string;
}> => {
    const { data } = await apiClient.get('/market/indices');
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

// ... (existing code)

/**
 * Get fund rankings
 */
export const getFundRankings = async (
    sort: string = '1r',
    limit: number = 20
): Promise<any[]> => {
    const { data } = await apiClient.get('/market/rankings', {
        params: { sort, limit },
    });
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const marketApi = {
    getGlobal: getGlobalMarket,
    getIndices: getMarketIndices,
    getRankings: getFundRankings,
    getDailyReport: async (date?: string) => {
        const { data } = await apiClient.get('/report/daily', {
            params: { date }
        });
        return data;
    },
};

export default marketApi;
