'use client';

import React, { createContext, useContext, useState } from 'react';
import { useCallSubscriptions } from '@/hooks/useCallSubscriptions';
import { IncomingCallModal } from '@/components/videocall/IncomingCallModal';
import { VideoCall } from '@/components/videocall/VideoCall';

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
  const { incomingCall, acceptCall, declineCall } = useCallSubscriptions();
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

  return (
    <CallContext.Provider value={{ startCall, endCall, isInCall: showVideoCall }}>
      {children}

      {/* Incoming call modal */}
      {incomingCall && !showVideoCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerPhotoUrl={incomingCall.callerPhotoUrl}
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