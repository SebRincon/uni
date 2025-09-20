'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCallSubscriptions } from '@/hooks/useCallSubscriptions';
import { IncomingCallModal } from '@/components/videocall/IncomingCallModal';
import { VideoCall } from '@/components/videocall/VideoCall';
import { generateClient } from 'aws-amplify/data';
import { type Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

interface CallContextType {
  startCall: (conversationId: string, type: 'video' | 'audio') => void;
  endCall: () => void;
  isInCall: boolean;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { incomingCall, activeCallId, acceptCall, declineCall } = useCallSubscriptions();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [currentCallData, setCurrentCallData] = useState<{
    conversationId: string;
    callId?: string;
  } | null>(null);

  const startCall = (conversationId: string, type: 'video' | 'audio') => {
    setCurrentCallData({ conversationId });
    setShowVideoCall(true);
  };

  const endCall = () => {
    setShowVideoCall(false);
    setCurrentCallData(null);
  };

  const handleAcceptIncomingCall = () => {
    if (incomingCall) {
      acceptCall(incomingCall.callId);
      setCurrentCallData({
        conversationId: incomingCall.conversationId,
        callId: incomingCall.callId,
      });
      setShowVideoCall(true);
    }
  };

  const handleDeclineIncomingCall = () => {
    if (incomingCall) {
      declineCall(incomingCall.callId);
    }
  };

  // Get caller photo URL if we have an incoming call
  const [callerPhotoUrl, setCallerPhotoUrl] = useState<string | undefined>();

  useEffect(() => {
    const fetchCallerPhoto = async () => {
      if (incomingCall?.callerId) {
        const { data: user } = await client.models.User.get({ 
          username: incomingCall.callerId 
        });
        setCallerPhotoUrl(user?.photoUrl || undefined);
      }
    };

    fetchCallerPhoto();
  }, [incomingCall?.callerId]);

  return (
    <CallContext.Provider value={{ startCall, endCall, isInCall: showVideoCall }}>
      {children}

      {/* Incoming call modal */}
      {incomingCall && !showVideoCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerPhotoUrl={callerPhotoUrl}
          callType={incomingCall.type}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Active video call */}
      {showVideoCall && currentCallData && (
        <VideoCall
          conversationId={currentCallData.conversationId}
          callId={currentCallData.callId}
          onEnd={endCall}
        />
      )}
    </CallContext.Provider>
  );
}