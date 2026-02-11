/**
 * Fund Assistant Pro - TypeScript Type Definitions
 * 
 * Comprehensive type definitions for API responses and application state.
 * Ensures type safety across the entire frontend application.
 */

// Re-export statistics types
export * from './statistics';


// ============================================================
// MARKET DATA TYPES
// ============================================================

export interface MarketIndex {
    code: string;
    name: string;
    price: number;
    change: number;
    unit?: string;
}

export interface MarketCategory {
    name: string;
    indices: MarketIndex[];
}

export interface GlobalMarketData {
    update_time: string;
    markets: {
        cn?: MarketCategory;
        us?: MarketCategory;
        commodity?: MarketCategory;
        crypto?: MarketCategory;
        fx?: MarketCategory;
    };
}

// ============================================================
// PORTFOLIO TYPES
// ============================================================

export interface Holding {
    fund_code: string;
    fund_name: string;
    shares: number;
    cost_nav: number;
    current_nav?: number;
    current_value?: number;
    profit?: number;
    profit_rate?: number;
    // Real-time fields
    estimated_nav?: number;
    day_change?: number; // Daily profit (amount)
    day_change_rate?: number; // Daily change %
    update_time?: string;
    tags?: string[];
}

export interface PortfolioSummary {
    total_value: number;
    total_cost: number;
    total_profit: number;
    total_profit_rate: number;
    day_change: number;
    day_change_pct: number;
    sparkline_24h?: number[];
    holdings_count: number;
}

export interface PortfolioSnapshot {
    date: string;
    total_value: number;
    total_profit: number;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned_at?: string;
    progress?: number;
}

// ============================================================
// FUND TYPES
// ============================================================

export interface Fund {
    code: string;
    name: string;
    type?: string;
    nav?: number;
    nav_date?: string;
    day_change?: number;
    tags?: string[];
}

export interface FundSearchResult {
    funds: Fund[];
    total: number;
}

export interface ChartDataPoint {
    time: number;
    value: number;
}

export interface FundChartData {
    fund_code: string;
    fund_name: string;
    period: string;
    nav_data: ChartDataPoint[];
    benchmark_data?: ChartDataPoint[];
    events?: FundEvent[];
    metrics?: FundMetrics;
    indicators?: {
        ma5?: ChartDataPoint[];
        ma10?: ChartDataPoint[];
        ma20?: ChartDataPoint[];
    };
}

export interface FundEvent {
    id: string;
    type: 'dividend' | 'manager_change' | 'split' | 'announcement';
    date: string;
    title: string;
    description?: string;
}

export interface FundMetrics {
    sharpe_ratio?: number;
    max_drawdown?: number;
    volatility?: number;
    alpha?: number;
    beta?: number;
    information_ratio?: number;
}

export interface StockHolding {
    code: string;
    name: string;
    percent: string;
    current_price: number;
    change_percent: number;
    change_percent_str: string;
}

// ============================================================
// DISCOVERY TYPES
// ============================================================

export interface DailyMovers {
    top_gainers: Fund[];
    top_losers: Fund[];
    most_popular: Fund[];
    fund_flows?: Fund[];
}

export interface AIBrief {
    fund_code: string;
    summary: string;
    bullets: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    generated_at: string;
}

export interface Category {
    id: number;
    slug: string;
    name: string;
    description?: string;
    fund_count: number;
    day_change?: number;
    icon?: string;
}

export interface Tag {
    slug: string;
    name: string;
    count: number;
}

// ============================================================
// INVESTMENT PLAN TYPES
// ============================================================

export interface InvestmentPlan {
    id: number;
    fund_code: string;
    fund_name: string;
    amount: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    status: 'active' | 'paused' | 'cancelled';
    created_at: string;
    next_date?: string;
    total_invested?: number;
    total_shares?: number;
    bargain_nav?: number;
}

