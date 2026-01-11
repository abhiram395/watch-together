// ControlBar - Video playback controls
import React, { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import socket from '../socket';

const ControlBar = ({ videoRef }) => {
  const { roomCode, canControl, playbackState } = useRoom();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef]);

  const handlePlayPause = () => {
    if (!canControl()) {
      alert('You do not have permission to control playback');
      return;
    }

    if (videoRef.current) {
      const video = videoRef.current;
      if (video.paused) {
        socket.emit('playback:play', {
          roomCode,
          playbackTime: video.currentTime
        });
      } else {
        socket.emit('playback:pause', {
          roomCode,
          playbackTime: video.currentTime
        });
      }
    }
  };

  const handleSeek = (e) => {
    if (!canControl()) {
      alert('You do not have permission to control playback');
      return;
    }

    const seekBar = e.currentTarget;
    const rect = seekBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const seekTime = pos * duration;

    socket.emit('playback:seek', {
      roomCode,
      playbackTime: seekTime
    });

    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="control-bar">
      <div className="progress-bar" onClick={handleSeek}>
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        <div className="progress-handle" style={{ left: `${progress}%` }}></div>
      </div>
      
      <div className="controls">
        <div className="controls-left">
          <button
            className="control-btn"
            onClick={handlePlayPause}
            disabled={!canControl() && !isPlaying}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="controls-right">
          <button className="control-btn" onClick={toggleMute}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
