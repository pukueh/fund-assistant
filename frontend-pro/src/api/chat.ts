/**
 * Fund Assistant Pro - Chat & AI API
 * 
 * API functions for AI chat, agents, and knowledge services.
 */

import { apiClient } from './client';
import type { Agent, ChatMessage, ChatResponse } from '../types';

// ============================================================
// CHAT
// ============================================================

/**
 * Send a chat message
 */
export const sendMessage = async (
    message: string,
    agent: string = 'strategist',
    sessionId?: string
): Promise<ChatResponse> => {
    const { data } = await apiClient.post('/chat', {
        message,
        agent,
        session_id: sessionId,
    });
    return data;
};

/**
 * Send a streaming chat message (SSE)
 */
export const sendMessageStream = async (
    message: string,
    agent: string = 'strategist',
    onChunk: (chunk: string) => void,
    sessionId?: string,
    onDone?: (info: { memory_used: boolean; rag_used: boolean }) => void,
    onError?: (error: string) => void
): Promise<void> => {
    const token = localStorage.getItem('fund_assistant_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            message,
            agent,
            session_id: sessionId,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'chunk') {
                        onChunk(data.content);
                    } else if (data.type === 'done') {
                        onDone?.({ memory_used: data.memory_used, rag_used: data.rag_used });
                    } else if (data.type === 'error') {
                        onError?.(data.message);
                    }
                } catch (e) {
                    console.error('Failed to parse SSE data:', e);
                }
            }
        }
    }
};

/**
 * Get chat history
 */
export const getHistory = async (
    sessionId?: string,
    limit: number = 50
): Promise<{ history: ChatMessage[]; count: number }> => {
    const { data } = await apiClient.get('/chat/history', {
        params: { session_id: sessionId, limit },
    });
    return data;
};

/**
 * Clear chat history
 */
export const clearHistory = async (
    sessionId?: string
): Promise<{ status: string }> => {
    const { data } = await apiClient.get('/chat/history', {
        params: { session_id: sessionId },
    });
    return data;
};

// ============================================================
// AGENTS
// ============================================================

/**
 * List all available agents
 */
export const listAgents = async (): Promise<{ agents: Agent[] }> => {
    const { data } = await apiClient.get('/agents');
    return data;
};

// ============================================================
// MEMORY SERVICE
// ============================================================

/**
 * Get memory stats
 */
export const getMemoryStats = async (): Promise<{
    short_term_count: number;
    long_term_count: number;
    preference_count: number;
}> => {
    const { data } = await apiClient.get('/memory/stats');
    return data;
};

/**
 * Get user preferences
 */
export const getPreferences = async (): Promise<{
    preferences: Array<{
        id: string;
        content: string;
        importance: number;
        metadata?: Record<string, unknown>;
    }>;
}> => {
    const { data } = await apiClient.get('/memory/preferences');
    return data;
};

/**
 * Add a user preference
 */
export const addPreference = async (
    preference: string,
    preferenceType: string = 'general',
    importance: number = 0.9
): Promise<{ status: string; memory_id: string }> => {
    const { data } = await apiClient.post('/memory/preferences', {
        preference,
        preference_type: preferenceType,
        importance,
    });
    return data;
};

/**
 * Consolidate memories
 */
export const consolidateMemories = async (): Promise<{
    status: string;
    consolidated_count: number;
}> => {
    const { data } = await apiClient.post('/memory/consolidate');
    return data;
};

/**
 * Clear session memory
 */
export const clearSessionMemory = async (): Promise<{ status: string }> => {
    const { data } = await apiClient.delete('/memory/session');
    return data;
};

// ============================================================
// RAG SERVICE
// ============================================================

/**
 * Get RAG stats
 */
export const getRAGStats = async (): Promise<{
    stats: {
        document_count: number;
        chunk_count: number;
        status: string;
    };
}> => {
    const { data } = await apiClient.get('/rag/stats');
    return data;
};

/**
 * Search knowledge base
 */
export const searchKnowledge = async (
    query: string,
    limit: number = 5
): Promise<{ result: string }> => {
    const { data } = await apiClient.get('/rag/search', {
        params: { query, limit },
    });
    return data;
};

/**
 * Ask RAG question
 */
export const askRAG = async (
    question: string,
    limit: number = 5
): Promise<{ answer: string }> => {
    const { data } = await apiClient.get('/rag/ask', {
        params: { question, limit },
    });
    return data;
};

// ============================================================
// EXPORTS
// ============================================================

export const chatApi = {
    sendMessage,
    sendMessageStream,
    getHistory,
    clearHistory,
    listAgents,
    memory: {
        getStats: getMemoryStats,
        getPreferences,
        addPreference,
        consolidate: consolidateMemories,
        clearSession: clearSessionMemory,
    },
    rag: {
        getStats: getRAGStats,
        search: searchKnowledge,
        ask: askRAG,
    },
};

export default chatApi;
