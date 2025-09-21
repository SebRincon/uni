// Simple diagnostic endpoint for Korn AI debugging
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      env: {
        KORN_AI_ENABLED: process.env.KORN_AI_ENABLED || 'MISSING',
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING',
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? 'SET' : 'MISSING',
        NODE_ENV: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}