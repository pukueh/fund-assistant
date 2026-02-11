/**
 * Fund Assistant Pro - Discovery API
 * 
 * API functions for fund discovery, daily movers, and categories.
 */

import { apiClient } from './client';
import type { DailyMovers, AIBrief, Category, Tag, Fund } from '../types';

// ============================================================
// DAILY MOVERS
// ============================================================

/**
 * Get daily movers (gainers, losers, popular)
 */
export const getDailyMovers = async (
    limit: number = 10
): Promise<DailyMovers> => {
    const { data } = await apiClient.get('/discovery/movers', {
        params: { limit },
    });
    return data;
};

/**
 * Search funds by keyword
 */
export const searchFunds = async (keyword: string): Promise<{ funds: Fund[] }> => {
    const { data } = await apiClient.get('/search', {
        params: { keyword },
    });
    // Handle both array response (new) and object response (legacy)
    if (Array.isArray(data)) {
        return { funds: data };
    }
    return data;
};

/**
 * Get AI brief for a fund
 */
export const getFundBrief = async (fundCode: string): Promise<AIBrief> => {
    const { data } = await apiClient.get(`/discovery/brief/${fundCode}`);
    return data;
};

// ============================================================
// TAGS
// ============================================================

/**
 * Get all tags
 */
export const getAllTags = async (): Promise<{ tags: Tag[] }> => {
    const { data } = await apiClient.get('/discovery/tags');
    return data;
};

/**
 * Get funds by tag
 */
export const getFundsByTag = async (
    tagSlug: string,
    limit: number = 20
): Promise<{ tag: string; funds: Fund[] }> => {
    const { data } = await apiClient.get(`/discovery/tags/${tagSlug}/funds`, {
        params: { limit },
    });
    return data;
};

/**
 * Get fund tags
 */
export const getFundTags = async (
    fundCode: string
): Promise<{ fund_code: string; tags: Tag[] }> => {
    const { data } = await apiClient.get(`/discovery/fund/${fundCode}/tags`);
    return data;
};

// ============================================================
// CATEGORIES
// ============================================================

/**
 * Get all categories
 */
export const getAllCategories = async (): Promise<{
    categories: Category[];
}> => {
    const { data } = await apiClient.get('/categories/');
    return data;
};

/**
 * Get top categories
 */
export const getTopCategories = async (
    limit: number = 10
): Promise<{
    top_gainers: Category[];
    top_losers: Category[];
    most_funds: Category[];
}> => {
    const { data } = await apiClient.get('/categories/top', {
        params: { limit },
    });
    return data;
};

/**
 * Get category detail
 */
export const getCategory = async (slug: string): Promise<Category> => {
    const { data } = await apiClient.get(`/categories/${slug}`);
    return data;
};

/**
 * Get funds in category
 */
export const getCategoryFunds = async (
    slug: string,
    limit: number = 50
): Promise<{ category: string; funds: Fund[] }> => {
    const { data } = await apiClient.get(`/categories/${slug}/funds`, {
        params: { limit },
    });
    return data;
};

/**
 * Get category index
 */
export const getCategoryIndex = async (
    slug: string
): Promise<{ category: string; index: Record<string, number> }> => {
    const { data } = await apiClient.get(`/categories/${slug}/index`);
    return data;
};

// ============================================================
// TRACKING
// ============================================================

/**
 * Track search
 */
export const trackSearch = async (
    fundCode: string
): Promise<{ status: string }> => {
    const { data } = await apiClient.post(`/discovery/track/search/${fundCode}`);
    return data;
};

/**
 * Track view
 */
export const trackView = async (
    fundCode: string
): Promise<{ status: string }> => {
    const { data } = await apiClient.post(`/discovery/track/view/${fundCode}`);
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const discoveryApi = {
    getDailyMovers,
    getFundBrief,
    searchFunds,
    tags: {
        getAll: getAllTags,
        getFunds: getFundsByTag,
        getForFund: getFundTags,
    },
    categories: {
        getAll: getAllCategories,
        getTop: getTopCategories,
        get: getCategory,
        getFunds: getCategoryFunds,
        getIndex: getCategoryIndex,
    },
    track: {
        search: trackSearch,
        view: trackView,
    },
};

export default discoveryApi;
