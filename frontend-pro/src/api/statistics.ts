import apiClient from './client';
import type { FundAnalyticsResponse, FundBacktestResponse, CorrelationAnalysis } from '../types/statistics';

export const statisticsApi = {
    /**
     * Get comprehensive analytics for a specific fund
     */
    getFundAnalytics: async (code: string) => {
        const response = await apiClient.get<FundAnalyticsResponse>(`/fund/${code}/analytics`);
        return response.data;
    },

    /**
     * Run DIP (Dollar-Cost Averaging) backtest simulation
     */
    getFundBacktest: async (code: string, amount: number = 1000, frequency: string = 'monthly') => {
        const response = await apiClient.get<FundBacktestResponse>(`/fund/${code}/backtest`, {
            params: { amount, frequency }
        });
        return response.data;
    },

    /**
     * Get portfolio correlation analysis
     */
    getPortfolioAnalytics: async () => {
        const response = await apiClient.get<CorrelationAnalysis>('/portfolio/analytics');
        return response.data;
    }
};

export default statisticsApi;
