// FileSelector - Host selects video file
import React, { useRef } from 'react';

const FileSelector = ({ onStreamReady }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file');
      return;
    }

    // Create object URL for the video file
    const videoUrl = URL.createObjectURL(file);
    
    // Create a hidden video element to capture stream
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true; // Mute to prevent audio feedback during capture
    video.loop = false;
    
    videoRef.current = video;

    // Wait for video to load metadata
    video.addEventListener('loadedmetadata', () => {
      // Play the video (required for captureStream)
      video.play().then(() => {
        // Capture stream from video element
        const stream = video.captureStream();
        
        if (stream) {
          console.log('Stream captured successfully');
          onStreamReady(stream);
        } else {
          alert('Failed to capture video stream');
        }
      }).catch(err => {
        console.error('Error playing video:', err);
        alert('Error playing video. Please try another file.');
      });
    });

    video.addEventListener('error', (e) => {
      console.error('Video error:', e);
      alert('Error loading video file');
    });
  };

  return (
    <div className="file-selector">
      <div className="file-selector-content">
        <div className="file-selector-icon">📁</div>
        <h2>Select a Video File</h2>
        <p>Choose a movie from your device to stream to your friends</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="video-file-input"
        />
        <label htmlFor="video-file-input" className="file-select-btn">
          Choose Video File
        </label>
        <p className="file-hint">Supported formats: MP4, WebM, MKV, AVI</p>
      </div>
    </div>
  );
};

export default FileSelector;
