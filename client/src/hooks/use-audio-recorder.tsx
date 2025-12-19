import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface AudioRecording {
  blob: Blob;
  duration: number;
  url: string;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(20));
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      // Check if we're on mobile and need to handle permissions differently
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Request permissions explicitly on mobile - handle all promise rejections
      if (isMobile && navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null);
          if (permission?.state === 'denied') {
            throw new Error('Microphone permission denied. Please enable microphone access in your browser settings.');
          }
        } catch (permError) {
          console.log('Permission query not supported, proceeding with getUserMedia');
        }
      }

      // Enhanced mobile-optimized audio constraints with better quality
      const audioConstraints = isMobile ? {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
          latency: 0.02, // Low latency for better performance
        }
      } : {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          sampleSize: 16,
          latency: 0.01,
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      
      streamRef.current = stream;
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 64;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Set up media recorder with fallback for mobile compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = ''; // Let browser choose
        }
      }

      mediaRecorderRef.current = new MediaRecorder(stream, 
        mimeType ? { mimeType } : undefined
      );
      
      const chunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          if (window.audioChunkCallback) {
            window.audioChunkCallback(event.data);
          }
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        // Calculate duration (approximate)
        const duration = recordingDuration;
        
        // Trigger callback with recording data
        if (window.audioRecordingCallback) {
          window.audioRecordingCallback({ blob, duration, url });
        }
      };
      
      // Start recording
      mediaRecorderRef.current.start(500);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer with 30-second auto-cutoff
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop recording after 30 seconds
          if (newDuration >= 30) {
            // Show notification about auto-cutoff
            toast({
              title: "Recording Auto-Stopped",
              description: "Recording automatically stopped after 30 seconds",
              variant: "default",
            });
            // Stop recording safely
            setTimeout(() => stopRecording(), 100);
            return 30;
          }
          return newDuration;
        });
      }, 1000);
      
      // Start audio visualization
      const updateLevels = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Convert frequency data to visual levels
          const levels = Array.from({ length: 12 }, (_, i) => {
            const index = Math.floor((i / 12) * bufferLength);
            return Math.max(20, (dataArray[index] / 255) * 100);
          });
          
          setAudioLevels(levels);
          animationRef.current = requestAnimationFrame(updateLevels);
        }
      };
      
      updateLevels();
      
    } catch (error) {
      let errorMessage = "Failed to access microphone. Please check permissions.";
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please allow microphone permissions and try again.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Audio recording not supported on this browser.";
        } else if (error.message.includes('permission')) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Recording Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error starting recording:", error);
    }
  }, [isRecording, recordingDuration, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clean up
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Reset audio levels
      setAudioLevels(new Array(12).fill(20));
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    audioLevels,
    recordingDuration,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}

// Global callback for recording completion
declare global {
  interface Window {
    audioRecordingCallback?: (recording: AudioRecording) => void;
    audioChunkCallback?: (chunk: Blob) => void;
  }
}
