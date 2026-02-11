/**
 * Fund Assistant Pro - Market Data Hook
 * 
 * 封装市场数据获取逻辑
 */

import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../api';
import type { GlobalMarketData } from '../types';

export function useMarketData(
    marketType: 'all' | 'cn' | 'us' | 'commodity' | 'crypto' | 'fx' = 'all',
    options = {}
) {
    return useQuery<GlobalMarketData>({
        queryKey: ['market', marketType],
        queryFn: () => marketApi.getGlobal(marketType),
        refetchInterval: 30000, // 30秒自动刷新
        staleTime: 10000, // 10秒内认为数据新鲜
        ...options,
    });
}

export function useMarketIndices(options = {}) {
    return useQuery({
        queryKey: ['market', 'indices'],
        queryFn: () => marketApi.getIndices(),
        refetchInterval: 30000,
        staleTime: 10000,
        ...options,
    });
}
