'use client';

import React from 'react';
import {
  LiveKitRoom as LiveKitRoomComponent,
  VideoConference as LiveKitVideoConference,
  formatChatMessageLinks,
  LocalUserChoices,
  PreJoin,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useRouter } from 'next/navigation';

const LiveKitRoom = LiveKitRoomComponent as any;

interface VideoConferenceProps {
  roomName: string;
  username?: string;
  onLeave?: () => void;
}

export function VideoConference({ roomName, username, onLeave }: VideoConferenceProps) {
  const [token, setToken] = React.useState<string>('');
  const [preJoinChoices, setPreJoinChoices] = React.useState<LocalUserChoices | undefined>(
    undefined,
  );
  
  const preJoinDefaults = React.useMemo(() => {
    return {
      username: username || '',
      videoEnabled: true,
      audioEnabled: true,
    };
  }, [username]);

  const router = useRouter();

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    setPreJoinChoices(values);
    
    // Get token from API
    const url = new URL('/api/livekit', window.location.origin);
    url.searchParams.append('roomName', roomName);
    url.searchParams.append('participantName', values.username);
    
    try {
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.participantToken) {
        setToken(data.participantToken);
      }
    } catch (error) {
      console.error('Failed to get token:', error);
      alert('Failed to join room. Please try again.');
    }
  }, [roomName]);

  const handleDisconnected = React.useCallback(() => {
    setToken('');
    if (onLeave) {
      onLeave();
    } else {
      router.push('/');
    }
  }, [onLeave, router]);

  if (!token) {
    return (
      <main data-lk-theme="default" style={{ height: '100%' }}>
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <PreJoin
            defaults={preJoinDefaults}
            onSubmit={handlePreJoinSubmit}
            onError={console.error}
          />
        </div>
      </main>
    );
  }

  return (
    <main data-lk-theme="default" style={{ height: '100%' }}>
      <LiveKitRoom
        video={preJoinChoices?.videoEnabled}
        audio={preJoinChoices?.audioEnabled}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        onDisconnected={handleDisconnected}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <LiveKitVideoConference
          chatMessageFormatter={formatChatMessageLinks}
        />
      </LiveKitRoom>
    </main>
  );
}