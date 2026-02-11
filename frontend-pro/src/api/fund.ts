/**
 * Fund API - For fund-specific data (details, managers, intraday)
 */
import { apiClient } from './client';
import type { FundYieldData, FundDiagnostic, FundDetail, FundManager, StockHolding } from '../types';

export interface IntradayPoint {
    time: string;
    value: number;
    nav: number;
}

export interface IntradayData {
    fund_code: string;
    fund_name: string;
    base_nav: number;
    points: IntradayPoint[];
    update_time: string;
    source: string;
}



export interface HistoricalPoint {
    date: string;
    nav: number;
    accumulated_nav: number;
    change_percent: number;
}

export interface HistoricalData {
    fund_code: string;
    points: HistoricalPoint[];
    source: string;
}

export const fundApi = {
    /**
     * 获取基金分时估值数据
     */
    getIntraday: async (fundCode: string): Promise<IntradayData> => {
        const { data } = await apiClient.get(`/fund/${fundCode}/intraday`);
        return data;
    },

    /**
     * 获取基金历史净值 (K线数据)
     * @param range y(1年), 3y(3年), 6y(6年), n(今年以来), 3n, 5n
     */
    getHistory: async (fundCode: string, range: string = 'y'): Promise<HistoricalData> => {
        const { data } = await apiClient.get(`/fund/${fundCode}/history`, { params: { range } });
        return data;
    },

    /**
     * 获取基金详细信息
     */
    getDetails: async (fundCode: string): Promise<FundDetail> => {
        const { data } = await apiClient.get(`/fund/${fundCode}/details`);
        return {
            ...data,
            code: data.fund_code,
            name: data.fund_name,
        };
    },

    /**
     * 获取基金经理列表
     */
    getManagers: async (fundCode: string): Promise<FundManager[]> => {
        const { data } = await apiClient.get(`/fund/${fundCode}/managers`);
        return data;
    },

    /**
     * 获取基金净值
     */
    getNav: async (fundCode: string) => {
        const { data } = await apiClient.get(`/fund/${fundCode}`);
        return data;
    },

    /**
     * 获取基金累计收益率走势 (对比指数/同类)
     */
    getYield: async (fundCode: string, range: string = 'y'): Promise<FundYieldData> => {
        const { data } = await apiClient.get(`/fund/${fundCode}/yield`, { params: { range } });
        return data;
    },

    /**
     * 获取基金诊断评分
     */
    getDiagnostic: async (fundCode: string): Promise<FundDiagnostic> => {
        const { data } = await apiClient.get(`/fund/${fundCode}/diagnostic`);
        return data;
    },

    /**
     * 获取基金重仓股
     */
    getHoldings: async (fundCode: string): Promise<StockHolding[]> => {
        const { data } = await apiClient.get(`/fund/${fundCode}/holdings`);
        return data;
    }
};

