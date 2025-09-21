// Simple diagnostic endpoint for Korn AI debugging
import { NextRequest, NextResponse } from 'next/server';
import { loadEnvironmentVariables, validateKornAIEnvironment } from '@/lib/env-loader';

export async function GET() {
  try {
    // Load environment variables using our loader
    const loadedVars = loadEnvironmentVariables();
    const validation = validateKornAIEnvironment();
    
    return NextResponse.json({
      env: {
        KORN_AI_ENABLED: loadedVars.KORN_AI_ENABLED || 'MISSING',
        CLOUDFLARE_ACCOUNT_ID: loadedVars.CLOUDFLARE_ACCOUNT_ID ? 'SET' : 'MISSING',
        CLOUDFLARE_API_TOKEN: loadedVars.CLOUDFLARE_API_TOKEN ? 'SET' : 'MISSING',
        NODE_ENV: loadedVars.NODE_ENV || process.env.NODE_ENV
      },
      validation: {
        isValid: validation.isValid,
        missing: validation.missing
      },
      loadedCount: Object.keys(loadedVars).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
