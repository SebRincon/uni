'use client';

import * as React from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
import type {
  Room,
  LocalParticipant,
  RemoteParticipant,
  TrackPublication,
} from 'livekit-client';
import styles from './TranscriptionOverlay.module.css';

function collectAudioTracks(room?: Room | null): MediaStreamTrack[] {
  const tracks: MediaStreamTrack[] = [];
  if (!room) return tracks;
  try {
    // Local participant audio tracks
    const lp: LocalParticipant | undefined = room.localParticipant as any;
    if (lp && (lp as any).audioTrackPublications) {
      (lp as any).audioTrackPublications.forEach((pub: TrackPublication) => {
        const t = (pub as any)?.track as any;
        const mst: MediaStreamTrack | undefined = t?.mediaStreamTrack;
        if (mst) tracks.push(mst);
      });
    }

    // Remote participants audio tracks
    const participants = (room as any).participants;
    if (participants && typeof participants.forEach === 'function') {
      participants.forEach((p: RemoteParticipant) => {
        const pubs = (p as any)?.audioTrackPublications;
        if (pubs && typeof pubs.forEach === 'function') {
          pubs.forEach((pub: TrackPublication) => {
            const t = (pub as any)?.track as any;
            const mst: MediaStreamTrack | undefined = t?.mediaStreamTrack;
            if (mst) tracks.push(mst);
          });
        }
      });
    }
  } catch (e) {
    console.warn('Failed to collect LiveKit audio tracks, will fallback to mic if available.', e);
  }
  return tracks;
}

async function getFallbackMic(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  } catch (e) {
    console.error('Failed to acquire fallback microphone:', e);
    return null;
  }
}

