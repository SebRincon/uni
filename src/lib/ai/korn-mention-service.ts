// Service for detecting and processing @Korn mentions

import { 
  KornMentionContext, 
  KornResponse, 
  AIMessage 
} from '@/types/ai/cloudflare-types';
import { CloudflareAIService } from './cloudflare-ai-service';

export class KornMentionService {
  private aiService: CloudflareAIService;
  private processingQueue: Set<string> = new Set();

  constructor(aiService: CloudflareAIService) {
    this.aiService = aiService;
  }

  /**
   * Detect if a tweet contains @Korn mention
   */
  detectKornMention(content: string): { mentioned: boolean; position: number } {
    const kornPattern = /@Korn\b/gi;
    const match = kornPattern.exec(content);
    
    return {
      mentioned: match !== null,
      position: match ? match.index : -1
    };
  }

  /**
   * Extract mention context from tweet content
   */
  extractMentionContext(
    tweetId: string,
    authorId: string,
    authorUsername: string,
    content: string,
    isReply: boolean = false,
    parentTweetId?: string
  ): KornMentionContext | null {
    const mentionDetection = this.detectKornMention(content);
    
    if (!mentionDetection.mentioned) {
      return null;
    }

    return {
      tweetId,
      authorId,
      authorUsername,
      content,
      isReply,
      parentTweetId,
      mentionPosition: mentionDetection.position,
      timestamp: new Date()
    };
  }

  /**
   * Process @Korn mention and generate AI response
   */
  async processMention(context: KornMentionContext): Promise<KornResponse> {
    // Prevent duplicate processing
    if (this.processingQueue.has(context.tweetId)) {
      throw new Error('Tweet is already being processed');
    }

    this.processingQueue.add(context.tweetId);

    try {
      // Prepare the conversation context
      const messages = this.buildConversationMessages(context);
      
      // Generate AI response
      const aiResponse = await this.aiService.generateResponse(messages);
      
      // Create response object
      const response: KornResponse = {
        id: `korn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        originalTweetId: context.tweetId,
        responseContent: aiResponse,
        generatedAt: new Date(),
        model: 'cloudflare-workers-ai',
        success: true
      };

      return response;
    } catch (error) {
      console.error('Error processing Korn mention:', error);
      
      return {
        id: `korn_error_${Date.now()}`,
        originalTweetId: context.tweetId,
        responseContent: '',
        generatedAt: new Date(),
        model: 'cloudflare-workers-ai',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      this.processingQueue.delete(context.tweetId);
    }
  }

  /**
   * Build conversation messages for AI processing
   */
  private buildConversationMessages(context: KornMentionContext): AIMessage[] {
    const messages: AIMessage[] = [];

    // Add context about the user and their tweet
    const userContext = `User @${context.authorUsername} ${context.isReply ? 'replied' : 'tweeted'}:`;
    const cleanContent = this.cleanTweetContent(context.content);
    
    messages.push({
      role: 'user',
      content: `${userContext} "${cleanContent}"`
    });

    return messages;
  }

  /**
   * Clean tweet content for AI processing
   */
  private cleanTweetContent(content: string): string {
    // Remove @Korn mention from content
    let cleaned = content.replace(/@Korn\b/gi, '').trim();
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // If content is empty after cleaning, provide default
    if (!cleaned) {
      cleaned = 'Hello!';
    }

    return cleaned;
  }

  /**
   * Generate fallback response when AI service fails
   */
  generateFallbackResponse(context: KornMentionContext): string {
    const fallbackResponses = [
      `Hi @${context.authorUsername}! I'm currently experiencing some technical difficulties. Please try mentioning me again in a few minutes.`,
      `Hey @${context.authorUsername}! I'm having trouble processing your request right now. Let me try again later!`,
      `Hello @${context.authorUsername}! My AI systems are temporarily unavailable. Please bear with me while I get back online.`,
    ];

    const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
    return fallbackResponses[randomIndex];
  }

  /**
   * Check if tweet is already being processed
   */
  isProcessing(tweetId: string): boolean {
    return this.processingQueue.has(tweetId);
  }

  /**
   * Get processing queue status
   */
  getQueueStatus(): { processing: string[], count: number } {
    return {
      processing: Array.from(this.processingQueue),
      count: this.processingQueue.size
    };
  }

  /**
   * Clear processing queue (emergency use)
   */
  clearQueue(): void {
    this.processingQueue.clear();
  }
}
