/**
 * Fund Assistant Pro - Portfolio API
 * 
 * API functions for portfolio management, holdings, and valuation.
 */

import { apiClient } from './client';
import type {
    Holding,
    PortfolioSummary,
    PortfolioSnapshot,
    Achievement,
} from '../types';

// ============================================================
// HOLDINGS
// ============================================================

/**
 * Get user holdings list
 */
export const getHoldings = async (): Promise<{ holdings: Holding[] }> => {
    // Migrated: /holdings -> /portfolio/holdings
    const { data } = await apiClient.get('/portfolio/holdings');
    return data;
};

/**
 * Get portfolio valuation (with current NAV)
 */
export const getValuation = async (): Promise<{
    holdings: Holding[];
    total_value: number;
    total_cost: number;
    total_profit: number;
    total_profit_rate: number;
}> => {
    // Migrated: /valuation -> /portfolio/valuation
    const { data } = await apiClient.get('/portfolio/valuation');
    return data;
};

/**
 * Add a new holding
 */
export const addHolding = async (holding: {
    fund_code: string;
    fund_name?: string;
    shares: number;
    cost_nav: number;
}): Promise<{ status: string; holding: Holding }> => {
    // Migrated: /holdings -> /portfolio/holdings
    const { data } = await apiClient.post('/portfolio/holdings', holding);
    return data;
};

/**
 * Remove a holding
 */
export const removeHolding = async (
    fundCode: string
): Promise<{ status: string }> => {
    // Migrated: /holdings/{code} -> /portfolio/holdings/{code}
    const { data } = await apiClient.delete(`/portfolio/holdings/${fundCode}`);
    return data;
};

/**
 * Batch add holdings
 */
export const batchAddHoldings = async (holdings: Array<{
    fund_code: string;
    fund_name?: string;
    shares: number;
    cost_nav: number;
}>): Promise<{ status: string; count: number }> => {
    const { data } = await apiClient.post('/portfolio/holdings/batch', holdings);
    return data;
};

/**
 * Update holding tags
 */
export const updateTags = async (
    fundCode: string,
    tags: string[]
): Promise<{ status: string }> => {
    const { data } = await apiClient.post(`/portfolio/holding/${fundCode}/tags`, { tags });
    return data;
};


// ============================================================
// PORTFOLIO ANALYTICS
// ============================================================

/**
 * Get portfolio summary (Robinhood style)
 */
export const getPortfolioSummary = async (): Promise<PortfolioSummary> => {
    const { data } = await apiClient.get('/portfolio/summary');
    return data;
};

/**
 * Get portfolio growth curve
 */
export const getGrowthCurve = async (
    period: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL' = '1M'
): Promise<{
    period: string;
    data: Array<{ time: string; value: number; profit: number }>;
}> => {
    const { data } = await apiClient.get('/portfolio/growth-curve', {
        params: { period },
    });
    return data;
};

/**
 * Get portfolio snapshots history
 */
export const getSnapshots = async (
    days: number = 30
): Promise<{
    snapshots: PortfolioSnapshot[];
}> => {
    const { data } = await apiClient.get('/portfolio/snapshots', {
        params: { days },
    });
    return data;
};

/**
 * Create a new portfolio snapshot
 */
export const createSnapshot = async (): Promise<{
    status: string;
    snapshot: PortfolioSnapshot;
}> => {
    const { data } = await apiClient.post('/portfolio/snapshot');
    return data;
};

// ============================================================
// ACHIEVEMENTS
// ============================================================

/**
 * Get user achievements
 */
export const getAchievements = async (): Promise<{
    earned: Achievement[];
    pending: Achievement[];
    total_earned: number;
    total_available: number;
}> => {
    const { data } = await apiClient.get('/portfolio/achievements');
    return data;
};

/**
 * Get recent achievements
 */
export const getRecentAchievements = async (
    limit: number = 5
): Promise<{ achievements: Achievement[] }> => {
    const { data } = await apiClient.get('/portfolio/achievements/recent', {
        params: { limit },
    });
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const portfolioApi = {
    getHoldings,
    getValuation,
    addHolding,
    batchAddHoldings,
    removeHolding,
    getSummary: getPortfolioSummary,
    getGrowthCurve,
    getSnapshots,
    createSnapshot,
    getAchievements,
    getRecentAchievements,
    updateTags,
};

export default portfolioApi;
