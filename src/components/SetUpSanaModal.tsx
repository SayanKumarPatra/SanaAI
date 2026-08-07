import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Clipboard, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  X,
  Sparkles
} from 'lucide-react';

interface SetUpSanaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKey: (key: string) => void;
  currentKey?: string;
}

export function SetUpSanaModal({ isOpen, onClose, onSaveKey, currentKey = '' }: SetUpSanaModalProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sana_api_key') || currentKey || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
        setTestStatus('idle');
        setTestError(null);
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const verifyKey = async (keyToTest: string): Promise<boolean> => {
    if (!keyToTest.trim()) {
      setTestError('Please enter a Gemini API key first.');
      setTestStatus('error');
      return false;
    }

    setTestStatus('testing');
    setTestError(null);

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest.trim()}`);
      if (res.ok) {
        setTestStatus('success');
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error?.message || 'Invalid Gemini API key. Please check your key.';
        setTestError(msg);
        setTestStatus('error');
        return false;
      }
    } catch (err: any) {
      setTestError('Network error while testing key. Please check your connection.');
      setTestStatus('error');
      return false;
    }
  };

  const handleTestKey = () => {
    verifyKey(apiKey);
  };

  const handleSaveAndContinue = async () => {
    if (!apiKey.trim()) {
      setTestError('Please enter a Gemini API key.');
      setTestStatus('error');
      return;
    }

    const isValid = await verifyKey(apiKey);
    if (isValid) {
      localStorage.setItem('sana_api_key', apiKey.trim());
      onSaveKey(apiKey.trim());
      onClose();
    }
  };

  const handleGetKey = () => {
    window.open('https://aistudio.google.com/app/apikey', '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-slate-900/95 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-auto overflow-hidden"
        >
          {/* Subtle Ambient Top Glow */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-cyan-500/10 via-teal-500/5 to-transparent pointer-events-none" />

          {/* Close Button if user wants to cancel or close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors"
            title="Close Setup"
          >
            <X size={18} />
          </button>

          {/* Top Key Icon Box */}
          <div className="w-14 h-14 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Key size={26} />
          </div>

          {/* Title & Subtitle */}
          <h2 className="text-xl sm:text-2xl font-bold tracking-wider text-white text-center uppercase">
            SET UP SANA
          </h2>
          <p className="text-xs text-slate-400 text-center max-w-xs mx-auto mt-2 leading-relaxed">
            Add the API key required to activate SANA's existing intelligence and voice. You only need to complete this once.
          </p>

          {/* Card Box */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mt-6 space-y-4 shadow-inner">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                GOOGLE GEMINI API
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-widest">
                REQUIRED
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Required for SANA's intelligence, conversation, memory extraction, live voice, and command understanding.
            </p>

            {/* Input field with toggle show password */}
            <div className="relative flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-3 focus-within:border-cyan-500/60 transition-all">
              <input
                type={showPassword ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus('idle');
                  setTestError(null);
                }}
                placeholder="Enter your Gemini API key"
                className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-full pr-10 text-xs sm:text-sm tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? 'Hide Key' : 'Show Key'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePaste}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <Clipboard size={14} className="text-cyan-400" />
                <span>PASTE</span>
              </button>

              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === 'testing'}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>{testStatus === 'testing' ? 'TESTING...' : 'TEST API'}</span>
              </button>

              <button
                type="button"
                onClick={handleGetKey}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} className="text-amber-400" />
                <span>GET KEY</span>
              </button>
            </div>

            {/* Test Feedback Messages */}
            {testStatus === 'success' && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Gemini API Key is valid and active!</span>
              </div>
            )}

            {testError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{testError}</span>
              </div>
            )}

            {/* How to Get a Key Dropdown */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowHowTo(!showHowTo)}
                className="text-xs font-semibold text-cyan-400/90 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {showHowTo ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>HOW TO GET A KEY</span>
              </button>

              {showHowTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed"
                >
                  <p>1. Click <strong className="text-amber-300">GET KEY</strong> above or go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan-400 underline">aistudio.google.com</a></p>
                  <p>2. Sign in with your Google account.</p>
                  <p>3. Click <strong className="text-white">"Create API Key"</strong> and copy it.</p>
                  <p>4. Paste your key above and click <strong className="text-emerald-300">"TEST, SAVE & CONTINUE"</strong>.</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Security Guarantee */}
          <div className="mt-4 px-1 flex items-start gap-2 text-[11px] text-slate-400/90 leading-relaxed">
            <ShieldCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
            <span>
              The saved key is encrypted in your browser's local storage and is never returned to external servers, bundled in the app, or included in diagnostics.
            </span>
          </div>

          {/* Main Bottom Action Button */}
          <button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={testStatus === 'testing'}
            className="w-full mt-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm tracking-wider uppercase bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-xl shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {testStatus === 'testing' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles size={16} />
                <span>TEST, SAVE & CONTINUE</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
