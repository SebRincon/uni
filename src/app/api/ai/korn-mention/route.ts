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
    // Step-by-step debugging
    console.log('🔍 GET /api/ai/korn-mention - Starting diagnostic');
    
    // Check environment variables first
    const envCheck = {
      KORN_AI_ENABLED: process.env.KORN_AI_ENABLED || 'MISSING',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING',
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV
    };
    console.log('🔧 Environment variables:', envCheck);

    // Try to initialize Korn AI
    console.log('🚀 Attempting to initialize Korn AI...');
    const kornAI = getKornAI();
    console.log('✅ Korn AI initialized successfully');
    
    const status = {
      initialized: true,
      environment: envCheck,
      queueStatus: kornAI.getQueueStatus(),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('❌ Korn AI initialization failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to get Korn AI status',
        initialized: false,
        details: error instanceof Error ? error.message : String(error),
        environment: {
          KORN_AI_ENABLED: process.env.KORN_AI_ENABLED || 'MISSING',
          CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING',
          CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? 'SET' : 'MISSING',
          NODE_ENV: process.env.NODE_ENV
        }
      },
      { status: 500 }
    );
  }
}
