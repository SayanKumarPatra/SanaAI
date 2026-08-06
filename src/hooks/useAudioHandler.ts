import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudioHandler() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [detune, setDetune] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const playbackRateRef = useRef(1.0);
  const detuneRef = useRef(0);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    detuneRef.current = detune;
  }, [detune]);

  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const startRecording = useCallback(async (onData: (base64: string) => void) => {
    const audioCtx = await initAudio();
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    streamRef.current = stream;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const inputSampleRate = audioCtx.sampleRate;
      const targetSampleRate = 16000;
      
      let pcm16: Int16Array;
      if (inputSampleRate === targetSampleRate) {
        pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
      } else {
        const ratio = inputSampleRate / targetSampleRate;
        const newLength = Math.floor(inputData.length / ratio);
        pcm16 = new Int16Array(newLength);
        for (let i = 0; i < newLength; i++) {
          const originIdx = Math.floor(i * ratio);
          const sample = inputData[originIdx] || 0;
          pcm16[i] = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        }
      }

      let binary = '';
      const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
      const chunkSize = 0x4000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      onData(base64);
    };

    // Route mic through gain = 0 to prevent local feedback/echo into speakers
    const silence = audioCtx.createGain();
    silence.gain.value = 0;

    source.connect(processor);
    processor.connect(silence);
    silence.connect(audioCtx.destination);

    setIsRecording(true);
  }, [initAudio]);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const playAudio = useCallback(async (base64: string) => {
    const audioCtx = await initAudio();
    
    const binary = atob(base64);
    const len = binary.length;
    const sampleCount = Math.floor(len / 2);
    if (sampleCount === 0) return;

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      float32[i] = dataView.getInt16(i * 2, true) / 32768;
    }

    // Gemini Live API model output is 24kHz mono PCM
    const buffer = audioCtx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRateRef.current;
    source.detune.value = detuneRef.current;
    source.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now;
    }

    source.start(nextStartTimeRef.current);
    const duration = buffer.duration / playbackRateRef.current;
    nextStartTimeRef.current += duration;

    activeSourcesRef.current.push(source);
    setIsPlaying(true);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      if (activeSourcesRef.current.length === 0 && audioCtx.currentTime >= nextStartTimeRef.current - 0.05) {
        setIsPlaying(false);
      }
    };
  }, [initAudio]);

  const clearQueue = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (audioContextRef.current) {
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsPlaying(false);
  }, []);

  return {
    isRecording,
    isPlaying,
    playbackRate,
    setPlaybackRate,
    detune,
    setDetune,
    initAudio,
    startRecording,
    stopRecording,
    playAudio,
    clearQueue
  };
}
