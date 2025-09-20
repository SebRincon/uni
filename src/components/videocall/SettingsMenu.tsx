import * as React from 'react';
import { Track } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import {
  MediaDeviceMenu,
  TrackToggle,
  useRoomContext,
  useIsRecording,
  useLocalParticipantPermissions,
  DisconnectButton,
} from '@livekit/components-react';
import { BiCog } from 'react-icons/bi';
import styles from './SettingsMenu.module.css';

export interface SettingsMenuProps {
  onDeviceError?: (error: MediaDeviceError) => void;
}

export function SettingsMenu({ onDeviceError }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'media' | 'recording'>('media');
  const room = useMaybeRoomContext();
  const isRecording = useIsRecording();
  
  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className="lk-button lk-settings-button" onClick={() => setIsOpen(!isOpen)}>
        <BiCog />
      </button>
      
      {isOpen && (
        <div className={styles.settingsModal}>
          <div className={styles.settingsContent}>
            <div className={styles.header}>
              <h2>Settings</h2>
              <button className={styles.closeButton} onClick={handleClose}>
                ×
              </button>
            </div>

            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'media' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('media')}
              >
                Media
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'recording' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('recording')}
              >
                Recording
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'media' && room && (
                <div className={styles.mediaSettings}>
                  <h3>Camera</h3>
                  <div className={styles.deviceSection}>
                    <TrackToggle source={Track.Source.Camera} showIcon={false}>
                      Camera
                    </TrackToggle>
                    <MediaDeviceMenu kind="videoinput" onError={onDeviceError} />
                  </div>

                  <h3>Microphone</h3>
                  <div className={styles.deviceSection}>
                    <TrackToggle source={Track.Source.Microphone} showIcon={false}>
                      Microphone
                    </TrackToggle>
                    <MediaDeviceMenu kind="audioinput" onError={onDeviceError} />
                  </div>

                  <h3>Speaker</h3>
                  <div className={styles.deviceSection}>
                    <MediaDeviceMenu kind="audiooutput" onError={onDeviceError} />
                  </div>
                </div>
              )}

              {activeTab === 'recording' && room && (
                <div className={styles.recordingSettings}>
                  <RecordingSettings />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecordingSettings() {
  const { localParticipant } = useRoomContext();
  const { canPublish } = useLocalParticipantPermissions();
  const isRecording = useIsRecording();

  const [isStarting, setIsStarting] = React.useState(false);

  const handleRecording = async () => {
    if (!canPublish) {
      alert('You do not have permission to manage recordings');
      return;
    }

    setIsStarting(true);
    try {
      // Recording is managed server-side in LiveKit
      // You would typically make an API call to your backend here
      alert('Recording functionality requires server-side implementation');
    } catch (error) {
      console.error('Recording error:', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div>
      <p className={styles.recordingStatus}>
        Recording is {isRecording ? 'active' : 'not active'}
      </p>
      <button
        className={`lk-button ${isRecording ? 'lk-button-danger' : ''}`}
        onClick={handleRecording}
        disabled={isStarting}
      >
        {isStarting ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
}