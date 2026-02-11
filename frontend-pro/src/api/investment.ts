/**
 * Fund Assistant Pro - Investment API
 * 
 * API functions for investment plans (DCA), micro-flows, and alerts.
 */

import { apiClient } from './client';
import type { InvestmentPlan, InvestmentFlowState, InvestmentAlert } from '../types';

// ============================================================
// MICRO FLOW (3-step investment creation)
// ============================================================

/**
 * Start investment flow - Step 1: Validate fund
 */
export const startFlow = async (
    fundCode: string
): Promise<InvestmentFlowState> => {
    const { data } = await apiClient.post('/investment/flow/start', null, {
        params: { fund_code: fundCode },
    });
    return data;
};

/**
 * Calculate investment - Step 2: Estimate shares
 */
export const calculateFlow = async (
    sessionId: string,
    amount: number,
    frequency: string = 'monthly'
): Promise<InvestmentFlowState> => {
    const { data } = await apiClient.post('/investment/flow/calculate', {
        session_id: sessionId,
        amount,
        frequency,
    });
    return data;
};

/**
 * Confirm investment - Step 3: Create plan
 */
export const confirmFlow = async (
    sessionId: string
): Promise<{
    step: number;
    plan_id: number;
    status: string;
    plan: InvestmentPlan;
    message: string;
}> => {
    const { data } = await apiClient.post('/investment/flow/confirm', {
        session_id: sessionId,
    });
    return data;
};

// ============================================================
// PLAN MANAGEMENT
// ============================================================

/**
 * Get user's investment plans
 */
export const getPlans = async (): Promise<{ plans: InvestmentPlan[] }> => {
    const { data } = await apiClient.get('/investment/plans');
    return data;
};

/**
 * Pause a plan
 */
export const pausePlan = async (
    planId: number
): Promise<{ status: string; plan_id: number }> => {
    const { data } = await apiClient.post(`/investment/plans/${planId}/pause`);
    return data;
};

/**
 * Resume a plan
 */
export const resumePlan = async (
    planId: number
): Promise<{ status: string; plan_id: number }> => {
    const { data } = await apiClient.post(`/investment/plans/${planId}/resume`);
    return data;
};

/**
 * Cancel a plan
 */
export const cancelPlan = async (
    planId: number
): Promise<{ status: string; plan_id: number }> => {
    const { data } = await apiClient.post(`/investment/plans/${planId}/cancel`);
    return data;
};

// ============================================================
// ALERTS
// ============================================================

/**
 * Get alerts
 */
export const getAlerts = async (
    unreadOnly: boolean = false
): Promise<{ alerts: InvestmentAlert[] }> => {
    const { data } = await apiClient.get('/investment/alerts', {
        params: { unread_only: unreadOnly },
    });
    return data;
};

/**
 * Set bargain alert
 */
export const setBargainAlert = async (
    planId: number,
    bargainNav: number
): Promise<{
    status: string;
    plan_id: number;
    bargain_nav: number;
    message: string;
}> => {
    const { data } = await apiClient.post(
        `/investment/plans/${planId}/bargain-alert`,
        null,
        { params: { bargain_nav: bargainNav } }
    );
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const investmentApi = {
    flow: {
        start: startFlow,
        calculate: calculateFlow,
        confirm: confirmFlow,
    },
    plans: {
        get: getPlans,
        pause: pausePlan,
        resume: resumePlan,
        cancel: cancelPlan,
    },
    alerts: {
        get: getAlerts,
        setBargain: setBargainAlert,
    },
};

export default investmentApi;
