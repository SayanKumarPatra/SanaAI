import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Settings, 
  MessageSquare, 
  Power, 
  Monitor, 
  MonitorOff, 
  ExternalLink, 
  Youtube, 
  Search, 
  Globe, 
  X, 
  Sparkles, 
  Music, 
  Hand, 
  Smile, 
  ChevronRight,
  PhoneCall,
  Volume2,
  Radio,
  Video,
  Upload,
  RotateCcw,
  UserCheck,
  Link as LinkIcon,
  Key,
  Brain,
  Lock,
  Unlock,
  ShieldCheck,
  Server
} from 'lucide-react';
import { connectToSANA, ActionPayload } from './services/geminiService';
import { useAudioHandler } from './hooks/useAudioHandler';
import { useScreenHandler } from './hooks/useScreenHandler';
import { ChatPanel } from './components/ChatPanel';
import { AvatarCanvas } from './components/AvatarCanvas';
import { SanaLogo } from './components/SanaLogo';
import { SetUpSanaModal } from './components/SetUpSanaModal';
import { MemoryDashboardModal } from './components/MemoryDashboardModal';
import { MemoryProposalModal } from './components/MemoryProposalModal';
import { ChatMessage, SanaMemory, MemoryCandidate } from './types';
import { 
  subscribeMemories, 
  createMemory, 
  formatMemoriesForSystemPrompt, 
  detectMemoryFromText 
} from './services/memoryService';
import {
  subscribeLiveAvatarSettings,
  updateLiveAvatarInFirebase,
  updateLiveLogoInFirebase,
  resetLiveAvatarInFirebase,
  resetLiveLogoInFirebase,
  checkAdminPassword,
  compressImageForFirestore
} from './services/avatarService';
import { saveCustomVRM, resetCustomVRM, getCustomVRMUrl, fetchAndSaveVRMFromUrl } from './utils/avatarStorage';

