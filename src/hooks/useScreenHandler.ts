import { useState, useEffect, useRef, useCallback } from 'react';

export function useScreenHandler() {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScreenShare = useCallback(async (onFrame: (base64: string) => void) => {
    setScreenError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor", // prefer full screen
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: { max: 5 } // lower frame rate is sufficient
        },
        audio: false
      });

      setScreenStream(stream);
      setIsSharing(true);

      // Create hidden video element to render the stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      videoRef.current = video;

      // Create canvas to capture frames
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;

      // Wait for video to load metadata to get dimensions
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        // Set up interval to capture frame every 1.5 seconds (to be safe and not overwhelm the model)
        intervalRef.current = setInterval(() => {
          if (video.readyState >= 2) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              // Convert to JPEG with compressed quality (0.5) to keep payload small
              const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
              const base64 = dataUrl.split(',')[1];
              onFrame(base64);
            }
          }
        }, 1500);
      };

      // Handle stream end (user clicks "Stop sharing" from the browser banner)
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

    } catch (err: any) {
      console.error("Error sharing screen:", err);
      setIsSharing(false);
      setScreenStream(null);
      if (err.name === 'NotAllowedError' || err.message?.includes('denied') || err.message?.includes('disallowed') || err.message?.includes('cancel')) {
        setScreenError("আপনি স্ক্রিন শেয়ারের অনুমতি বাতিল করেছেন। SANA-কে আপনার ল্যাপটপের স্ক্রিন দেখাতে এবং সাহায্য পেতে অনুগ্রহ করে আবার স্ক্রিন শেয়ার বাটনে ক্লিক করুন ও স্ক্রিন বা উইন্ডো সিলেক্ট করুন!\n\n(You declined or cancelled screen sharing. To let SANA see your laptop screen, please click the button again and select a window/screen!)");
      } else {
        setScreenError(err.message || "Could not share screen. Please try again.");
      }
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    setIsSharing(false);
  }, [screenStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    isSharing,
    screenStream,
    screenError,
    setScreenError,
    startScreenShare,
    stopScreenShare
  };
}
