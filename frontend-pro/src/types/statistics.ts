export interface ReturnAnalysis {
    total_return: number
    annualized_return: number
    daily_return: number
    volatility: number
    max_drawdown: number
    max_drawdown_start: string
    max_drawdown_end: string
    sharpe_ratio: number
    sortino_ratio: number
    calmar_ratio: number
    trading_days: number
    start_date: string
    end_date: string
}

export interface FundScore {
    total: number
    dimensions: {
        revenue: number
        risk: number
        manager: number
        company: number
        cost: number
    }
}

export interface DIPRecord {
    date: string
    nav: number
    amount: number
    shares: number
    total_shares: number
    total_cost: number
    market_value: number
    return_rate: number
}

export interface DIPSimulation {
    total_invested: number
    current_value: number
    total_return: number
    return_rate: number
    annualized_return: number
    average_cost: number
    total_shares: number
    periods: number
    records: DIPRecord[]
}

export interface BestDIPDay {
    day: number
    average_return: number
    success_rate: number
    recommendation: string
}

export interface CorrelationPair {
    fund1: { code: string; name: string }
    fund2: { code: string; name: string }
    correlation: number
    suggestion: string
}

export interface CorrelationAnalysis {
    matrix: number[][]
    codes: string[]
    names: string[]
    diversification: number
    suggestion: string
    high_correlation_pairs: CorrelationPair[]
}

export interface FundMetrics {
    sharpe_ratio: number
    max_drawdown: number
    volatility: number
    total_return: number
    consecutive_up: number
    consecutive_down: number
    max_consecutive_up: number
    max_consecutive_down: number
    alpha?: number // Optional
    beta?: number // Optional
    information_ratio?: number // Optional
}

export interface FundAnalyticsResponse {
    metrics: FundMetrics
    score: FundScore
    analysis: string
}

export interface FundBacktestResponse {
    simulation: DIPSimulation | null
    best_days: BestDIPDay[]
}
