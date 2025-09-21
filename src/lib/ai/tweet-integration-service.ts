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

/**
 * Helper function to post a Korn AI response as a tweet/reply
 * This function needs to be adapted to your existing tweet posting system
 */
export const postKornReply = async (params: PostTweetParams): Promise<void> => {
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
};

/**
 * Handle successful Korn AI response by posting it as a reply
 */
const handleKornResponse = async (response: KornResponse): Promise<void> => {
  try {
    if (!response.success || !response.responseContent.trim()) {
      console.warn('Received empty or failed Korn response, skipping post');
      return;
    }

    console.log(`🤖 Posting Korn AI response for tweet ${response.originalTweetId}`);

    // Post the AI response as a reply
    await postKornReply({
      content: response.responseContent,
      isReply: true,
      parentTweetId: response.originalTweetId
    });

    console.log(`✅ Korn AI response posted successfully: ${response.id}`);

  } catch (error) {
    console.error('Error posting Korn AI response:', error);
  }
};

/**
 * Handle Korn AI errors
 */
const handleKornError = (error: string): void => {
  console.error('Korn AI processing error:', error);
  // Optionally implement user notifications or logging here
};

// React Hook version for use in components
export const useTweetIntegration = () => {
  const kornAI = useKornAI({
    onResponse: handleKornResponse,
    onError: handleKornError
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
