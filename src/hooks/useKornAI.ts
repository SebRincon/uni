// React hook for Korn AI functionality
import { useState, useCallback } from 'react';
import { KornResponse } from '@/types/ai/cloudflare-types';

interface UseKornAIOptions {
  onResponse?: (response: KornResponse) => void;
  onError?: (error: string) => void;
}

interface UseKornAIReturn {
  processKornMention: (params: ProcessMentionParams) => Promise<KornResponse | null>;
  isProcessing: boolean;
  error: string | null;
  lastResponse: KornResponse | null;
  clearError: () => void;
}

interface ProcessMentionParams {
  tweetId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  isReply?: boolean;
  parentTweetId?: string;
}

export const useKornAI = (options: UseKornAIOptions = {}): UseKornAIReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<KornResponse | null>(null);

  const processKornMention = useCallback(async (params: ProcessMentionParams): Promise<KornResponse | null> => {
    if (isProcessing) {
      setError('Already processing a request');
      return null;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/korn-mention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        // Handle API-level failures with fallback responses
        const fallbackResponse = data.response as KornResponse;
        setLastResponse(fallbackResponse);
        options.onResponse?.(fallbackResponse);
        return fallbackResponse;
      }

      const kornResponse = data.response as KornResponse;
      setLastResponse(kornResponse);
      options.onResponse?.(kornResponse);
      return kornResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processKornMention,
    isProcessing,
    error,
    lastResponse,
    clearError,
  };
};

// Hook for checking Korn AI status
export const useKornAIStatus = () => {
  const [status, setStatus] = useState<{
    initialized: boolean;
    queueCount: number;
    lastChecked: Date | null;
    error?: string;
  }>({
    initialized: false,
    queueCount: 0,
    lastChecked: null,
  });

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/korn-mention');
      const data = await response.json();

      if (response.ok) {
        setStatus({
          initialized: data.initialized,
          queueCount: data.queueStatus?.count || 0,
          lastChecked: new Date(),
        });
      } else {
        setStatus(prev => ({
          ...prev,
          error: data.error || 'Failed to check status',
          lastChecked: new Date(),
        }));
      }
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Network error',
        lastChecked: new Date(),
      }));
    }
  }, []);

  return {
    status,
    checkStatus,
  };
};

// Utility hook for detecting @Korn mentions in content
export const useKornMentionDetection = () => {
  const detectMention = useCallback((content: string): boolean => {
    const kornPattern = /@Korn\b/gi;
    return kornPattern.test(content);
  }, []);

  const shouldTriggerKornResponse = useCallback((content: string, authorUsername: string): boolean => {
    // Don't respond to our own mentions (if Korn has a username)
    if (authorUsername.toLowerCase() === 'korn') {
      return false;
    }

    return detectMention(content);
  }, [detectMention]);

  return {
    detectMention,
    shouldTriggerKornResponse,
  };
};