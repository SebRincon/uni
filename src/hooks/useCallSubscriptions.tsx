import { useEffect, useState } from 'react';
import { authClient as client } from '@/lib/amplify-client';
import { fetchAuthSession } from 'aws-amplify/auth';
import toast from 'react-hot-toast';

interface IncomingCall {
  callId: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  callerPhotoUrl?: string;
  type: 'video' | 'audio';
}

export function useCallSubscriptions() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      const session = await fetchAuthSession();
      const userId = session.userSub;

      if (!userId) return;

      // Subscribe to call notifications for the current user
      subscription = client.models.CallNotification.observeQuery({
        filter: { userId: { eq: userId } }
      }).subscribe({
        next: ({ items, isSynced }) => {
          if (!isSynced) return;

          // Check for new incoming call notifications
          const incomingCallNotification = items.find(
            notification => notification.type === 'incoming_call' && !notification.isRead
          );

          if (incomingCallNotification) {
            handleIncomingCall(incomingCallNotification);
          }

          // Check for call ended notifications
          const endedCallNotification = items.find(
            notification => notification.type === 'call_ended' && !notification.isRead
          );

          if (endedCallNotification) {
            handleCallEnded(endedCallNotification);
          }
        },
        error: (error) => {
          console.error('Subscription error:', error);
        }
      });
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleIncomingCall = async (notification: any) => {
    try {
      // Get call details
      const callResponse = await client.models.VideoCall.get({ id: notification.callId });
      const call = callResponse?.data;
      if (!call) return;

      // Get caller details - initiatorId is the username since User model uses username as primary key
      let caller: any = null;
      try {
        // Use any type to avoid TypeScript complexity
        const models = (client as any).models;
        const userResponse = await models.User.get({ username: call.initiatorId });
        caller = userResponse?.data;
      } catch (error) {
        console.error('Error fetching caller:', error);
      }
      
      setIncomingCall({
        callId: call.id,
        conversationId: call.conversationId,
        callerId: call.initiatorId,
        callerName: caller?.name || caller?.username || 'Unknown',
        callerPhotoUrl: caller?.photoUrl ?? undefined,
        type: call.type as 'video' | 'audio',
      });

      // Show toast notification
      toast(`${caller?.name || 'Someone'} is calling...`, {
        duration: 30000, // 30 seconds
        position: 'top-right',
        icon: '📞',
      });

      // Play ringtone (optional)
      playRingtone();
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  };

  const handleCallEnded = async (notification: any) => {
    if (notification.callId === activeCallId) {
      setActiveCallId(null);
      toast('Call ended', {
        duration: 3000,
        position: 'top-center',
      });
    }

    // Mark notification as read
    try {
      await client.models.CallNotification.update({
        id: notification.id,
        isRead: true,
      });
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const acceptCall = (callId: string) => {
    setActiveCallId(callId);
    // The actual call acceptance is handled by the VideoCall component
  };

  const declineCall = async (callId: string) => {
    try {
      await fetch('/api/video-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          callId,
        }),
      });

      setIncomingCall(null);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };

  const playRingtone = () => {
    // Optional: Play a ringtone sound
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(() => {
      // User hasn't interacted with page yet
    });

    // Stop ringtone after 30 seconds or when call is answered/declined
    setTimeout(() => {
      audio.pause();
    }, 30000);
  };

  return {
    incomingCall,
    activeCallId,
    acceptCall,
    declineCall,
  };
}