import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient<Schema>();

export async function POST(request: NextRequest) {
  try {
    const session = await fetchAuthSession();
    if (!session?.tokens?.idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, conversationId, callId } = body;

    switch (action) {
      case 'initiate':
        return await initiateCall(body, session);
      case 'accept':
        return await acceptCall(body, session);
      case 'decline':
        return await declineCall(body, session);
      case 'end':
        return await endCall(body, session);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Video call API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function initiateCall(body: any, session: any) {
  const { conversationId, type = 'video' } = body;
  const userId = session.userSub;

  try {
    // Create a new video call record
    const { data: videoCall } = await client.models.VideoCall.create({
      conversationId,
      initiatorId: userId,
      type,
      status: 'initiating',
    });

    if (!videoCall) {
      throw new Error('Failed to create video call');
    }

    // Get conversation members
    const { data: conversationMembers } = await client.models.ConversationMember.list({
      filter: { conversationId: { eq: conversationId } },
    });

    // Create call participants for all members
    const participantPromises = conversationMembers.map(member => 
      client.models.CallParticipant.create({
        callId: videoCall.id,
        userId: member.userId,
        status: member.userId === userId ? 'connected' : 'invited',
      })
    );

    await Promise.all(participantPromises);

    // Create call notifications for other members
    const notificationPromises = conversationMembers
      .filter(member => member.userId !== userId)
      .map(member => 
        client.models.CallNotification.create({
          userId: member.userId,
          callId: videoCall.id,
          type: 'incoming_call',
        })
      );

    await Promise.all(notificationPromises);

    // Use conversation ID as the room name for LiveKit
    const roomName = `conversation-${conversationId}`;

    // Update call with meeting details
    await client.models.VideoCall.update({
      id: videoCall.id,
      meetingId: roomName,
      status: 'ringing',
      startTime: new Date().toISOString(),
    });

    return NextResponse.json({
      callId: videoCall.id,
      roomName,
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    throw error;
  }
}

async function acceptCall(body: any, session: any) {
  const { callId } = body;
  const userId = session.userSub;

  try {
    // Get call details
    const { data: videoCall } = await client.models.VideoCall.get({ id: callId });
    if (!videoCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Update participant status
    const { data: participants } = await client.models.CallParticipant.list({
      filter: {
        and: [
          { callId: { eq: callId } },
          { userId: { eq: userId } },
        ],
      },
    });

    if (participants.length > 0) {
      await client.models.CallParticipant.update({
        id: participants[0].id,
        status: 'connected',
        joinTime: new Date().toISOString(),
      });
    }

    // No need to call Lambda for LiveKit

    // Update call status if needed
    if (videoCall.status === 'ringing') {
      await client.models.VideoCall.update({
        id: callId,
        status: 'active',
      });
    }

    // Mark notification as read
    const { data: notifications } = await client.models.CallNotification.list({
      filter: {
        and: [
          { callId: { eq: callId } },
          { userId: { eq: userId } },
        ],
      },
    });

    if (notifications.length > 0) {
      await client.models.CallNotification.update({
        id: notifications[0].id,
        isRead: true,
      });
    }

    return NextResponse.json({
      roomName: videoCall.meetingId,
    });
  } catch (error) {
    console.error('Error accepting call:', error);
    throw error;
  }
}

async function declineCall(body: any, session: any) {
  const { callId } = body;
  const userId = session.userSub;

  try {
    // Update participant status
    const { data: participants } = await client.models.CallParticipant.list({
      filter: {
        and: [
          { callId: { eq: callId } },
          { userId: { eq: userId } },
        ],
      },
    });

    if (participants.length > 0) {
      await client.models.CallParticipant.update({
        id: participants[0].id,
        status: 'declined',
      });
    }

    // Mark notification as read
    const { data: notifications } = await client.models.CallNotification.list({
      filter: {
        and: [
          { callId: { eq: callId } },
          { userId: { eq: userId } },
        ],
      },
    });

    if (notifications.length > 0) {
      await client.models.CallNotification.update({
        id: notifications[0].id,
        isRead: true,
      });
    }

    return NextResponse.json({ message: 'Call declined' });
  } catch (error) {
    console.error('Error declining call:', error);
    throw error;
  }
}

async function endCall(body: any, session: any) {
  const { callId } = body;
  const userId = session.userSub;

  try {
    // Get call details
    const { data: videoCall } = await client.models.VideoCall.get({ id: callId });
    if (!videoCall) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Update call status
    await client.models.VideoCall.update({
      id: callId,
      status: 'ended',
      endTime: new Date().toISOString(),
    });

    // Update all connected participants
    const { data: participants } = await client.models.CallParticipant.list({
      filter: {
        and: [
          { callId: { eq: callId } },
          { status: { eq: 'connected' } },
        ],
      },
    });

    const updatePromises = participants.map(participant =>
      client.models.CallParticipant.update({
        id: participant.id,
        status: 'disconnected',
        leaveTime: new Date().toISOString(),
      })
    );

    await Promise.all(updatePromises);

    // LiveKit rooms are automatically cleaned up when all participants leave

    // Create call ended notifications
    const notificationPromises = participants
      .filter(p => p.userId !== userId)
      .map(participant =>
        client.models.CallNotification.create({
          userId: participant.userId,
          callId: callId,
          type: 'call_ended',
        })
      );

    await Promise.all(notificationPromises);

    return NextResponse.json({ message: 'Call ended' });
  } catch (error) {
    console.error('Error ending call:', error);
    throw error;
  }
}