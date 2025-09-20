import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const canvasApiUrl = process.env.NEXT_PUBLIC_CANVAS_API_URL;
  const canvasApiKey = process.env.CANVAS_API_KEY;

  if (!canvasApiUrl || !canvasApiKey) {
    return NextResponse.json(
      { error: 'Canvas API URL or Key is not configured.' },
      { status: 500, headers: corsHeaders }
    );
  }

  const path = params.path.join('/');
  const { search } = new URL(request.url);

  // Robustly construct the Canvas API URL to avoid issues with trailing slashes
  const canvasBase = canvasApiUrl.replace(/\/$/, '');
  const url = `${canvasBase}/api/v1/${path}${search}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${canvasApiKey}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Canvas API Error (Status: ${response.status}) from ${url}:`, errorBody);
      return NextResponse.json(
        {
          error: `Canvas API request failed: ${response.statusText}`,
          details: errorBody,
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Proxy Fetch Error for URL ${url}:`, errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch from Canvas API via proxy.', details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}