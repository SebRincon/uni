// Types for Cloudflare Workers AI integration (@Korn feature)

export interface CloudflareAIConfig {
  accountId: string;
  apiToken: string;
  model: string;
  baseUrl?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  result: {
    response: string;
  };
  success: boolean;
  errors?: string[];
  messages?: string[];
}

export interface KornMentionContext {
  tweetId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  isReply: boolean;
  parentTweetId?: string;
  mentionPosition: number;
  timestamp: Date;
}

export interface KornResponse {
  id: string;
  originalTweetId: string;
  responseContent: string;
  generatedAt: Date;
  model: string;
  success: boolean;
  error?: string;
}

export interface AIServiceConfig {
  enabled: boolean;
  maxResponseLength: number;
  rateLimitPerMinute: number;
  temperature?: number;
  systemPrompt: string;
}