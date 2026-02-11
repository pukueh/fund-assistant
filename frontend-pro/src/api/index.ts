/**
 * Fund Assistant Pro - API Index
 * 
 * Central export for all API modules.
 */

export { apiClient, setAuthToken, clearAuthToken, isAuthenticated } from './client';
export { marketApi } from './market';
export { portfolioApi } from './portfolio';
export { chatApi } from './chat';
export { discoveryApi } from './discovery';
export { chartApi } from './chart';
export { investmentApi } from './investment';
export { shadowApi } from './shadow';
export { authApi } from './auth';
export { fundApi } from './fund';

// Type re-exports
export type * from '../types';
