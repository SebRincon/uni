'use client';

import React, { useCallback } from 'react';
import { VideoConference } from './VideoConference';
import { fetchAuthSession } from 'aws-amplify/auth';
import styles from './VideoCall.module.css';
import '@livekit/components-styles';

interface VideoCallProps {
  conversationId: string;
  callId?: string;
  onEnd: () => void;
}

export function VideoCall({ conversationId, callId, onEnd }: VideoCallProps) {
  const [username, setUsername] = React.useState<string>('');
  
  React.useEffect(() => {
    fetchAuthSession().then(session => {
      setUsername(session.tokens?.idToken?.payload?.['cognito:username'] as string || 'Guest');
    });
  }, []);

  // Use conversation ID as the room name for LiveKit
  const roomName = `conversation-${conversationId}`;

  const handleLeave = useCallback(async () => {
    // End or leave the call
    if (callId) {
      await fetch('/api/video-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end',
          callId,
        }),
      });
    }
    onEnd();
  }, [callId, onEnd]);

  return (
    <div className={styles.container} data-lk-theme="default">
      <VideoConference
        roomName={roomName}
        username={username}
        onLeave={handleLeave}
      />
    </div>
  );
}