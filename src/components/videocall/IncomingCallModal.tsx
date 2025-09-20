'use client';

import React from 'react';
import { Avatar } from '@mui/material';
import { BiPhone, BiPhoneOff, BiVideo } from 'react-icons/bi';
import { useStorageUrl } from '@/hooks/useStorageUrl';
import styles from './IncomingCallModal.module.css';

interface IncomingCallModalProps {
  callerName: string;
  callerPhotoUrl?: string;
  callType: 'video' | 'audio';
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({
  callerName,
  callerPhotoUrl,
  callType,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const avatarUrl = useStorageUrl(callerPhotoUrl || '');

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.callerInfo}>
          <Avatar
            src={avatarUrl}
            alt={callerName}
            sx={{ width: 80, height: 80 }}
            className={styles.avatar}
          />
          <h2>{callerName}</h2>
          <p>Incoming {callType} call...</p>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.decline}`}
            onClick={onDecline}
            aria-label="Decline call"
          >
            <BiPhoneOff size={32} />
            <span>Decline</span>
          </button>

          <button
            className={`${styles.actionButton} ${styles.accept}`}
            onClick={onAccept}
            aria-label="Accept call"
          >
            {callType === 'video' ? <BiVideo size={32} /> : <BiPhone size={32} />}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}