// VideoPlayer - Netflix-style video player with VLC features
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRoom } from '../context/RoomContext';
import socket from '../socket';

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const VideoPlayer = ({ videoRef, stream, isHost }) => {
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Subtitle state
  const [subtitles, setSubtitles] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  // const [subtitleSettings, setSubtitleSettings] = useState({
  //   fontSize: 'medium',
  //   color: 'white',
  //   background: 'semi-transparent',
  //   position: 'bottom'
  // });
  
  // Audio tracks state
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(0);
  
  // Settings menu state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('speed');
  
  const { roomCode, canControl } = useRoom();
  const controlsTimeoutRef = useRef(null);

  // Auto-hide controls
  const hideControlsAfterDelay = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Mouse movement handler
  const handleMouseMove = useCallback(() => {
    hideControlsAfterDelay();
  }, [hideControlsAfterDelay]);

  // Set stream
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // Detect audio tracks
      if (video.audioTracks && video.audioTracks.length > 0) {
        const tracks = Array.from(video.audioTracks).map((track, i) => ({
          id: i,
          label: track.label || `Track ${i + 1}`,
          language: track.language || 'unknown'
        }));
        setAudioTracks(tracks);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoRef]);

  // Playback controls
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !canControl()) return;

    if (video.paused) {
      video.play();
      socket.emit('playback:play', { roomCode, playbackTime: video.currentTime });
    } else {
      video.pause();
      socket.emit('playback:pause', { roomCode, playbackTime: video.currentTime });
    }
  }, [roomCode, canControl, videoRef]);

  const seek = useCallback((time) => {
    const video = videoRef.current;
    if (!video || !canControl()) return;

    const newTime = Math.max(0, Math.min(duration, time));
    video.currentTime = newTime;
    socket.emit('playback:seek', { roomCode, playbackTime: newTime });
  }, [duration, roomCode, canControl, videoRef]);

  const changeSpeed = useCallback((direction) => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const newIndex = Math.max(0, Math.min(PLAYBACK_SPEEDS.length - 1, currentIndex + direction));
    const newSpeed = PLAYBACK_SPEEDS[newIndex];
    setPlaybackSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
    // Sync speed with other viewers
    socket.emit('playback:speed', { roomCode, speed: newSpeed });
  }, [playbackSpeed, roomCode, videoRef]);

  const setSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    socket.emit('playback:speed', { roomCode, speed });
  }, [roomCode, videoRef]);

  const toggleMute = useCallback(() => {
    setIsMuted(m => !m);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Subtitle handling
  const loadSubtitle = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      // Parse SRT/VTT content
      const blob = new Blob([content], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      setSubtitles(prev => [...prev, { 
        id: Date.now(), 
        name: file.name, 
        url,
        active: false 
      }]);
    };
    reader.readAsText(file);
  }, []);

  const toggleSubtitles = useCallback(() => {
    if (activeSubtitle) {
      setActiveSubtitle(null);
    } else if (subtitles.length > 0) {
      setActiveSubtitle(subtitles[0].id);
    }
  }, [activeSubtitle, subtitles]);

  // Audio track switching
  const switchAudioTrack = useCallback((trackId) => {
    const video = videoRef.current;
    if (!video || !video.audioTracks) return;

    for (let i = 0; i < video.audioTracks.length; i++) {
      video.audioTracks[i].enabled = (i === trackId);
    }
    setActiveAudioTrack(trackId);
    socket.emit('playback:audioTrack', { roomCode, trackId });
  }, [roomCode, videoRef]);

  // Format time
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!canControl()) return;
      
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(v => Math.min(1, v + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(v => Math.max(0, v - 0.1));
          break;
        case 'arrowleft':
          e.preventDefault();
          seek(currentTime - 5);
          break;
        case 'arrowright':
          e.preventDefault();
          seek(currentTime + 5);
          break;
        case 'j':
          e.preventDefault();
          seek(currentTime - 10);
          break;
        case 'l':
          e.preventDefault();
          seek(currentTime + 10);
          break;
        case ',':
        case '<':
          e.preventDefault();
          changeSpeed(-1);
          break;
        case '.':
        case '>':
          e.preventDefault();
          changeSpeed(1);
          break;
        case 'c':
          e.preventDefault();
          toggleSubtitles();
          break;
        default:
          // Number keys 0-9 for seeking
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const percent = parseInt(e.key) / 10;
            seek(duration * percent);
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, canControl, videoRef, togglePlay, toggleFullscreen, toggleMute, seek, changeSpeed, toggleSubtitles]);

  // Socket event listeners for syncing from other users
  useEffect(() => {
    const handleSpeedSync = ({ speed }) => {
      setPlaybackSpeed(speed);
      if (videoRef.current) {
        videoRef.current.playbackRate = speed;
      }
    };

    const handleAudioTrackSync = ({ trackId }) => {
      const video = videoRef.current;
      if (!video || !video.audioTracks) return;
      
      for (let i = 0; i < video.audioTracks.length; i++) {
        video.audioTracks[i].enabled = (i === trackId);
      }
      setActiveAudioTrack(trackId);
    };

    const handleSubtitleSync = ({ subtitleId }) => {
      setActiveSubtitle(subtitleId);
    };

    socket.on('playback:speed', handleSpeedSync);
    socket.on('playback:audioTrack', handleAudioTrackSync);
    socket.on('playback:subtitle', handleSubtitleSync);

    return () => {
      socket.off('playback:speed', handleSpeedSync);
      socket.off('playback:audioTrack', handleAudioTrackSync);
      socket.off('playback:subtitle', handleSubtitleSync);
    };
  }, [videoRef]);

  // Apply volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, videoRef]);

  return (
    <div 
      ref={containerRef}
      className={`video-player-container ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="video-element"
        playsInline
      >
        {activeSubtitle && subtitles.find(s => s.id === activeSubtitle) && (
          <track 
            kind="subtitles" 
            src={subtitles.find(s => s.id === activeSubtitle).url}
            default
          />
        )}
      </video>

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="buffering-overlay">
          <div className="buffering-spinner"></div>
        </div>
      )}

      {/* Click to Play/Pause */}
      <div className="video-click-area" onClick={togglePlay} />

      {/* Controls Overlay */}
      <div className={`video-controls ${showControls ? 'visible' : 'hidden'}`}>
        {/* Progress Bar */}
        <div className="progress-container">
          <div 
            className="progress-bar-track"
            onClick={(e) => {
              if (!canControl()) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              seek(duration * percent);
            }}
          >
            <div 
              className="progress-fill" 
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            />
            <div 
              className="progress-handle"
              style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
            />
          </div>
          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span> / </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="controls-row">
          <div className="controls-left">
            {/* Play/Pause */}
            <button className="control-btn" onClick={togglePlay} title={isPlaying ? 'Pause (K)' : 'Play (K)'}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            {/* Skip Backward */}
            <button className="control-btn" onClick={() => seek(currentTime - 10)} title="Rewind 10s (J)">
              ⏪
            </button>

            {/* Skip Forward */}
            <button className="control-btn" onClick={() => seek(currentTime + 10)} title="Forward 10s (L)">
              ⏩
            </button>

            {/* Volume */}
            <div className="volume-control">
              <button className="control-btn" onClick={toggleMute} title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
                {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
              </button>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
              />
            </div>
          </div>

          <div className="controls-right">
            {/* Speed */}
            <div className="speed-control">
              <button 
                className="control-btn speed-btn" 
                onClick={() => {
                  setShowSettings(s => !s);
                  setSettingsTab('speed');
                }}
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>
            </div>

            {/* Subtitles */}
            <button 
              className={`control-btn ${activeSubtitle ? 'active' : ''}`}
              onClick={() => {
                setShowSettings(s => !s);
                setSettingsTab('subtitles');
              }}
              title="Subtitles (C)"
            >
              CC
            </button>

            {/* Settings */}
            <button 
              className="control-btn"
              onClick={() => setShowSettings(s => !s)}
              title="Settings"
            >
              ⚙️
            </button>

            {/* Picture in Picture */}
            <button 
              className="control-btn"
              onClick={() => {
                if (videoRef.current && videoRef.current.requestPictureInPicture) {
                  videoRef.current.requestPictureInPicture();
                }
              }}
              title="Picture in Picture"
            >
              📺
            </button>

            {/* Fullscreen */}
            <button className="control-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>

        {/* Settings Menu */}
        {showSettings && (
          <div className="settings-menu">
            <div className="settings-tabs">
              <button 
                className={settingsTab === 'speed' ? 'active' : ''} 
                onClick={() => setSettingsTab('speed')}
              >
                Speed
              </button>
              <button 
                className={settingsTab === 'subtitles' ? 'active' : ''} 
                onClick={() => setSettingsTab('subtitles')}
              >
                Subtitles
              </button>
              <button 
                className={settingsTab === 'audio' ? 'active' : ''} 
                onClick={() => setSettingsTab('audio')}
              >
                Audio
              </button>
            </div>

            <div className="settings-content">
              {settingsTab === 'speed' && (
                <div className="speed-options">
                  {PLAYBACK_SPEEDS.map(speed => (
                    <button
                      key={speed}
                      className={playbackSpeed === speed ? 'active' : ''}
                      onClick={() => { setSpeed(speed); setShowSettings(false); }}
                    >
                      {speed}x {speed === 1 && '(Normal)'}
                    </button>
                  ))}
                </div>
              )}

              {settingsTab === 'subtitles' && (
                <div className="subtitle-options">
                  <button
                    className={!activeSubtitle ? 'active' : ''}
                    onClick={() => setActiveSubtitle(null)}
                  >
                    Off
                  </button>
                  {subtitles.map(sub => (
                    <button
                      key={sub.id}
                      className={activeSubtitle === sub.id ? 'active' : ''}
                      onClick={() => setActiveSubtitle(sub.id)}
                    >
                      {sub.name}
                    </button>
                  ))}
                  <div className="subtitle-upload">
                    <label>
                      + Add Subtitle File
                      <input
                        type="file"
                        accept=".srt,.vtt,.ass,.sub"
                        onChange={(e) => e.target.files[0] && loadSubtitle(e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {settingsTab === 'audio' && (
                <div className="audio-options">
                  {audioTracks.length > 0 ? (
                    audioTracks.map(track => (
                      <button
                        key={track.id}
                        className={activeAudioTrack === track.id ? 'active' : ''}
                        onClick={() => switchAudioTrack(track.id)}
                      >
                        {track.label} ({track.language})
                      </button>
                    ))
                  ) : (
                    <p>No additional audio tracks</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Speed indicator popup */}
      {playbackSpeed !== 1 && (
        <div className="speed-indicator">
          {playbackSpeed}x
        </div>
      )}

      {/* Sync indicator for non-host */}
      {!isHost && (
        <div className="video-overlay">
          <p className="sync-indicator">🔄 Synced</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
