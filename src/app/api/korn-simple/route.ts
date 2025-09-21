// Simple hardcoded Korn AI endpoint - guaranteed to work
import { NextRequest, NextResponse } from 'next/server';

// Hardcoded configuration for production reliability
const KORN_CONFIG = {
  enabled: true,
  accountId: '2c004c2cda75ac83100f6c2fe0b389d6',
  apiToken: 'RSZ5uhRYz3GNt7i0DIP_spB0Bxo9JWZOc37msqeW',
  model: '@cf/meta/llama-2-7b-chat-int8'
};

const SYSTEM_PROMPT = `You are Korn, an AI assistant integrated into a Twitter-like social media platform. 

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

Remember: You're responding to public tweets, so be mindful of the public nature of your responses.`;

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 Simple Korn AI endpoint called');
    
    const body = await request.json();
    const { content, authorUsername } = body;
    
    if (!content) {
      return NextResponse.json(
        { error: 'Missing content' },
        { status: 400 }
      );
    }

    // Simple @Korn detection
    if (!content.toLowerCase().includes('@korn')) {
      return NextResponse.json(
        { error: 'No @Korn mention found' },
        { status: 400 }
      );
    }

    console.log('🤖 Processing @Korn mention from:', authorUsername);
    console.log('🤖 Content:', content);

    // Call Cloudflare AI
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${KORN_CONFIG.accountId}/ai/run/${KORN_CONFIG.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KORN_CONFIG.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: content }
          ],
          temperature: 0.7,
          max_tokens: 100
        }),
      }
    );

    if (!response.ok) {
      console.error('❌ Cloudflare API error:', response.status, response.statusText);
      return NextResponse.json(
        { 
          success: false,
          error: 'AI service unavailable',
          responseContent: "Hey there! 👋 I'm having some technical difficulties right now, but I'm working on getting back online soon!"
        },
        { status: 200 }
      );
    }

    const aiResponse = await response.json();
    console.log('✅ AI Response received:', aiResponse.success);

    if (aiResponse.success && aiResponse.result && aiResponse.result.response) {
      let responseContent = aiResponse.result.response.trim();
      
      // Ensure response is under 280 characters
      if (responseContent.length > 277) {
        responseContent = responseContent.substring(0, 274) + '...';
      }

      return NextResponse.json({
        success: true,
        responseContent,
        model: KORN_CONFIG.model
      });
    } else {
      // Fallback response
      return NextResponse.json({
        success: false,
        responseContent: "Hey! 👋 Thanks for mentioning me! I'm here to help with any questions you have.",
        fallback: true
      });
    }

  } catch (error) {
    console.error('❌ Simple Korn AI error:', error);
    
    return NextResponse.json({
      success: false,
      responseContent: "Hi there! 🤖 I'm experiencing some technical issues right now, but I'll be back soon!",
      fallback: true
    }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'Simple Korn AI endpoint is working!',
    timestamp: new Date().toISOString()
  });
}