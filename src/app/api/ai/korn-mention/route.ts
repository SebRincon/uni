// API route for processing @Korn mentions
import { NextRequest, NextResponse } from 'next/server';
import { getKornAI } from '@/lib/ai/korn-config';
import { KornMentionContext } from '@/types/ai/cloudflare-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { tweetId, authorId, authorUsername, content, isReply, parentTweetId } = body;
    
    if (!tweetId || !authorId || !authorUsername || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: tweetId, authorId, authorUsername, content' },
        { status: 400 }
      );
    }

    // Initialize Korn AI service
    let kornAI;
    try {
      kornAI = getKornAI();
    } catch (initError) {
      console.error('Failed to initialize Korn AI:', initError);
      return NextResponse.json(
        { 
          error: 'Korn AI system not available',
          details: initError instanceof Error ? initError.message : String(initError),
          hint: 'Check environment variables: KORN_AI_ENABLED, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN'
        },
        { status: 503 }
      );
    }

    // Extract mention context
    const mentionContext = kornAI.extractMentionContext(
      tweetId,
      authorId,
      authorUsername,
      content,
      isReply || false,
      parentTweetId
    );

    if (!mentionContext) {
      return NextResponse.json(
        { error: 'No @Korn mention found in content' },
        { status: 400 }
      );
    }

    // Check if already processing
    if (kornAI.isProcessing(tweetId)) {
      return NextResponse.json(
        { error: 'Tweet is already being processed' },
        { status: 429 }
      );
    }

    // Process the mention and generate AI response
    const response = await kornAI.processMention(mentionContext);

    // If AI processing failed, return fallback response
    if (!response.success) {
      const fallbackContent = kornAI.generateFallbackResponse(mentionContext);
      return NextResponse.json({
        success: false,
        response: {
          ...response,
          responseContent: fallbackContent,
          fallback: true
        }
      });
    }

    // Return successful AI response
    return NextResponse.json({
      success: true,
      response
    });

  } catch (error) {
    console.error('Error in korn-mention API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const kornAI = getKornAI();
    const status = {
      initialized: true,
      queueStatus: kornAI.getQueueStatus(),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get Korn AI status',
        initialized: false,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}