export default function App() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  const [transcription, setTranscription] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('sana_history') || localStorage.getItem('profx_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((item: any, idx: number) => ({
        id: item.id || `msg_${idx}_${Date.now()}`,
        text: item.text || '',
        isModel: item.isModel ?? true,
        timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSaved: item.isSaved || false
      }));
    } catch (e) {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('sana_api_key') || '');
  const [showSetupModal, setShowSetupModal] = useState<boolean>(() => {
    const savedKey = localStorage.getItem('sana_api_key') || process.env.GEMINI_API_KEY;
    return !savedKey;
  });
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('sana_name') || localStorage.getItem('profx_name'));
  const [activeAction, setActiveAction] = useState<ActionPayload | null>(null);

  // SANA Memory Bank State
  const [memories, setMemories] = useState<SanaMemory[]>([]);
  const [showMemoryDashboard, setShowMemoryDashboard] = useState(false);
  const [memoryCandidate, setMemoryCandidate] = useState<MemoryCandidate | null>(null);

  // Real-time Firestore Memory Subscription
  useEffect(() => {
    const unsubscribe = subscribeMemories((data) => {
      setMemories(data);
    });
    return () => unsubscribe();
  }, []);
  
  // 3D Avatar Controls
  const [cameraMode, setCameraMode] = useState<'full' | 'upper' | 'head'>('full');
  const [waveTrigger, setWaveTrigger] = useState<number>(0);
  
  // Admin Control State (Password: 100)
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminPassError, setAdminPassError] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkAdminPassword(adminPassInput)) {
      setIsAdmin(true);
      setAdminPassError(false);
      setAdminPassInput('');
    } else {
      setAdminPassError(true);
    }
  };

  // SANA Personality Mode
  const [persona, setPersona] = useState<'companion' | 'mentor' | 'automation' | 'creative'>('companion');

  // Custom Logo Image (JPG / PNG)
  const [customLogoImg, setCustomLogoImg] = useState<string | null>(() => localStorage.getItem('sana_custom_logo'));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const rawResult = evt.target?.result as string;
      if (rawResult) {
        // Compress image to ensure it fits safely in Firestore (< 50KB)
        const compressed = await compressImageForFirestore(rawResult, 300, 300);
        setCustomLogoImg(compressed);
        localStorage.setItem('sana_custom_logo', compressed);
        if (isAdmin) {
          try {
            await updateLiveLogoInFirebase(compressed);
          } catch (err) {
            console.warn('Failed to update live logo in Firebase:', err);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = async () => {
    setCustomLogoImg(null);
    localStorage.removeItem('sana_custom_logo');
    if (isAdmin) {
      try {
        await resetLiveLogoInFirebase();
      } catch (err) {
        console.warn('Failed to reset live logo in Firebase:', err);
      }
    }
  };

  // Custom VRM Avatar Model
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [customVRMName, setCustomVRMName] = useState<string | null>(() => localStorage.getItem('sana_vrm_name'));
  const [vrmUrlInput, setVrmUrlInput] = useState('');
  const [isDownloadingVRM, setIsDownloadingVRM] = useState(false);

  // Load initial local VRM
  useEffect(() => {
    getCustomVRMUrl().then(url => {
      if (url) setCustomAvatarUrl(url);
    });
  }, []);

  // Real-time Firebase Sync for 3D Avatar & Logo across all live users
  useEffect(() => {
    const unsubscribe = subscribeLiveAvatarSettings(async (settings) => {
      if (settings.vrmUrl) {
        try {
          if (settings.vrmUrl.startsWith('data:') || settings.vrmUrl.startsWith('blob:')) {
            setCustomAvatarUrl(settings.vrmUrl);
            setCustomVRMName(settings.vrmName || 'Live Admin Avatar');
          } else {
            const url = await fetchAndSaveVRMFromUrl(settings.vrmUrl);
            setCustomAvatarUrl(url);
            setCustomVRMName(settings.vrmName || 'Live Admin Avatar');
          }
        } catch (err) {
          console.warn('Could not load live VRM from Firebase URL:', err);
        }
      } else if (settings.vrmUrl === null) {
        setCustomAvatarUrl(null);
        setCustomVRMName(null);
      }

      if (settings.logoUrl) {
        setCustomLogoImg(settings.logoUrl);
        localStorage.setItem('sana_custom_logo', settings.logoUrl);
      } else if (settings.logoUrl === null) {
        setCustomLogoImg(null);
        localStorage.removeItem('sana_custom_logo');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleFileUploadVRM = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const url = await saveCustomVRM(file, file.name);
      setCustomAvatarUrl(url);
      setCustomVRMName(file.name);

      if (isAdmin) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = evt.target?.result as string;
          if (dataUrl) {
            await updateLiveAvatarInFirebase(dataUrl, file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('Failed to save VRM model:', err);
      setError(err?.message || 'Invalid .vrm 3D model file. Please ensure you uploaded a valid .vrm file.');
      e.target.value = '';
    }
  };

  const handleUrlImportVRM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vrmUrlInput.trim()) return;
    try {
      setError(null);
      setIsDownloadingVRM(true);
      const trimmed = vrmUrlInput.trim();
      const url = await fetchAndSaveVRMFromUrl(trimmed);
      setCustomAvatarUrl(url);
      setCustomVRMName('Live Admin Avatar.vrm');
      setVrmUrlInput('');

      if (isAdmin) {
        await updateLiveAvatarInFirebase(trimmed, 'Live Admin Avatar.vrm');
      }
    } catch (err: any) {
      console.error('Failed to download VRM model from URL:', err);
      setError(err?.message || 'Could not load VRM model from URL. Please ensure it is a direct download link or upload the .vrm file directly!');
    } finally {
      setIsDownloadingVRM(false);
    }
  };

  const handleResetVRM = async () => {
    await resetCustomVRM();
    if (isAdmin) {
      try {
        await resetLiveAvatarInFirebase();
      } catch (err) {
        console.warn('Failed to reset live avatar in Firebase:', err);
      }
    }
    setCustomAvatarUrl(null);
    setCustomVRMName(null);
  };

  const sessionRef = useRef<any>(null);

  useEffect(() => {
    if (userName) {
      localStorage.setItem('sana_name', userName);
      localStorage.setItem('profx_name', userName);
    }
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('sana_history', JSON.stringify(transcription));
    localStorage.setItem('profx_history', JSON.stringify(transcription));
  }, [transcription]);

  const { 
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
  } = useAudioHandler();

  const {
    isSharing,
    screenError,
    setScreenError,
    startScreenShare,
    stopScreenShare
  } = useScreenHandler();

  const appendTranscription = useCallback((text: string, isModel: boolean) => {
    if (!text) return;

    // Detect potential memory candidate from user voice input
    if (!isModel && text.length > 6) {
      const detected = detectMemoryFromText(text);
      if (detected) {
        setMemoryCandidate(detected);
      }
    }

    setTranscription(prev => {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const lastMsg = prev[prev.length - 1];

      if (lastMsg && lastMsg.isModel === isModel) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastMsg,
          text: lastMsg.text + text
        };
        return updated;
      }

      return [
        ...prev,
        {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          text: text,
          isModel: isModel,
          timestamp: nowStr,
          isSaved: false
        }
      ];
    });
  }, []);

  const handleToggleSave = useCallback((id: string) => {
    setTranscription(prev => prev.map(m => m.id === id ? { ...m, isSaved: !m.isSaved } : m));
  }, []);

  const handleClearHistory = useCallback(() => {
    setTranscription([]);
    localStorage.removeItem('sana_history');
    localStorage.removeItem('profx_history');
  }, []);

  const handleSendMessageFromChat = useCallback((text: string) => {
    if (!text.trim()) return;

    // Detect potential memory candidate from chat message
    const detected = detectMemoryFromText(text);
    if (detected) {
      setMemoryCandidate(detected);
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      text: text,
      isModel: false,
      timestamp: nowStr,
      isSaved: false
    };

    setTranscription(prev => [...prev, userMsg]);

    if (sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput({ text: text });
      } catch (e) {
        console.error("Error sending user text message:", e);
      }
    }
  }, []);

  const handleConnect = async () => {
    if (status !== 'idle' && status !== 'error') return;
    
    setError(null);
    setStatus('connecting');
    try {
      stopRecording();
      stopScreenShare();

      // Warm up AudioContext immediately on user gesture
      await initAudio();

      const session = await connectToSANA({
        onOpen: (activeSession: any) => {
          const s = activeSession || session;
          sessionRef.current = s;
          setStatus('listening');

          startRecording((base64) => {
            const currentSession = sessionRef.current || s;
            if (currentSession) {
              try {
                currentSession.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
              } catch (e) {
                console.error("Error sending realtime audio:", e);
              }
            }
          });

          // Trigger SANA greeting
          setTimeout(() => {
            const currentSession = sessionRef.current || s;
            if (currentSession) {
              try {
                const greeting = userName 
                  ? `Hello SANA! I am ${userName}.` 
                  : "Hello SANA! I am ready to talk.";
                currentSession.sendRealtimeInput({ text: greeting });
              } catch (e) {
                console.error("Error sending initial greeting trigger:", e);
              }
            }
          }, 300);
        },
        onClose: () => {
          setStatus('idle');
          stopRecording();
          stopScreenShare();
        },
        onError: (err) => {
          console.error('Gemini Error:', err);
          stopRecording();
          stopScreenShare();
          const errMsg = typeof err === 'string' ? err : (err?.message || 'Network connection error. Tap below to retry.');
          if (errMsg.includes('GEMINI_API_KEY') || errMsg.includes('key') || errMsg.includes('missing')) {
            setShowSetupModal(true);
          }
          setError(errMsg);
          setStatus('error');
        },
        onAudioData: (base64) => {
          playAudio(base64);
          setStatus('speaking');
        },
        onTranscription: (text, isModel) => {
          appendTranscription(text, isModel);
        },
        onInterrupted: () => {
          clearQueue();
          setStatus('listening');
        },
        onExecuteAction: (action) => {
          setActiveAction(action);
        }
      }, userName, formatMemoriesForSystemPrompt(memories));
      sessionRef.current = session;
    } catch (err: any) {
      console.error('Session initialization error:', err);
      stopRecording();
      stopScreenShare();
      setError(err?.message || 'Failed to initialize session. Please try again.');
      setStatus('error');
    }
  };

  const handleDisconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    stopRecording();
    stopScreenShare();
    setStatus('idle');
  };

  // Trigger quick audio query shortcut
  const handleQuickShortcut = (textPrompt: string) => {
    if (status === 'idle' || status === 'error') {
      handleConnect().then(() => {
        setTimeout(() => {
          if (sessionRef.current) {
            sessionRef.current.sendRealtimeInput({ text: textPrompt });
          }
        }, 1500);
      });
    } else {
      handleSendMessageFromChat(textPrompt);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      setStatus('speaking');
    } else if (isRecording) {
      setStatus('listening');
    }
  }, [isPlaying, isRecording]);

  // Extract last response for live subtitle preview
  const lastTranscript = transcription.length > 0 ? transcription[transcription.length - 1] : null;

  return (
    <div className="h-[100dvh] w-screen max-h-[100dvh] overflow-y-auto sm:overflow-hidden flex flex-col justify-between p-2 sm:p-5 relative bg-slate-950 text-white selection:bg-orange-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="atmosphere" />

      {/* Upward Dynamic Lighting Aura when Speaking or Listening */}
      <div 
        className={`fixed bottom-0 inset-x-0 h-2/3 pointer-events-none z-0 transition-opacity duration-1000 ${
          status === 'speaking' 
            ? 'speaking-light-upward opacity-100' 
            : status === 'listening' 
              ? 'listening-light-upward opacity-90' 
              : 'opacity-0'
        }`} 
      />

      {/* Header Bar */}
      <header className="w-full flex justify-between items-center z-10 py-1.5 px-2 sm:px-4 shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <SanaLogo size="sm" customImage={customLogoImg} onClick={() => setWaveTrigger(prev => prev + 1)} />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-orange-200 bg-clip-text text-transparent">
                SANA
              </h1>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30 uppercase tracking-wider">
                3D AI Assistant
              </span>
            </div>
            <p className="text-[9px] sm:text-[11px] text-white/60 font-medium truncate max-w-[130px] sm:max-w-none">
              Voice & AI Companion by Sayan
            </p>
          </div>
        </div>

        {/* Action Header Tools */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button 
            onClick={() => setShowMemoryDashboard(true)}
            className="px-2.5 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 active:scale-95 text-orange-300 border border-orange-500/30 transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-semibold shadow-md relative min-h-[36px]"
            title="SANA Memory Bank"
          >
            <Brain size={15} className="text-orange-400 shrink-0" />
            <span className="hidden sm:inline">Memory</span>
            {memories.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-orange-500 text-white font-bold ml-0.5">
                {memories.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setShowSetupModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-semibold shadow-md min-h-[36px]"
            title="Set up Gemini API Key"
          >
            <Key size={14} className="text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">SET UP</span>
          </button>

          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium text-white/90 relative border border-white/10 shadow-md min-h-[36px]"
            title="Open Chat & Saved Notes"
          >
            <MessageSquare size={15} className="text-orange-400 shrink-0" />
            <span className="hidden md:inline">Notes & Chat</span>
            {transcription.length > 0 && (
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Prominent Settings Button for Mobile & Desktop */}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 active:scale-95 transition-all text-purple-200 border border-purple-500/40 shadow-md flex items-center gap-1.5 text-xs font-semibold min-h-[36px]"
            title="Settings & Admin Setup"
          >
            <Settings size={16} className="text-purple-300 animate-spin-slow shrink-0" />
            <span className="text-[11px] sm:text-xs">সেটিং</span>
          </button>
        </div>
      </header>

      {/* Main Content Area - Responsive 2-Column Desktop / Split Mobile */}
      <main className="flex-1 min-h-0 w-full my-2 relative z-10 overflow-y-auto lg:overflow-hidden">
        {!userName && status === 'idle' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 w-full max-w-md rounded-3xl space-y-6 text-center border border-white/15 shadow-2xl relative mx-auto my-auto"
          >
            <SanaLogo size="md" customImage={customLogoImg} className="mx-auto" />
            <div>
              <h2 className="text-2xl font-serif italic text-white font-semibold">Welcome, I am SANA.</h2>
              <p className="text-xs text-white/60 mt-1">Your 3D AI companion & personal assistant. What should I call you?</p>
            </div>
            
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Enter your name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors text-white placeholder-white/30 text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setUserName((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <button 
                onClick={(e) => {
                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                  if (input.value) setUserName(input.value);
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                <span>Start Journey with SANA</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            
            {/* Left Column (3D VRM Stage) - Seamless Open Backdrop without heavy inner border */}
            <div className="lg:col-span-7 h-[280px] xs:h-[320px] sm:h-[400px] lg:h-full w-full relative flex items-center justify-center rounded-2xl sm:rounded-3xl bg-radial from-slate-900/40 via-slate-950/20 to-transparent transition-all overflow-hidden shrink-0">
              
              {/* Soft Ambient Radial Light Behind Avatar */}
              <div className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl -z-10 pointer-events-none transition-all duration-700 ${
                status === 'speaking' ? 'bg-orange-500/25 scale-125' : status === 'listening' ? 'bg-emerald-500/20 scale-110' : 'bg-orange-500/10'
              }`} />

              <AvatarCanvas 
                isSpeaking={status === 'speaking' || isPlaying} 
                cameraMode="full"
                waveTrigger={waveTrigger}
                customAvatarUrl={customAvatarUrl}
                onInvalidAvatar={handleResetVRM}
                className="w-full h-full"
              />

              {/* Interactive Wave Gesture Button on Top-Right */}
              <button
                onClick={() => setWaveTrigger(prev => prev + 1)}
                className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-950/80 border border-white/15 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-orange-300 hover:text-orange-200 hover:bg-slate-900/90 transition-all z-20 shadow-xl flex items-center gap-1.5"
                title="SANA wave hand greeting 👋"
              >
                <Hand size={14} className="text-orange-400 animate-bounce" />
                <span>👋 হাত নাড়ান (Say Hi)</span>
              </button>

              {/* Live Status Badge & Sound Frequency Equalizer Bar */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 sm:gap-2 z-20">
                
                {/* Audio Waveform Equalizer Bars when Active */}
                {(status === 'speaking' || status === 'listening') && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-950/80 border border-white/10 backdrop-blur-md">
                    <span className="w-1 h-3 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.4s]" />
                    <span className="w-1 h-5 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.5s]" />
                    <span className="w-1 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
                    <span className="w-1 h-4 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  </div>
                )}

                <div className="px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-slate-950/90 border border-white/15 backdrop-blur-md flex items-center gap-2 text-[11px] sm:text-xs text-white/90 shadow-2xl">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    status === 'speaking' 
                      ? 'bg-orange-500 animate-ping' 
                      : status === 'listening' 
                        ? 'bg-emerald-400 animate-pulse' 
                        : status === 'connecting'
                          ? 'bg-amber-400 animate-spin'
                          : 'bg-white/40'
                  }`} />
                  <span className="font-semibold tracking-wide">
                    {status === 'speaking' ? 'SANA কথা বলছেন...' : status === 'listening' ? 'SANA শুনছেন...' : status === 'connecting' ? 'সংযুক্ত হচ্ছে...' : 'SANA প্রস্তুত'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column (Control Panel & Actions) - Fits laptop & mobile screen perfectly */}
            <div className="lg:col-span-5 h-full flex flex-col justify-center space-y-2 sm:space-y-3 px-1 py-1 overflow-y-auto">
              
              {/* Welcome & Subtitle Live Stream Box */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-orange-500/30 backdrop-blur-md relative overflow-hidden shadow-lg shrink-0">
                <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/70 mb-1">
                  <span className="font-semibold text-orange-300 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-orange-400 animate-pulse" />
                    <span>{status === 'speaking' ? '🗣 SANA কথা বলছেন' : status === 'listening' ? '🎙 SANA শুনছেন' : '✨ লাইভ সাবটাইটেল (Live Subtitle)'}</span>
                  </span>
                  {userName && <span className="text-[10px] font-mono text-white/50 px-1.5 py-0.5 rounded bg-white/10">{userName}</span>}
                </div>
                
                <div className="max-h-20 sm:max-h-24 overflow-y-auto custom-scrollbar pr-1">
                  <p className="text-xs sm:text-sm text-white font-medium leading-relaxed italic break-words">
                    {lastTranscript 
                      ? `"${lastTranscript.text}"` 
                      : (userName ? `নমস্কার ${userName}, আমি সানা। নিচের মাইক্রোফোন বাটনে চাপ দিয়ে কথা বলুন!` : "নমস্কার! আমি সানা। নিচের মাইক্রোফোন বাটনে চাপ দিয়ে সরাসরি কথা বলুন।")}
                  </p>
                </div>
              </div>

              {/* CIRCULAR DIRECT VOICE TALK HERO BUTTON */}
              <div className="flex flex-col items-center justify-center my-1 shrink-0 gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={status === 'idle' || status === 'error' ? handleConnect : handleDisconnect}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-2xl relative cursor-pointer group border-2 border-white/20 ${
                    status === 'idle'
                      ? 'bg-gradient-to-tr from-orange-500 via-rose-500 to-amber-500 text-white shadow-orange-500/40 hover:shadow-orange-500/60'
                      : status === 'connecting'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : status === 'speaking' || status === 'listening'
                          ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/50 hover:bg-emerald-400'
                          : 'bg-red-500 text-white shadow-red-500/40'
                  }`}
                  title="SANA Live Voice Call"
                >
                  {/* Outer Glowing Rings when connected */}
                  {(status === 'listening' || status === 'speaking') && (
                    <>
                      <span className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-40 pointer-events-none" />
                      <span className="absolute -inset-4 rounded-full border border-emerald-400/30 animate-pulse pointer-events-none" />
                    </>
                  )}

                  {status === 'idle' && (
                    <>
                      <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 opacity-40 blur-md group-hover:opacity-75 transition-opacity pointer-events-none" />
                      <Mic className="w-7 h-7 sm:w-9 sm:h-9 text-white relative z-10" />
                    </>
                  )}

                  {status === 'connecting' && <Radio className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-white relative z-10" />}
                  {status === 'listening' && <Mic className="w-7 h-7 sm:w-9 sm:h-9 text-slate-950 animate-bounce relative z-10" />}
                  {status === 'speaking' && <Volume2 className="w-7 h-7 sm:w-9 sm:h-9 text-slate-950 animate-pulse relative z-10" />}
                  {status === 'error' && <PhoneCall className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10" />}
                </motion.button>

                <div className="text-center">
                  <span className="text-xs sm:text-sm font-bold text-white/95 block leading-tight">
                    {status === 'idle' ? 'সরাসরি কথা বলুন' : status === 'connecting' ? 'সংযুক্ত হচ্ছে...' : status === 'listening' ? 'SANA শুনছেন...' : status === 'speaking' ? 'SANA কথা বলছেন...' : 'পুনরায় চেষ্টা করুন'}
                  </span>
                  <span className="text-[10px] text-white/50 block font-medium">
                    {status === 'idle' ? 'মাইক্রোফোনে ট্যাপ করে কথা শুরু করুন' : 'কল বন্ধ করতে আবার চাপুন'}
                  </span>
                </div>
              </div>

              {/* Auxiliary Controls (Screen Share & Disconnect) */}
              {status !== 'idle' ? (
                <div className="flex items-center justify-center gap-2 w-full shrink-0">
                  <button
                    onClick={() => {
                      if (isSharing) {
                        stopScreenShare();
                      } else {
                        startScreenShare((base64Frame) => {
                          if (sessionRef.current) {
                            sessionRef.current.sendRealtimeInput({
                              video: { data: base64Frame, mimeType: 'image/jpeg' }
                            });
                          }
                        });
                      }
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-all border ${
                      isSharing 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg' 
                        : 'bg-white/5 text-white/90 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {isSharing ? <MonitorOff size={14} /> : <Monitor size={14} />}
                    <span>{isSharing ? "স্ক্রিন শেয়ার বন্ধ" : "স্ক্রিন দেখান"}</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="py-1.5 px-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-[11px] font-semibold transition-all flex items-center gap-1 shrink-0"
                  >
                    <Power size={14} />
                    <span>কল কাটুন</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    startScreenShare((base64Frame) => {
                      if (sessionRef.current) {
                        sessionRef.current.sendRealtimeInput({
                          video: { data: base64Frame, mimeType: 'image/jpeg' }
                        });
                      }
                    });
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Video size={14} className="text-emerald-400" />
                  <span>স্ক্রিন দেখার অনুমতি দিন</span>
                </button>
              )}

              {/* Quick Action Shortcuts Bar (বাংলা) */}
              <div className="space-y-1 pt-1.5 border-t border-white/10 shrink-0">
                <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                  <span>কুইক কমান্ড (Quick Commands)</span>
                  <span className="text-[9px] text-purple-300/80 font-mono">Mobile Compact</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  <button
                    onClick={() => handleQuickShortcut("ইউটিউবে রবীন্দ্র সংগীত চালাও")}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-orange-500/20 active:scale-95 border border-white/10 hover:border-orange-500/40 text-[10px] sm:text-[11px] text-white/90 hover:text-orange-300 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Music size={12} className="text-red-400 shrink-0" />
                    <span>🎵 মিউজিক</span>
                  </button>

                  <button
                    onClick={() => handleQuickShortcut("হোয়াটসঅ্যাপ খোলো")}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 active:scale-95 border border-white/10 hover:border-emerald-500/40 text-[10px] sm:text-[11px] text-white/90 hover:text-emerald-300 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <PhoneCall size={12} className="text-emerald-400 shrink-0" />
                    <span>📱 হোয়াটসঅ্যাপ</span>
                  </button>

                  <button
                    onClick={() => handleQuickShortcut("আজকের লাইভ আবহাওয়া কেমন?")}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-sky-500/20 active:scale-95 border border-white/10 hover:border-sky-500/40 text-[10px] sm:text-[11px] text-white/90 hover:text-sky-300 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles size={12} className="text-sky-400 shrink-0" />
                    <span>🌤️ আবহাওয়া</span>
                  </button>

                  <button
                    onClick={() => handleQuickShortcut("এখন কটা বাজে এবং তারিখ কত?")}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 active:scale-95 border border-white/10 hover:border-amber-500/40 text-[10px] sm:text-[11px] text-white/90 hover:text-amber-300 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles size={12} className="text-amber-400 shrink-0" />
                    <span>🕒 সময়</span>
                  </button>

                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 active:scale-95 border border-purple-500/40 text-[10px] sm:text-[11px] font-semibold text-purple-200 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Settings size={12} className="text-purple-300 animate-spin-slow shrink-0" />
                    <span>⚙️ সেটিং</span>
                  </button>
                </div>
              </div>

              {/* Screen Share Error Toast */}
              {screenError && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs w-full relative flex flex-col gap-1"
                >
                  <p className="leading-relaxed">{screenError}</p>
                  <button 
                    onClick={() => setScreenError(null)} 
                    className="absolute top-2 right-2 text-xs opacity-60 hover:opacity-100 font-bold"
                  >
                    ✕
                  </button>
                </motion.div>
              )}

              {/* Active Tool Action Card (YouTube / Google / Web) */}
              {activeAction && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3.5 rounded-2xl bg-slate-900/95 border border-orange-500/40 text-white text-xs w-full relative flex flex-col gap-2.5 shadow-2xl z-30"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      {activeAction.type === 'youtube' && <Youtube size={18} className="text-red-500 animate-pulse" />}
                      {activeAction.type === 'google' && <Search size={18} className="text-blue-400 animate-pulse" />}
                      {activeAction.type === 'website' && <Globe size={18} className="text-emerald-400 animate-pulse" />}
                      <div>
                        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest block">SANA Automation</span>
                        <h4 className="text-xs font-semibold text-white leading-tight">{activeAction.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={activeAction.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1 text-[11px]"
                        title="Open in new window"
                      >
                        <span>New Tab</span>
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => setActiveAction(null)}
                        className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Embedded Video Player */}
                  {activeAction.type === 'youtube' && activeAction.query && (
                    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner relative">
                      <iframe
                        src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(activeAction.query)}&autoplay=1`}
                        title={`YouTube Search: ${activeAction.query}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {activeAction.type === 'google' && (
                    <a
                      href={activeAction.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Search size={14} />
                      <span>View Google Search Results</span>
                    </a>
                  )}

                  {activeAction.type === 'website' && (
                    <a
                      href={activeAction.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-center font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Globe size={14} />
                      <span>Open {activeAction.url}</span>
                    </a>
                  )}

                  {activeAction.type === 'weather' && activeAction.weatherData && (
                    <div className="w-full p-4 rounded-xl bg-gradient-to-r from-sky-900/60 to-blue-900/60 border border-sky-400/30 text-white space-y-2">
                      <div className="flex justify-between items-center border-b border-sky-400/20 pb-2">
                        <span className="text-xs font-bold text-sky-200">🌤️ Live Weather Data</span>
                        <span className="text-[11px] font-mono text-sky-300">{activeAction.weatherData.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-black text-white">{activeAction.weatherData.temperature}</div>
                          <div className="text-xs text-sky-200">{activeAction.weatherData.condition}</div>
                        </div>
                        <div className="text-right text-[11px] text-sky-200/80 space-y-0.5 font-mono">
                          <div>Humidity: {activeAction.weatherData.humidity || 'N/A'}</div>
                          <div>Wind: {activeAction.weatherData.windSpeed || 'N/A'}</div>
                          <div>Forecast: {activeAction.weatherData.todayForecast || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

            </div>

          </div>
        )}
      </main>

      {/* Settings & Voice Customization Sidebar */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-full sm:w-96 max-w-full glass-card m-0 sm:m-3 z-50 p-4 sm:p-5 flex flex-col justify-between border-l sm:border border-white/15 shadow-2xl rounded-none sm:rounded-3xl h-full max-h-screen sm:max-h-[calc(100vh-1.5rem)] overflow-hidden"
            >
            {/* Header Fixed */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Settings size={18} className="text-purple-400" />
                  <span>SANA সেটিং (Settings)</span>
                </h2>
                <p className="text-[10px] sm:text-[11px] text-white/50">Voice synthesis, 3D Avatar & Admin Controls</p>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 border border-white/15 min-h-[38px]"
                title="Close settings"
              >
                <X size={16} />
                <span>বন্ধ করুন</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-3 custom-scrollbar">
              {/* Voice Pitch */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70 font-medium">Voice Pitch</span>
                  <span className="text-orange-400 font-mono font-bold">{detune > 0 ? '+' : ''}{detune}</span>
                </div>
                <input 
                  type="range" 
                  min="-1200" 
                  max="1200" 
                  step="100"
                  value={detune}
                  onChange={(e) => setDetune(parseInt(e.target.value))}
                  className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-widest">
                  <span>Deep</span>
                  <span>Normal</span>
                  <span>High</span>
                </div>
              </div>

              {/* Speaking Speed */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-white/70 font-medium">Speaking Speed</span>
                  <span className="text-orange-400 font-mono font-bold">{playbackRate.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1"
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-widest">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Google Gemini API Key Setup */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/80 font-semibold flex items-center gap-1.5">
                    <Key size={14} className="text-cyan-400" />
                    <span>Google Gemini API Key</span>
                  </span>
                  {apiKey ? (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Setup Needed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowSetupModal(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-teal-600/20 border border-cyan-500/30 hover:bg-cyan-600/30 transition-all text-xs font-semibold text-cyan-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Key size={14} className="text-cyan-400" />
                  <span>{apiKey ? "UPDATE GEMINI API KEY" : "SET UP SANA (API KEY)"}</span>
                </button>
              </div>

              {/* SANA Memory Bank Management */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/80 font-semibold flex items-center gap-1.5">
                    <Brain size={14} className="text-orange-400" />
                    <span>Memory System</span>
                  </span>
                  <span className="text-[10px] text-orange-400 font-mono bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                    {memories.length} Saved
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowMemoryDashboard(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 hover:bg-orange-600/30 transition-all text-xs font-semibold text-orange-200 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Brain size={14} className="text-orange-400" />
                  <span>OPEN MEMORY DASHBOARD</span>
                </button>
              </div>

              {/* 3D Avatar & Logo Control with Admin Firebase Sync */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/80 font-semibold flex items-center gap-1.5">
                    <UserCheck size={14} className="text-orange-400" />
                    <span>3D Avatar & Logo (Firebase Sync)</span>
                  </span>
                  {isAdmin ? (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Unlock size={10} />
                      Admin Control
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={10} />
                      Protected
                    </span>
                  )}
                </div>

                {!isAdmin ? (
                  /* Non-Admin Login Prompt */
                  <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 space-y-3">
                    <div className="flex items-center gap-2.5 text-xs text-amber-200/90 font-medium">
                      <ShieldCheck size={16} className="text-amber-400 shrink-0" />
                      <span>লাইভ সার্ভার ৩ডি অবতার ও লোগো পরিবর্তন করার জন্য এডমিন লগইন করুন।</span>
                    </div>

                    <form onSubmit={handleAdminLogin} className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="পাসওয়ার্ড লিখুন (যেমন: 100)..."
                        value={adminPassInput}
                        onChange={(e) => {
                          setAdminPassInput(e.target.value);
                          setAdminPassError(false);
                        }}
                        className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-orange-500/60 font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5"
                      >
                        <Unlock size={12} />
                        <span>Admin Login</span>
                      </button>
                    </form>

                    {adminPassError && (
                      <p className="text-[11px] text-red-400 font-medium">
                        ❌ ভুল এডমিন পাসওয়ার্ড! অনুগ্রহ করে ১০০ দিয়ে চেষ্টা করুন।
                      </p>
                    )}

                    <div className="pt-2 border-t border-white/10 text-[11px] text-white/60 space-y-1">
                      <div className="flex justify-between items-center">
                        <span>বর্তমান ৩ডি অবতার:</span>
                        <span className="font-mono text-orange-300">{customVRMName || 'Default SANA'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>সার্ভার স্ট্যাটাস:</span>
                        <span className="text-emerald-400 flex items-center gap-1 font-mono">
                          <Server size={10} /> Live Connected
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Admin Active Control Panel */
                  <div className="p-3.5 rounded-2xl bg-gradient-to-b from-orange-500/10 to-amber-500/5 border border-orange-500/30 space-y-3.5 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-orange-500/20">
                      <div className="flex items-center gap-2">
                        <Unlock size={15} className="text-emerald-400" />
                        <span className="text-xs font-bold text-orange-200">এডমিন মোড সচল (Password: 100)</span>
                      </div>
                      <button
                        onClick={() => setIsAdmin(false)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-[10px] transition-colors"
                      >
                        Logout
                      </button>
                    </div>

                    {/* Admin VRM Avatar Controls */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-white/90 block">
                        ১. লাইভ ৩ডি অবতার (.vrm ফাইল বা লিঙ্ক আপলোড)
                      </span>

                      {customVRMName && (
                        <div className="p-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white/80 flex items-center justify-between">
                          <span className="truncate font-mono text-[11px] text-orange-300">{customVRMName}</span>
                          <button
                            onClick={handleResetVRM}
                            className="text-red-400 hover:text-red-300 px-2 py-0.5 hover:bg-white/10 rounded-lg transition-colors text-[10px] flex items-center gap-1 shrink-0"
                            title="Reset to default SANA avatar on live server"
                          >
                            <RotateCcw size={10} />
                            <span>Reset Live</span>
                          </button>
                        </div>
                      )}

                      {/* File Upload */}
                      <label className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 hover:bg-orange-500/30 transition-all text-xs font-semibold text-orange-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg">
                        <Upload size={14} className="text-orange-400" />
                        <span>{customVRMName ? "Change Live .vrm File" : "Upload Live .vrm File to Firebase"}</span>
                        <input
                          type="file"
                          accept=".vrm"
                          onChange={handleFileUploadVRM}
                          className="hidden"
                        />
                      </label>

                      {/* URL Direct Import */}
                      <form onSubmit={handleUrlImportVRM} className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <LinkIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                          <input
                            type="url"
                            placeholder="Paste VRM Direct Link / Drive Link..."
                            value={vrmUrlInput}
                            onChange={(e) => setVrmUrlInput(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isDownloadingVRM || !vrmUrlInput.trim()}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1"
                        >
                          {isDownloadingVRM ? 'Saving...' : 'Sync Live'}
                        </button>
                      </form>
                    </div>

                    {/* Admin Logo Controls */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-white/90">২. লাইভ লোগো ব্যাজ (JPG/PNG)</span>
                        {customLogoImg && (
                          <button
                            onClick={handleResetLogo}
                            className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1"
                          >
                            <RotateCcw size={10} />
                            <span>Reset Live Logo</span>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <SanaLogo size="sm" customImage={customLogoImg} />
                        <label className="flex-1 py-2 px-3 rounded-xl bg-black/30 hover:bg-black/50 border border-white/15 transition-all text-xs font-semibold text-white/90 cursor-pointer flex items-center justify-center gap-2">
                          <Upload size={14} className="text-orange-400" />
                          <span>{customLogoImg ? "Change Live Logo" : "Upload Live Logo to Firebase"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Persona / Vibe Selection */}
              <div className="space-y-3">
                <span className="text-xs text-white/70 font-medium block">SANA Persona Vibe</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPersona('companion')}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${persona === 'companion' ? 'bg-orange-500/20 border-orange-500 text-orange-200' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                  >
                    🌟 Warm Companion
                  </button>
                  <button
                    onClick={() => setPersona('mentor')}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${persona === 'mentor' ? 'bg-orange-500/20 border-orange-500 text-orange-200' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                  >
                    🎓 Smart Specialist
                  </button>
                  <button
                    onClick={() => setPersona('automation')}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${persona === 'automation' ? 'bg-orange-500/20 border-orange-500 text-orange-200' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                  >
                    ⚡ Tech Automator
                  </button>
                  <button
                    onClick={() => setPersona('creative')}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${persona === 'creative' ? 'bg-orange-500/20 border-orange-500 text-orange-200' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                  >
                    🎨 Creative Thinker
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 shrink-0 mt-2">
              <p className="text-[11px] text-white/40 leading-relaxed italic text-center">
                SANA 3D AI Assistant created by Sayan. Real-time Gemini Live voice & vision streaming.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* Chat & Notes Panel */}
      <ChatPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        messages={transcription}
        onToggleSave={handleToggleSave}
        onClearHistory={handleClearHistory}
        onSendMessage={handleSendMessageFromChat}
        isConnected={status !== 'idle' && status !== 'error'}
      />

      {/* SET UP SANA Modal Page */}
      <SetUpSanaModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSaveKey={(key) => setApiKey(key)}
        currentKey={apiKey}
      />

      {/* SANA AI Memory Dashboard */}
      <MemoryDashboardModal
        isOpen={showMemoryDashboard}
        onClose={() => setShowMemoryDashboard(false)}
        memories={memories}
      />

      {/* SANA AI Memory Proposal Modal (Requires user confirmation before saving) */}
      <MemoryProposalModal
        candidate={memoryCandidate}
        onSave={async (candidate) => {
          await createMemory(candidate);
          setMemoryCandidate(null);
        }}
        onDiscard={() => setMemoryCandidate(null)}
      />
    </div>
  );
}
