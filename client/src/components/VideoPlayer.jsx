// VideoPlayer - Displays video stream
import React, { useEffect } from 'react';
import useSync from '../hooks/useSync';

const VideoPlayer = ({ videoRef, stream, isHost }) => {
  useSync(videoRef);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const handlePlay = () => {
    // Handle autoplay restrictions
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Autoplay prevented, user interaction required:', err);
      });
    }
  };

  useEffect(() => {
    // Try to play when component mounts
    handlePlay();
  }, []);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        className="video-element"
        controls={false}
        playsInline
        onClick={handlePlay}
      />
      {!isHost && (
        <div className="video-overlay">
          <p className="sync-indicator">🔄 Synced</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
