// Service to integrate Korn AI with the Twitter application's tweet system

import { useKornAI, useKornMentionDetection } from '@/hooks/useKornAI';
import { KornResponse } from '@/types/ai/cloudflare-types';

// This would need to be adapted to your specific tweet/post data structure
export interface Tweet {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  isReply?: boolean;
  parentTweetId?: string;
  createdAt: Date;
}

export interface PostTweetParams {
  content: string;
  isReply?: boolean;
  parentTweetId?: string;
  // Add other parameters based on your existing tweet posting system
}

export class TweetIntegrationService {
  private kornAI: ReturnType<typeof useKornAI>;
  private mentionDetection: ReturnType<typeof useKornMentionDetection>;

  constructor() {
    // These hooks would need to be called from within a React component
    // This is a conceptual structure showing how to integrate
    this.kornAI = useKornAI({
      onResponse: this.handleKornResponse.bind(this),
      onError: this.handleKornError.bind(this)
    });
    this.mentionDetection = useKornMentionDetection();
  }

  /**
   * Process a newly posted tweet to check for @Korn mentions
   */
  async processNewTweet(tweet: Tweet): Promise<void> {
    try {
      // Check if tweet contains @Korn mention
      if (!this.mentionDetection.shouldTriggerKornResponse(tweet.content, tweet.authorUsername)) {
        return;
      }

      console.log(`🤖 Processing @Korn mention in tweet ${tweet.id} by @${tweet.authorUsername}`);

      // Process the mention with Korn AI
      await this.kornAI.processKornMention({
        tweetId: tweet.id,
        authorId: tweet.authorId,
        authorUsername: tweet.authorUsername,
        content: tweet.content,
        isReply: tweet.isReply || false,
        parentTweetId: tweet.parentTweetId
      });

    } catch (error) {
      console.error('Error processing new tweet for Korn mentions:', error);
    }
  }

  /**
   * Handle successful Korn AI response by posting it as a reply
   */
  private async handleKornResponse(response: KornResponse): Promise<void> {
    try {
      if (!response.success || !response.responseContent.trim()) {
        console.warn('Received empty or failed Korn response, skipping post');
        return;
      }

      console.log(`🤖 Posting Korn AI response for tweet ${response.originalTweetId}`);

      // Post the AI response as a reply
      await this.postKornReply({
        content: response.responseContent,
        isReply: true,
        parentTweetId: response.originalTweetId
      });

      console.log(`✅ Korn AI response posted successfully: ${response.id}`);

    } catch (error) {
      console.error('Error posting Korn AI response:', error);
    }
  }

  /**
   * Handle Korn AI errors
   */
  private handleKornError(error: string): void {
    console.error('Korn AI processing error:', error);
    // Optionally implement user notifications or logging here
  }

  /**
   * Post a Korn AI response as a tweet/reply
   * This method needs to be adapted to your existing tweet posting system
   */
  private async postKornReply(params: PostTweetParams): Promise<void> {
    try {
      // TODO: Replace this with your actual tweet posting logic
      // Example integration points:
      
      // Option 1: Direct API call to your tweet posting endpoint
      const response = await fetch('/api/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers as needed
        },
        body: JSON.stringify({
          ...params,
          // Mark this as an AI-generated tweet if needed
          isAIGenerated: true,
          aiSource: 'korn'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to post Korn reply: ${response.status}`);
      }

      // Option 2: Use your existing tweet service/hook
      // const tweetService = useTweetService();
      // await tweetService.postTweet(params);

      // Option 3: Dispatch to a state management system
      // dispatch(postTweet(params));

    } catch (error) {
      console.error('Error posting Korn reply:', error);
      throw error;
    }
  }

  /**
   * Get current processing status
   */
  getStatus() {
    return {
      isProcessing: this.kornAI.isProcessing,
      error: this.kornAI.error,
      lastResponse: this.kornAI.lastResponse
    };
  }

  /**
   * Clear any existing errors
   */
  clearErrors() {
    this.kornAI.clearError();
  }
}

// React Hook version for use in components
export const useTweetIntegration = () => {
  const kornAI = useKornAI({
    onResponse: async (response: KornResponse) => {
      // Handle posting the response
      if (response.success && response.responseContent.trim()) {
        try {
          await fetch('/api/tweets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: response.responseContent,
              isReply: true,
              parentTweetId: response.originalTweetId,
              isAIGenerated: true,
              aiSource: 'korn'
            })
          });
        } catch (error) {
          console.error('Failed to post Korn response:', error);
        }
      }
    },
    onError: (error: string) => {
      console.error('Korn AI error:', error);
    }
  });

  const mentionDetection = useKornMentionDetection();

  const processNewTweet = async (tweet: Tweet) => {
    if (mentionDetection.shouldTriggerKornResponse(tweet.content, tweet.authorUsername)) {
      await kornAI.processKornMention({
        tweetId: tweet.id,
        authorId: tweet.authorId,
        authorUsername: tweet.authorUsername,
        content: tweet.content,
        isReply: tweet.isReply || false,
        parentTweetId: tweet.parentTweetId
      });
    }
  };

  return {
    processNewTweet,
    detectMention: mentionDetection.detectMention,
    shouldTriggerResponse: mentionDetection.shouldTriggerKornResponse,
    isProcessing: kornAI.isProcessing,
    error: kornAI.error,
    clearError: kornAI.clearError
  };
};
