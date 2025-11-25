import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/audio-utils";
import { motion } from "framer-motion";

interface AudioControlsProps {
  audioUrl?: string;
  autoPlay?: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
  className?: string;
}

export function AudioControls({ 
  audioUrl,
  autoPlay = false,
  onPlaybackChange,
  className = ""
}: AudioControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([85]);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAttemptedRef = useRef(false);

  // Initialize audio element on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = volume[0] / 100;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setAudioLoaded(true);
      console.log('✅ Audio metadata loaded, duration:', audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlaybackChange?.(false);
    };
    
    const handleError = (e: any) => {
      console.error('❌ Audio error:', e);
      setAudioError('Failed to load audio');
      setAudioLoaded(false);
      setIsPlaying(false);
      onPlaybackChange?.(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlaybackChange?.(true);
    };

    const handlePause = () => {
      if (audio.currentTime < audio.duration) {
        setIsPlaying(false);
        onPlaybackChange?.(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [onPlaybackChange]);

  // Update audio source when URL changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (audioUrl) {
      console.log('🎵 Setting audio source:', audioUrl.substring(0, 50) + '...');
      audioRef.current.src = audioUrl;
      setAudioError(null);
      setAudioLoaded(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      playAttemptedRef.current = false;
    }
  }, [audioUrl]);

  // Auto-play when audio is loaded
  useEffect(() => {
    if (!audioRef.current || !audioLoaded || !autoPlay || playAttemptedRef.current) return;

    playAttemptedRef.current = true;
    
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('⚠️ Auto-play prevented:', error);
        // Browser blocked autoplay, but user can still click play
      });
    }
  }, [audioLoaded, autoPlay]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
    }
  }, [volume, isMuted]);

  const togglePlayback = async () => {
    if (!audioRef.current || !audioLoaded) {
      console.warn('⚠️ Audio not ready for playback');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }
    } catch (error) {
      console.error('❌ Playback error:', error);
      setAudioError('Playback failed');
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isButtonDisabled = !audioUrl || audioError !== null;

  return (
    <div className={`bg-battle-gray rounded-xl p-6 border border-gray-700 ${className}`}>
      <h3 className="font-orbitron font-bold text-lg mb-4 text-accent-red">
        <Volume2 className="inline mr-2" size={20} />
        AI Response Audio
      </h3>

      {/* Status Display */}
      <div className="bg-secondary-dark rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-400 mb-2">Status:</div>
        <div className="font-semibold text-accent-gold mb-3">
          {audioError ? (
            <span className="text-red-400">❌ {audioError}</span>
          ) : audioUrl ? (
            audioLoaded ? (
              <span className="text-green-400">✅ Ready to play</span>
            ) : (
              <span className="text-yellow-400">⏳ Loading audio...</span>
            )
          ) : (
            <span className="text-gray-400">ℹ️ No audio available</span>
          )}
        </div>

        {/* Progress Bar */}
        {audioUrl && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>{formatDuration(Math.floor(currentTime))}</span>
              <span>{formatDuration(Math.floor(duration))}</span>
            </div>
            <div
              className="w-full h-2 bg-gray-600 rounded-full cursor-pointer hover:bg-gray-500 transition"
              onClick={handleProgressClick}
            >
              <motion.div
                className="h-2 bg-gradient-to-r from-accent-red to-accent-gold rounded-full"
                style={{ width: `${progress}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          onClick={togglePlayback}
          disabled={isButtonDisabled}
          className={`${
            isButtonDisabled
              ? "bg-gray-600 cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-accent-red to-red-600 hover:from-red-500 hover:to-red-700 transition transform hover:scale-105"
          } w-16 h-16 rounded-full flex items-center justify-center`}
        >
          {isPlaying ? (
            <Pause className="text-white" size={28} />
          ) : (
            <Play className="text-white ml-1" size={28} />
          )}
        </Button>
      </div>

      {/* Volume Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Volume</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="p-1 hover:bg-gray-600"
          >
            {isMuted ? (
              <VolumeX className="text-gray-400" size={16} />
            ) : (
              <Volume2 className="text-accent-blue" size={16} />
            )}
          </Button>
        </div>
        <Slider
          value={volume}
          onValueChange={handleVolumeChange}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="text-xs text-gray-400 text-right">{volume[0]}%</div>
      </div>
    </div>
  );
}
