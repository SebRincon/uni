import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const roomName = request.nextUrl.searchParams.get('roomName');
    const participantName = request.nextUrl.searchParams.get('participantName');

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'Missing roomName or participantName' },
        { status: 400 }
      );
    }

    const apiKey = 'APIi9NCDD8TA2Mi';
    const apiSecret = 'P7iDglLd8zMVAVIuMW7BYxaN4eQFqx8xiGQxefET1aKA';
    const wsUrl = 'wss://astoic-z2c3ve4i.livekit.cloud';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      // Token expires after 24 hours
      ttl: '24h',
    });

    at.addGrant({ roomJoin: true, room: roomName });

    return NextResponse.json({
      serverUrl: wsUrl,
      participantToken: await at.toJwt(),
      participantName: participantName,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}