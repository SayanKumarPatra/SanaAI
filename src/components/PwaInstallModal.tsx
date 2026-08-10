import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Globe, CheckCircle2, Share, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-slate-900 border-2 border-blue-500/50 rounded-3xl p-5 sm:p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 overflow-hidden max-h-[90vh] overflow-y-auto"
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
                <span>SANA AI অ্যাপ ইনস্টল গাইড</span>
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
            <div className="space-y-3.5">
              {/* Native Prompt Direct Trigger Button */}
              {canPromptNative && (
                <button
                  onClick={onTriggerInstall}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:from-blue-500 hover:to-sky-400 active:scale-98 text-white text-sm font-bold shadow-xl transition-all flex items-center justify-center gap-2 border border-sky-400/30"
                >
                  <Download size={18} />
                  <span>এখনই ডিরেক্ট ইনস্টল করুন (Direct Install)</span>
                </button>
              )}

              {/* Step by Step Manual Browser Instructions */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} />
                  <span>{isIOS ? 'Safari (iOS) ইনস্টল করার নিয়ম:' : 'Chrome (Android & PC) ইনস্টল করার নিয়ম:'}</span>
                </div>

                {!isIOS ? (
                  <ol className="text-xs text-white/80 space-y-2 list-decimal pl-4">
                    <li>
                      ক্রোম ব্রাউজারের ওপরে ডানদিকে থাকা <strong className="text-amber-300">৩টি ডট (⋮)</strong> মেনুতে চাপ দিন।
                    </li>
                    <li>
                      মেনু থেকে <strong className="text-sky-300">"Install app" (অ্যাপ ইনস্টল করুন)</strong> অথবা <strong className="text-sky-300">"Add to Home screen"</strong> নির্বাচন করুন।
                    </li>
                    <li>
                      পপ-আপ আসলে <strong className="text-emerald-400">"Install"</strong> বাটনে ট্যাপ করুন।
                    </li>
                  </ol>
                ) : (
                  <ol className="text-xs text-white/80 space-y-2 list-decimal pl-4">
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

              {/* Troubleshooting Box for Mobile Chrome Shortcut Issue */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle size={15} className="shrink-0 text-amber-400" />
                  <span>ইন্সটল না হয়ে শুধু শর্টকাট (Add to Home screen) হচ্ছে? (সমাধান)</span>
                </div>
                <div className="text-amber-100/90 leading-relaxed text-[11px] space-y-1">
                  <p>
                    ১. <strong>ইন-অ্যাপ বা প্রিভিউ ফ্রেম:</strong> ফেসবুক, হোয়াটসঅ্যাপ বা অন্য কোনো অ্যাপের ভেতর লিঙ্ক খুললে সম্পূর্ণ অ্যাপ ইনস্টল হয় না, শুধু শর্টকাট যোগ হয়।
                  </p>
                  <p>
                    ২. <strong>ক্রোম ব্রাউজারে ডিরেক্ট ওপেন:</strong> নিচের <strong>"নতুন ট্যাবে খুলুন"</strong> বাটনে চাপ দিয়ে গুগল ক্রোমে সরাসরি ওয়েবসাইটটি লিংকটি ওপেন করুন।
                  </p>
                  <p>
                    ৩. <strong>রিফ্রেশ ও ৩-ডট মেনু:</strong> পেজটি একবার রিফ্রেশ করে ২-৩ সেকেন্ড পর ক্রোমের ৩টি ডট (⋮) এ ট্যাপ করলে <strong>"Install app" (অ্যাপ ইনস্টল করুন)</strong> অপশন পেয়ে যাবেন।
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleCopyLink}
                    className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all border border-white/15"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'লিংক কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
                  </button>

                  <button
                    onClick={handleOpenNewTab}
                    className="py-2 px-3 rounded-xl bg-sky-600/40 hover:bg-sky-600/60 active:scale-95 text-sky-200 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all border border-sky-400/30"
                  >
                    <ExternalLink size={14} />
                    <span>নতুন ট্যাবে খুলুন</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-1 text-center text-[11px] text-white/40">
            PWA (Progressive Web App) Support • SANA AI Companion
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
