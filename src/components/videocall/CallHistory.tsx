'use client';

import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Avatar } from '@mui/material';
import { BiPhone, BiVideo, BiPhoneIncoming, BiPhoneOff } from 'react-icons/bi';
import { formatDate } from '@/utilities/date';
import { useStorageUrl } from '@/hooks/useStorageUrl';
import styles from './CallHistory.module.css';

const client = generateClient<Schema>();

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

interface CallHistoryItem {
  id: string;
  type: 'video' | 'audio';
  status: 'completed' | 'missed' | 'declined';
  duration?: number;
  timestamp: string;
  otherParticipant: {
    username: string;
    name?: string;
    photoUrl?: string;
  };
  isIncoming: boolean;
}

export function CallHistory() {
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    try {
      const session = await fetchAuthSession();
      const userId = session.userSub;

      if (!userId) return;

      // Get all call participants for the current user
      const { data: participants } = await client.models.CallParticipant.list({
        filter: { userId: { eq: userId } },
      });

      // Get call details for each participation
      const callPromises = participants.map(async (participant) => {
        const { data: call } = await client.models.VideoCall.get({ 
          id: participant.callId 
        });

        if (!call) return null;

        // Get other participants
        const { data: otherParticipants } = await client.models.CallParticipant.list({
          filter: {
            and: [
              { callId: { eq: call.id } },
              { userId: { ne: userId } },
            ],
          },
        });

        if (otherParticipants.length === 0) return null;

        // Get other user details
        const { data: otherUser } = await client.models.User.get({
          username: otherParticipants[0].userId,
        });

        // Calculate call duration
        let duration: number | undefined;
        if (call.startTime && call.endTime) {
          duration = new Date(call.endTime).getTime() - new Date(call.startTime).getTime();
        }

        // Determine call status
        let status: 'completed' | 'missed' | 'declined';
        if (participant.status === 'declined') {
          status = 'declined';
        } else if (participant.status === 'disconnected' && duration && duration > 0) {
          status = 'completed';
        } else {
          status = 'missed';
        }

        return {
          id: call.id,
          type: call.type as 'video' | 'audio',
          status,
          duration,
          timestamp: call.createdAt,
          otherParticipant: {
            username: otherUser?.username || otherParticipants[0].userId,
            name: otherUser?.name ?? undefined,
            photoUrl: otherUser?.photoUrl ?? undefined,
          },
          isIncoming: call.initiatorId !== userId,
        };
      });

      const callHistory = (await Promise.all(callPromises))
        .filter((call) => call !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setCalls(callHistory);
      setLoading(false);
    } catch (error) {
      console.error('Error loading call history:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading call history...</div>;
  }

  if (calls.length === 0) {
    return (
      <div className={styles.empty}>
        <BiPhone size={48} />
        <p>No call history yet</p>
      </div>
    );
  }

  return (
    <div className={styles.callHistory}>
      <h2>Call History</h2>
      <div className={styles.callList}>
        {calls.map((call) => (
          <CallHistoryItemComponent key={call.id} call={call} />
        ))}
      </div>
    </div>
  );
}

function CallHistoryItemComponent({ call }: { call: CallHistoryItem }) {
  const avatarUrl = useStorageUrl(call.otherParticipant.photoUrl || '');

  const getCallIcon = () => {
    if (call.status === 'missed') return <BiPhoneOff color="var(--danger)" />;
    if (call.status === 'declined') return <BiPhoneOff color="var(--danger)" />;
    if (call.isIncoming) return <BiPhoneIncoming color="var(--success)" />;
    if (call.type === 'video') return <BiVideo />;
    return <BiPhone />;
  };

  return (
    <div className={styles.callItem}>
      <Avatar
        src={avatarUrl}
        alt={call.otherParticipant.name || call.otherParticipant.username}
        sx={{ width: 40, height: 40 }}
      />
      
      <div className={styles.callInfo}>
        <div className={styles.participant}>
          <span className={styles.name}>
            {call.otherParticipant.name || call.otherParticipant.username}
          </span>
          <span className={styles.username}>
            @{call.otherParticipant.username}
          </span>
        </div>
        
        <div className={styles.callDetails}>
          <span className={styles.callType}>
            {getCallIcon()}
            {call.status === 'completed' && call.duration && (
              <span className={styles.duration}>{formatDuration(call.duration)}</span>
            )}
            {call.status === 'missed' && <span className={styles.status}>Missed</span>}
            {call.status === 'declined' && <span className={styles.status}>Declined</span>}
          </span>
          <span className={styles.timestamp}>{formatDate(new Date(call.timestamp))}</span>
        </div>
      </div>
    </div>
  );
}