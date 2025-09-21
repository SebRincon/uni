// Configuration and initialization for Korn AI system

import { CloudflareAIConfig, AIServiceConfig } from '@/types/ai/cloudflare-types';
import { CloudflareAIService } from './cloudflare-ai-service';
import { KornMentionService } from './korn-mention-service';

// Default configuration for Korn AI
export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  enabled: process.env.KORN_AI_ENABLED === 'true',
  maxResponseLength: 280, // Twitter character limit
  rateLimitPerMinute: 10, // Conservative rate limiting
  temperature: 0.7,
  systemPrompt: `You are Korn, an AI assistant integrated into a Twitter-like social media platform. 
  
Your personality:
- Friendly, helpful, and engaging
- Conversational and social media savvy
- Concise responses (under 280 characters)
- Use emojis appropriately
- Be respectful and inclusive

Guidelines:
- Keep responses brief and Twitter-appropriate
- Don't repeat the user's mention of @Korn in your response
- Be conversational, not overly formal
- If asked about topics outside your scope, politely redirect
- Never share personal information or harmful content

Remember: You're responding to public tweets, so be mindful of the public nature of your responses.`
};

// Cloudflare configuration from environment variables
export const getCloudflareConfig = (): CloudflareAIConfig => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-2-7b-chat-int8';

  if (!accountId || !apiToken) {
    throw new Error(
      'Missing required Cloudflare configuration. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.'
    );
  }

  return {
    accountId,
    apiToken,
    model,
    baseUrl: 'https://api.cloudflare.com/client/v4'
  };
};

// Initialize the Korn AI system
let kornAIInstance: KornMentionService | null = null;

export const initializeKornAI = (): KornMentionService => {
  if (kornAIInstance) {
    return kornAIInstance;
  }

  try {
    const cloudflareConfig = getCloudflareConfig();
    const aiService = new CloudflareAIService(cloudflareConfig, DEFAULT_AI_CONFIG);
    kornAIInstance = new KornMentionService(aiService);
    
    console.log('✅ Korn AI system initialized successfully');
    return kornAIInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Korn AI system:', error);
    throw error;
  }
};

export const getKornAI = (): KornMentionService => {
  if (!kornAIInstance) {
    return initializeKornAI();
  }
  return kornAIInstance;
};

// Test function to verify the setup
export const testKornAISetup = async (): Promise<boolean> => {
  try {
    const kornAI = getKornAI();
    
    // Test mention detection
    const testContent = "Hey @Korn, how are you doing today?";
    const mentionContext = kornAI.extractMentionContext(
      'test-tweet-123',
      'test-user-456',
      'testuser',
      testContent
    );

    if (!mentionContext) {
      console.error('Mention detection failed');
      return false;
    }

    console.log('✅ Korn AI setup test passed');
    return true;
  } catch (error) {
    console.error('❌ Korn AI setup test failed:', error);
    return false;
  }
};

// Configuration update utilities
export const updateKornAIConfig = (newConfig: Partial<AIServiceConfig>): void => {
  if (kornAIInstance) {
    // We need to access the internal AI service to update config
    // This would require refactoring the KornMentionService to expose this method
    console.log('Configuration update requested:', newConfig);
  }
};

export const getKornAIStatus = () => {
  if (!kornAIInstance) {
    return { 
      initialized: false, 
      enabled: false,
      error: 'Not initialized' 
    };
  }

  try {
    return {
      initialized: true,
      enabled: DEFAULT_AI_CONFIG.enabled,
      queueStatus: kornAIInstance.getQueueStatus(),
      config: {
        rateLimitPerMinute: DEFAULT_AI_CONFIG.rateLimitPerMinute,
        maxResponseLength: DEFAULT_AI_CONFIG.maxResponseLength
      }
    };
  } catch (error) {
    return {
      initialized: true,
      enabled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};