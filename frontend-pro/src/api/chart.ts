/**
 * Fund Assistant Pro - Charts API
 * 
 * API functions for chart data, fund details, and technical indicators.
 */

import { apiClient } from './client';
import type { FundChartData, FundMetrics, FundEvent } from '../types';

// ============================================================
// FUND DATA
// ============================================================

/**
 * Get fund NAV
 */
export const getFundNav = async (
    fundCode: string
): Promise<{
    fund_code: string;
    fund_name: string;
    nav: number;
    nav_date: string;
    day_change: number;
}> => {
    const { data } = await apiClient.get(`/fund/${fundCode}`);
    return data;
};

/**
 * Search funds
 */
export const searchFunds = async (
    keyword: string
): Promise<{
    funds: Array<{
        code: string;
        name: string;
        type: string;
    }>;
}> => {
    const { data } = await apiClient.get('/search', {
        params: { keyword },
    });
    return data;
};

// ============================================================
// CHART DATA
// ============================================================

/**
 * Get chart data for a fund
 */
export const getChartData = async (
    fundCode: string,
    period: '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | 'MAX' = '1Y',
    benchmark: string = '000300'
): Promise<FundChartData> => {
    const { data } = await apiClient.get(`/chart/data/${fundCode}`, {
        params: { period, benchmark },
    });
    return data;
};

/**
 * Get benchmark data
 */
export const getBenchmarkData = async (
    indexCode: string,
    period: string = '1Y'
): Promise<{
    index_code: string;
    period: string;
    nav_data: Array<{ time: number; value: number }>;
}> => {
    const { data } = await apiClient.get(`/chart/benchmark/${indexCode}`, {
        params: { period },
    });
    return data;
};

/**
 * Get fund events
 */
export const getFundEvents = async (
    fundCode: string,
    eventTypes?: string[]
): Promise<{ fund_code: string; events: FundEvent[] }> => {
    const { data } = await apiClient.get(`/chart/events/${fundCode}`, {
        params: eventTypes ? { event_types: eventTypes.join(',') } : {},
    });
    return data;
};

/**
 * Get fund metrics
 */
export const getFundMetrics = async (
    fundCode: string
): Promise<FundMetrics> => {
    const { data } = await apiClient.get(`/chart/metrics/${fundCode}`);
    return data;
};

/**
 * Get fund holdings (top holdings)
 */
export const getFundHoldings = async (
    fundCode: string
): Promise<{
    fund_code: string;
    holdings: Array<{
        name: string;
        weight: number;
        change?: number;
    }>;
}> => {
    const { data } = await apiClient.get(`/chart/holdings/${fundCode}`);
    return data;
};

/**
 * Compare multiple funds
 */
export const compareFunds = async (
    fundCodes: string[],
    period: string = '1Y'
): Promise<{
    period: string;
    funds: Array<{
        fund_code: string;
        nav_data: Array<{ time: number; value: number }>;
        metrics?: FundMetrics;
    }>;
}> => {
    const { data } = await apiClient.get('/chart/compare', {
        params: { fund_codes: fundCodes.join(','), period },
    });
    return data;
};

/**
 * Trigger data collection
 */
export const collectData = async (
    fundCode: string,
    days: number = 365
): Promise<{ status: string; nav_count: number; events_count: number }> => {
    const { data } = await apiClient.post(`/chart/collect/${fundCode}`, null, {
        params: { days },
    });
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const chartApi = {
    getFundNav,
    searchFunds,
    getChartData,
    getBenchmarkData,
    getFundEvents,
    getFundMetrics,
    getFundHoldings,
    compareFunds,
    collectData,
};

export default chartApi;