export function TranscriptionOverlay() {
  const room = useMaybeRoomContext();
  const [isOn, setIsOn] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const sessionIdRef = React.useRef<string>('');
  const seqRef = React.useRef<number>(0);
  const nodesRef = React.useRef<{ sources: MediaStreamAudioSourceNode[]; mix: GainNode | null; zero: GainNode | null; proc: ScriptProcessorNode | null }>({ sources: [], mix: null, zero: null, proc: null });
  const pcmBufferRef = React.useRef<Float32Array[]>([]);
  const pcmLengthRef = React.useRef<number>(0);
  const inFlightRef = React.useRef<boolean>(false);

  // Utilities: downsample to 16kHz, encode WAV
  function downsample(buffer: Float32Array, inRate: number, outRate = 16000) {
    if (outRate === inRate) return buffer;
    const ratio = inRate / outRate;
    const newLen = Math.floor(buffer.length / ratio);
    const out = new Float32Array(newLen);
    let idx = 0;
    let pos = 0;
    while (idx < newLen) {
      const nextPos = Math.floor((idx + 1) * ratio);
      let sum = 0;
      let count = 0;
      for (let i = pos; i < nextPos && i < buffer.length; i++) { sum += buffer[i]; count++; }
      out[idx++] = count ? sum / count : 0;
      pos = nextPos;
    }
    return out;
  }
  function floatTo16BitPCM(float32: Float32Array) {
    const len = float32.length;
    const out = new DataView(new ArrayBuffer(len * 2));
    let offset = 0;
    for (let i = 0; i < len; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      out.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return out;
  }
  function encodeWav(samples: DataView, sampleRate = 16000) {
    const buffer = new ArrayBuffer(44 + samples.byteLength);
    const view = new DataView(buffer);

    function writeString(view: DataView, offset: number, str: string) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    let offset = 0;
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + samples.byteLength, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // PCM
    view.setUint16(offset, 1, true); offset += 2; // PCM format
    view.setUint16(offset, 1, true); offset += 2; // mono
    view.setUint32(offset, sampleRate, true); offset += 4;
    const byteRate = sampleRate * 2; // mono 16-bit
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, 2, true); offset += 2; // block align
    view.setUint16(offset, 16, true); offset += 2; // bits per sample
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, samples.byteLength, true); offset += 4;

    // PCM data
    new Uint8Array(buffer, 44).set(new Uint8Array(samples.buffer));
    return new Blob([buffer], { type: 'audio/wav' });
  }

  const start = React.useCallback(async () => {
    setError(null);
    setTranscript('');

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    try { await audioCtx.resume(); } catch {}

    const mix = audioCtx.createGain();
    const zero = audioCtx.createGain(); zero.gain.value = 0; // keep graph alive without audible output
    const proc = audioCtx.createScriptProcessor(4096, 1, 1);

    nodesRef.current = { sources: [], mix, zero, proc };

    // Collect LiveKit tracks
    const lkTracks = collectAudioTracks(room as any);

    if (lkTracks.length === 0) {
      const fallbackStream = await getFallbackMic();
      if (!fallbackStream) {
        setError('No audio source available. Enable your microphone.');
        try { await audioCtx.close(); } catch {}
        audioCtxRef.current = null;
        return;
      }
      const src = audioCtx.createMediaStreamSource(fallbackStream);
      src.connect(mix);
      nodesRef.current.sources.push(src);
    } else {
      lkTracks.forEach((mst) => {
        try {
          const ms = new MediaStream([mst]);
          const src = audioCtx.createMediaStreamSource(ms);
          src.connect(mix);
          nodesRef.current.sources.push(src);
        } catch (e) {
          console.warn('Failed to connect track to mixer:', e);
        }
      });
    }

    mix.connect(proc);
    // ensure processor is part of the rendering graph so onaudioprocess fires
    proc.connect(zero);
    zero.connect(audioCtx.destination);

    const CHUNK_MS = 1500; // keep chunks lighter and faster to upload
    const CHUNK_SAMPLES = Math.floor(audioCtx.sampleRate * (CHUNK_MS / 1000));

    pcmBufferRef.current = [];
    pcmLengthRef.current = 0;

    sessionIdRef.current = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    seqRef.current = 0;

    proc.onaudioprocess = async (e: AudioProcessingEvent) => {
      try {
        const inL = e.inputBuffer.numberOfChannels > 0 ? e.inputBuffer.getChannelData(0) : new Float32Array(e.inputBuffer.length);
        // Mix down to mono if needed by averaging channels
        let mono = inL;
        if (e.inputBuffer.numberOfChannels > 1) {
          const inR = e.inputBuffer.getChannelData(1);
          mono = new Float32Array(inL.length);
          for (let i = 0; i < inL.length; i++) mono[i] = (inL[i] + inR[i]) / 2;
        }

        pcmBufferRef.current.push(mono.slice());
        pcmLengthRef.current += mono.length;

        if (pcmLengthRef.current >= CHUNK_SAMPLES && !inFlightRef.current) {
          // Concatenate
          const cat = new Float32Array(pcmLengthRef.current);
          let o = 0;
          for (const b of pcmBufferRef.current) { cat.set(b, o); o += b.length; }
          pcmBufferRef.current = [];
          pcmLengthRef.current = 0;

          // Downsample to 16kHz
          const ds = downsample(cat, audioCtx.sampleRate, 16000);
          const pcm16 = floatTo16BitPCM(ds);
          const wavBlob = encodeWav(pcm16, 16000);

          const size = wavBlob.size;
          if (size < 4096) {
            // too short/silent; skip to avoid model errors
            return;
          }

          const seq = seqRef.current++;
          inFlightRef.current = true;
          console.debug(`[transcribe] POST chunk sid=${sessionIdRef.current} seq=${seq} size=${size}B`);
          try {
            const res = await fetch(`/api/transcribe?sid=${sessionIdRef.current}&seq=${seq}`, {
              method: 'POST',
              headers: { 'Content-Type': 'audio/wav' },
              body: wavBlob,
            });
            if (!res.ok) {
              const t = await res.text();
              console.warn('Transcribe chunk failed', t);
              return;
            }
            const json = await res.json();
            console.debug(`[transcribe] OK sid=${sessionIdRef.current} seq=${seq} textLen=${(json?.text||'').length}`);
            const chunkText: string = json?.text || '';
            if (chunkText) setTranscript((prev) => (prev ? prev + ' ' + chunkText : chunkText));
          } catch (err) {
            console.warn('Transcribe upload error', err);
          } finally {
            inFlightRef.current = false;
          }
        }
      } catch (err) {
        console.warn('Transcribe upload error', err);
      }
    };

    setIsOn(true);
  }, [room]);

  const stop = React.useCallback(async () => {
    try {
      const n = nodesRef.current;
      if (n.proc) { n.proc.disconnect(); n.proc.onaudioprocess = null as any; }
      n.sources.forEach((s) => { try { s.disconnect(); } catch {} });
      if (n.mix) try { n.mix.disconnect(); } catch {}
      if (n.zero) try { n.zero.disconnect(); } catch {}
      nodesRef.current = { sources: [], mix: null, zero: null, proc: null };
    } catch {}
    try { await audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    setIsOn(false);
  }, []);

  const download = React.useCallback(() => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transcript]);

  return (
    <div className={styles.overlay}>
      <div className={styles.controls}>
        {!isOn ? (
          <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={start}>
            Start Transcription
          </button>
        ) : (
          <>
            <button className={`${styles.button} ${styles.buttonDanger}`} onClick={stop}>
              Stop
            </button>
            <button className={styles.button} onClick={download} disabled={!transcript}>
              Download
            </button>
          </>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.title}>Transcript</div>
          <div className={styles.badge}>
            <span className={styles.dot} /> {isOn ? 'Transcribing' : 'Idle'}
          </div>
        </div>
        <div className={styles.body}>
          {error ? <span style={{ color: '#ff8a80' }}>{error}</span> : transcript || '—'}
        </div>
      </div>
    </div>
  );
}