export interface InvestmentFlowState {
    session_id: string;
    step: number;
    fund_code: string;
    fund_name: string;
    amount?: number;
    frequency?: string;
    estimated_nav?: number;
    estimated_shares?: number;
    fee_rate?: number;
}

export interface InvestmentAlert {
    id: number;
    plan_id: number;
    type: 'bargain' | 'target' | 'rebalance';
    message: string;
    created_at: string;
    is_read: boolean;
}

// ============================================================
// SHADOW TRACKER TYPES
// ============================================================

export interface Blogger {
    id: number;
    platform: string;
    platform_id: string;
    name: string;
    description?: string;
    avatar_url?: string;
    is_active: boolean;
    created_at: string;
    followers_count?: number;
    win_rate?: number;
    alpha?: number;
}

export interface BloggerHolding {
    fund_code: string;
    fund_name: string;
    weight: number;
    confidence: number;
    source_date: string;
}

export interface BloggerPerformance {
    total_return: number;
    alpha: number;
    sharpe_ratio: number;
    win_rate: number;
    max_drawdown: number;
}

export interface BloggerRanking {
    blogger_id: number;
    name: string;
    platform: string;
    total_return: number;
    alpha: number;
    sharpe_ratio: number;
    win_rate: number;
    rank: number;
}

export interface BloggerPortfolio {
    blogger_id: number;
    holdings: BloggerHolding[];
    last_updated?: string;
    total_value?: number;
}

// ============================================================
// YIELD & MANAGER TYPES
// ============================================================

export interface FundYieldPoint {
    date: string;
    fund: number;
    index: number;
    category: number;
}

export interface FundYieldData {
    fund_code: string;
    range_type: string;
    benchmark_name: string;
    points: FundYieldPoint[];
    source: string;
}

export interface FundManager {
    id: string;
    name: string;
    work_time: string;
    fund_size: string;
    term: string;
    return_rate: string;
    image_url: string;
}

export interface FundDetail extends Fund {
    fund_name: string;
    fund_type: string;
    fund_size: string;
    launch_date: string;
    benchmark: string;
    company: string;
    managers: FundManager[];
    source: string;
}

export interface FundDiagnostic {
    fund_code: string;
    score: number;
    summary: string;
    factors: {
        foundation: number;
        manager: number;
        performance: number;
    };
    source: string;
}


// ============================================================
// CHAT & AI TYPES
// ============================================================

export interface Agent {
    name: string;
    key: string;
    paradigm: string;
    description: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    agent_name?: string;
    timestamp: string;
    memory_used?: boolean;
    rag_used?: boolean;
}

export interface ChatResponse {
    response: string;
    agent: string;
    paradigm: string;
    memory_used?: boolean;
    rag_used?: boolean;
}

// ============================================================
// USER & AUTH TYPES
// ============================================================

export interface User {
    user_id: number;
    username: string;
    email?: string;
    risk_level?: string;
    role?: 'user' | 'admin' | 'guest';
    created_at?: string;
    authenticated: boolean;
}

export interface AuthResponse {
    status: 'success' | 'error' | 'created';
    token?: string;
    user?: User;
    message?: string;
    account_status?: string;
    code?: string;
}

export interface UserPreference {
    id: string;
    content: string;
    importance: number;
    metadata?: Record<string, unknown>;
}

// ============================================================
// MEMORY & RAG TYPES
// ============================================================

export interface MemoryStats {
    short_term_count: number;
    long_term_count: number;
    preference_count: number;
    last_consolidated?: string;
}

export interface RAGStats {
    document_count: number;
    chunk_count: number;
    last_indexed?: string;
    status: string;
}

// ============================================================
// SYSTEM TYPES
// ============================================================

export interface HealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        database?: { status: string; message?: string };
        llm?: { status: string; configured: boolean };
        agents?: { status: string; count: number };
    };
}

export interface ServiceInfo {
    name: string;
    version: string;
    framework: string;
    agents: string[];
    paradigms: Record<string, string>;
}
