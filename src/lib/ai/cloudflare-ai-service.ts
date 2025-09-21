// Cloudflare Workers AI service for @Korn AI assistant

import { 
  CloudflareAIConfig, 
  AIMessage, 
  AIResponse, 
  AIServiceConfig 
} from '@/types/ai/cloudflare-types';

export class CloudflareAIService {
  private config: CloudflareAIConfig;
  private serviceConfig: AIServiceConfig;
  private requestCount: Map<string, number> = new Map();
  private lastReset: Date = new Date();

  constructor(config: CloudflareAIConfig, serviceConfig: AIServiceConfig) {
    this.config = config;
    this.serviceConfig = serviceConfig;
  }

  /**
   * Generate AI response using Cloudflare Workers AI
   */
  async generateResponse(messages: AIMessage[]): Promise<string> {
    if (!this.serviceConfig.enabled) {
      throw new Error('AI service is currently disabled');
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    try {
      const response = await this.callCloudflareAI(messages);
      this.incrementRequestCount();
      
      if (!response.success) {
        throw new Error(`AI API error: ${response.errors?.join(', ') || 'Unknown error'}`);
      }

      return this.truncateResponse(response.result.response);
    } catch (error) {
      console.error('Cloudflare AI service error:', error);
      throw error;
    }
  }

  /**
   * Make API call to Cloudflare Workers AI
   */
  private async callCloudflareAI(messages: AIMessage[]): Promise<AIResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.cloudflare.com/client/v4';
    const endpoint = `${baseUrl}/accounts/${this.config.accountId}/ai/run/${this.config.model}`;

    const requestBody = {
      messages: [
        {
          role: 'system',
          content: this.serviceConfig.systemPrompt
        },
        ...messages
      ],
      temperature: this.serviceConfig.temperature || 0.7,
      max_tokens: Math.min(this.serviceConfig.maxResponseLength, 500)
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Check if request is within rate limits
   */
  private checkRateLimit(): boolean {
    const now = new Date();
    const timeSinceReset = now.getTime() - this.lastReset.getTime();
    
    // Reset counter every minute
    if (timeSinceReset >= 60000) {
      this.requestCount.clear();
      this.lastReset = now;
    }

    const currentCount = this.requestCount.get('global') || 0;
    return currentCount < this.serviceConfig.rateLimitPerMinute;
  }

  /**
   * Increment request counter
   */
  private incrementRequestCount(): void {
    const currentCount = this.requestCount.get('global') || 0;
    this.requestCount.set('global', currentCount + 1);
  }

  /**
   * Truncate response to maximum length
   */
  private truncateResponse(response: string): string {
    if (response.length <= this.serviceConfig.maxResponseLength) {
      return response;
    }

    const truncated = response.substring(0, this.serviceConfig.maxResponseLength - 3);
    return truncated + '...';
  }

  /**
   * Test connection to Cloudflare Workers AI
   */
  async testConnection(): Promise<boolean> {
    try {
      const testMessages: AIMessage[] = [
        { role: 'user', content: 'Hello, can you respond with just "OK"?' }
      ];
      
      const response = await this.callCloudflareAI(testMessages);
      return response.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AIServiceConfig {
    return { ...this.serviceConfig };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.serviceConfig = { ...this.serviceConfig, ...newConfig };
  }
}