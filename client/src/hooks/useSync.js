// useSync - Playback synchronization hook
import { useEffect, useRef, useCallback } from 'react';
import { useRoom } from '../context/RoomContext';

export const useSync = (videoRef) => {
  const { playbackState, roomCode, canControl } = useRoom();
  const lastSyncTime = useRef(0);
  const syncThreshold = 0.3; // 300ms threshold for hard seek
  const minDriftForAdjustment = 0.1; // 100ms minimum drift for adjustment

  // Apply sync corrections
  const applySync = useCallback((serverTime, serverIsPlaying, serverPlaybackRate) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const currentTime = video.currentTime;
    const drift = Math.abs(currentTime - serverTime);

    // Update play/pause state
    if (serverIsPlaying && video.paused) {
      video.play().catch(err => console.log('Play error:', err));
    } else if (!serverIsPlaying && !video.paused) {
      video.pause();
    }

    // Apply time correction
    if (drift > syncThreshold) {
      // Large drift - hard seek
      video.currentTime = serverTime;
      console.log(`Hard seek: drift=${drift.toFixed(3)}s`);
    } else if (drift > minDriftForAdjustment) {
      // Small drift - adjust playback rate gradually
      if (currentTime < serverTime) {
        video.playbackRate = 1.05; // Speed up slightly
      } else {
        video.playbackRate = 0.95; // Slow down slightly
      }
      
      // Reset to normal rate after correction
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.playbackRate = serverPlaybackRate || 1.0;
        }
      }, 1000);
    } else {
      // In sync - use normal playback rate
      video.playbackRate = serverPlaybackRate || 1.0;
    }

    lastSyncTime.current = Date.now();
  }, [videoRef, syncThreshold, minDriftForAdjustment]);

  // Listen for sync updates
  useEffect(() => {
    if (!videoRef.current) return;

    const syncInterval = setInterval(() => {
      if (playbackState && !canControl()) {
        // Only apply sync for non-controlling viewers
        applySync(
          playbackState.playbackTime,
          playbackState.isPlaying,
          playbackState.playbackRate
        );
      }
    }, 200); // Check every 200ms

    return () => clearInterval(syncInterval);
  }, [playbackState, videoRef, applySync, canControl]);

  return {
    applySync
  };
};

export default useSync;
