import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Globe, CheckCircle2, MoreVertical, Share, ExternalLink } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerInstall: () => void;
  canPromptNative: boolean;
  isAlreadyInstalled: boolean;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  onTriggerInstall,
  canPromptNative,
  isAlreadyInstalled
}: PwaInstallModalProps) {
  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-5 sm:p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-5 overflow-hidden"
        >
          {/* Header Accent Bar - Dark Blue Theme */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition-colors"
          >
            <X size={18} />
          </button>

          {/* Title Banner */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shrink-0">
              <Download size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>SANA AI অ্যাপ ইনস্টল করুন</span>
              </h3>
              <p className="text-xs text-blue-200/80">
                মোবাইল বা কম্পিউটারে অরিজিনাল অ্যাপ হিসেবে ব্যবহার করুন
              </p>
            </div>
          </div>

          {isAlreadyInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
              <span>SANA AI ইতোমধ্যেই আপনার ডিভাইসে সফলভাবে ইনস্টল করা আছে!</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Native Prompt Direct Trigger Button */}
              {canPromptNative && (
                <button
                  onClick={onTriggerInstall}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:from-blue-500 hover:to-sky-400 active:scale-98 text-white text-sm font-bold shadow-xl transition-all flex items-center justify-center gap-2 border border-sky-400/30"
                >
                  <Download size={18} />
                  <span>এখনই ইনস্টল করুন (Direct Install)</span>
                </button>
              )}

              {/* Step by Step Manual Browser Instructions */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} />
                  <span>{isIOS ? 'Safari (iOS) ইনস্টল করার নিয়ম:' : 'Chrome (Android & PC) ইনস্টল করার নিয়ম:'}</span>
                </div>

                {!isIOS ? (
                  <ol className="text-xs text-white/80 space-y-2.5 list-decimal pl-4">
                    <li>
                      ব্রাউজারের ওপরে ডানদিকে থাকা <strong className="text-amber-300">৩টি ডট (⋮)</strong> মেনুতে চাপ দিন।
                    </li>
                    <li>
                      মেনু থেকে <strong className="text-sky-300 flex-inline items-center gap-1">"Install app" (অ্যাপ ইনস্টল করুন)</strong> অথবা <strong className="text-sky-300">"Add to Home screen"</strong> এ চাপুন।
                    </li>
                    <li>
                      পপ-আপে <strong className="text-emerald-400">"Install"</strong> বাটনে ট্যাপ করলে অ্যাপ সরাসরি হোম স্ক্রিনে চলে আসবে!
                    </li>
                  </ol>
                ) : (
                  <ol className="text-xs text-white/80 space-y-2.5 list-decimal pl-4">
                    <li>
                      Safari এর নিচে <strong className="text-sky-300 flex-inline items-center gap-1">Share (শেয়ার <Share size={12} className="inline" />)</strong> বাটনে ক্লিক করুন।
                    </li>
                    <li>
                      তালিকায় স্ক্রোল করে <strong className="text-amber-300">"Add to Home Screen"</strong> অপশনটিতে ট্যাপ করুন।
                    </li>
                    <li>
                      উপরে <strong className="text-emerald-400">"Add"</strong> চাপলে SANA AI হোম স্ক্রিনে ইনস্টল হয়ে যাবে।
                    </li>
                  </ol>
                )}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 text-center text-[11px] text-white/40">
            PWA (Progressive Web App) Support • SANA AI Companion
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
