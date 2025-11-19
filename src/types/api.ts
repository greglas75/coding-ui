/**
 * API Response Types
 * Type-safe definitions for all API endpoints
 */

import type { Answer, Category, Code, AiSuggestions } from '../types';

// ═══════════════════════════════════════════════════════════
// Generic API Response
// ═══════════════════════════════════════════════════════════

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════════════════
// Answer Endpoints
// ═══════════════════════════════════════════════════════════

export interface AnswerFilterRequest {
  search?: string;
  types?: string[];
  status?: string;
  codes?: string[];
  language?: string;
  country?: string;
  categoryId?: number;
}

export type AnswerFilterResponse = ApiResponse<Answer[]>;

export interface AnswerUpdateRequest {
  id: number;
  selected_code?: string;
  general_status?: string;
  ai_suggestions?: AiSuggestions;
}

export type AnswerUpdateResponse = ApiResponse<Answer>;

// ═══════════════════════════════════════════════════════════
// Category Endpoints
// ═══════════════════════════════════════════════════════════

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  google_name?: string;
  llm_preset?: string;
  openai_model?: string;
  claude_model?: string;
  gemini_model?: string;
}

export type CategoryCreateResponse = ApiResponse<Category>;

export type CategoryListResponse = ApiResponse<Category[]>;

// ═══════════════════════════════════════════════════════════
// Code Endpoints
// ═══════════════════════════════════════════════════════════

export interface CodeCreateRequest {
  name: string;
  is_whitelisted: boolean;
  category_ids?: number[];
}

export type CodeCreateResponse = ApiResponse<Code>;
export type CodeListResponse = ApiResponse<Code[]>;

// ═══════════════════════════════════════════════════════════
// File Upload
// ═══════════════════════════════════════════════════════════

export interface FileUploadResponse extends ApiResponse {
  imported: number;
  skipped: number;
  errors: string[];
  totalErrors: number;
  timeMs: number;
}

// ═══════════════════════════════════════════════════════════
// AI Endpoints
// ═══════════════════════════════════════════════════════════

export interface AIProxyRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  apiKey: string;
}

export interface AIProxyResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ═══════════════════════════════════════════════════════════
// Codeframe Generation
// ═══════════════════════════════════════════════════════════

export interface CodeframeGenerateRequest {
  categoryId: number;
  answerIds?: number[];
  config: {
    coding_type: 'open-ended' | 'brand' | 'custom';
    anthropic_api_key: string;
    google_api_key?: string;
    google_cse_cx_id?: string;
    pinecone_api_key?: string;
    model?: string;
    min_cluster_size?: number;
    min_samples?: number;
  };
  userId: string;
}

export interface CodeframeGenerateResponse extends ApiResponse {
  generation_id: number;
  status: 'processing' | 'completed' | 'failed';
  n_clusters: number;
  n_answers: number;
  estimated_time_seconds: number;
  poll_url: string;
}

export interface CodeframeStatusResponse extends ApiResponse {
  id: number;
  status: 'processing' | 'completed' | 'failed';
  n_clusters: number;
  n_answers: number;
  ready: boolean;
  hierarchy?: CodeframeNode[];
  error_message?: string;
}

export interface CodeframeNode {
  id: number;
  code: string;
  label: string;
  description?: string;
  parent_id?: number;
  level: number;
  confidence: number;
  children?: CodeframeNode[];
}

// ═══════════════════════════════════════════════════════════
// Export Types
// ═══════════════════════════════════════════════════════════

export interface ExportConfig {
  format: 'csv' | 'xlsx' | 'json';
  includeFilters: boolean;
  includeMetadata: boolean;
  columns?: string[];
}

export type ExportResponse = ApiResponse<Blob>;

// ═══════════════════════════════════════════════════════════
// Health & Status
// ═══════════════════════════════════════════════════════════

export interface HealthResponse {
  status: 'OK' | 'ERROR';
  timestamp: string;
  supabaseConfigured?: boolean;
  openaiConfigured?: boolean;
}
