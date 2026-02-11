/**
 * Fund Assistant Pro - Shadow Tracker API
 * 
 * API functions for blogger tracking, shadow portfolios, and performance analysis.
 */

import { apiClient } from './client';
import type {
    Blogger,
    BloggerPortfolio,
    BloggerPerformance,
    BloggerRanking,
    BloggerHolding,
} from '../types';

// ============================================================
// BLOGGER MANAGEMENT
// ============================================================

/**
 * Add blogger to track
 */
export const addBlogger = async (blogger: {
    platform: string;
    platform_id: string;
    name: string;
    description?: string;
}): Promise<{ status: string; blogger_id: number; name: string }> => {
    const { data } = await apiClient.post('/shadow/track', blogger);
    return data;
};

/**
 * List tracked bloggers
 */
export const listBloggers = async (
    activeOnly: boolean = true
): Promise<{ bloggers: Blogger[] }> => {
    const { data } = await apiClient.get('/shadow/bloggers', {
        params: { active_only: activeOnly },
    });
    return data;
};

/**
 * Get blogger detail
 */
export const getBlogger = async (bloggerId: number): Promise<Blogger> => {
    const { data } = await apiClient.get(`/shadow/bloggers/${bloggerId}`);
    return data;
};

/**
 * Stop tracking blogger
 */
export const stopTracking = async (
    bloggerId: number
): Promise<{ status: string; blogger_id: number }> => {
    const { data } = await apiClient.delete(`/shadow/bloggers/${bloggerId}`);
    return data;
};

// ============================================================
// PORTFOLIO
// ============================================================

/**
 * Get blogger's shadow portfolio
 */
export const getPortfolio = async (
    bloggerId: number
): Promise<BloggerPortfolio> => {
    const { data } = await apiClient.get(`/shadow/${bloggerId}/portfolio`);
    return data;
};

/**
 * Fetch latest holdings for blogger
 */
export const fetchHoldings = async (
    bloggerId: number
): Promise<{
    status: string;
    blogger_id: number;
    holdings_count: number;
    holdings: BloggerHolding[];
}> => {
    const { data } = await apiClient.post(`/shadow/${bloggerId}/fetch`);
    return data;
};

/**
 * Extract holdings from text (LLM)
 */
export const extractFromText = async (
    text: string
): Promise<{
    extracted_count: number;
    holdings: Array<{
        fund_code: string;
        fund_name: string;
        weight?: number;
    }>;
}> => {
    const { data } = await apiClient.post('/shadow/extract', { text });
    return data;
};

// ============================================================
// PERFORMANCE ANALYSIS
// ============================================================

/**
 * Get blogger performance
 */
export const getPerformance = async (
    bloggerId: number,
    period: '1M' | '3M' | '6M' | '1Y' = '3M'
): Promise<{
    blogger_id: number;
    period: string;
    metrics: BloggerPerformance;
}> => {
    const { data } = await apiClient.get(`/shadow/${bloggerId}/performance`, {
        params: { period },
    });
    return data;
};

/**
 * Evaluate blogger (is it worth following?)
 */
export const evaluateBlogger = async (
    bloggerId: number
): Promise<{
    worth_following: boolean;
    confidence: number;
    reasons: string[];
    suggestion: string;
}> => {
    const { data } = await apiClient.get(`/shadow/${bloggerId}/evaluate`);
    return data;
};

// ============================================================
// RANKING
// ============================================================

/**
 * Get blogger ranking
 */
export const getRanking = async (
    period: '1M' | '3M' | '6M' | '1Y' = '3M',
    sortBy: 'alpha' | 'total_return' | 'sharpe_ratio' | 'win_rate' = 'alpha',
    limit: number = 20
): Promise<{
    period: string;
    sort_by: string;
    ranking: BloggerRanking[];
}> => {
    const { data } = await apiClient.get('/shadow/ranking', {
        params: { period, sort_by: sortBy, limit },
    });
    return data;
};

/**
 * Get top picks
 */
export const getTopPicks = async (
    limit: number = 5
): Promise<{
    top_picks: Array<{
        blogger_id: number;
        name: string;
        alpha: number;
        recommendation: string;
    }>;
}> => {
    const { data } = await apiClient.get('/shadow/top-picks', {
        params: { limit },
    });
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const shadowApi = {
    bloggers: {
        add: addBlogger,
        list: listBloggers,
        get: getBlogger,
        stopTracking,
    },
    portfolio: {
        get: getPortfolio,
        fetch: fetchHoldings,
        extractFromText,
    },
    performance: {
        get: getPerformance,
        evaluate: evaluateBlogger,
    },
    ranking: {
        get: getRanking,
        topPicks: getTopPicks,
    },
};

export default shadowApi;
