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

  useEffect(() => {
    // Try to play when component mounts
    const handlePlay = () => {
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.log('Autoplay prevented, user interaction required:', err);
        });
      }
    };
    handlePlay();
  }, [videoRef]);

  const handleVideoClick = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Autoplay prevented, user interaction required:', err);
      });
    }
  };

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        className="video-element"
        controls={false}
        playsInline
        onClick={handleVideoClick}
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
