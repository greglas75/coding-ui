/**
 * AI Model Types
 * Proper typing for AI model configurations
 */

export interface BaseModel {
  id: string;
  name: string;
  available: boolean;
  provider: 'openai' | 'anthropic' | 'google';
  maxTokens?: number;
  costPer1kTokens?: number;
}

export interface OpenAIModel extends BaseModel {
  provider: 'openai';
  isVision?: boolean;
  isO1?: boolean;
}

export interface ClaudeModel extends BaseModel {
  provider: 'anthropic';
  version: string;
}

export interface GeminiModel extends BaseModel {
  provider: 'google';
  isExperimental?: boolean;
}

export type AIModel = OpenAIModel | ClaudeModel | GeminiModel;

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
  maxTokens?: number;
}
