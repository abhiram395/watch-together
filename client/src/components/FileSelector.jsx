// FileSelector - Host selects video file with universal format support
import React, { useRef, useState } from 'react';
import useVideoProcessor from '../hooks/useVideoProcessor';
import TranscodingProgress from './TranscodingProgress';
import socket from '../socket';
import { SUPPORTED_VIDEO_EXTENSIONS } from '../utils/formatDetector';

// Build accept string with all extensions
const ACCEPT_STRING = `video/*,${SUPPORTED_VIDEO_EXTENSIONS.map(ext => `.${ext}`).join(',')}`;

const FileSelector = ({ onStreamReady }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [loadError, setLoadError] = useState(null);
  
  const {
    isProcessing,
    progress,
    stage,
    error,
    fileInfo,
    estimatedTime,
    processVideo,
    cancelProcessing,
    reset
  } = useVideoProcessor();

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoadError(null);

    // Validate file is a video
    const fileName = file.name.toLowerCase();
    const hasVideoExtension = SUPPORTED_VIDEO_EXTENSIONS.some(ext => fileName.endsWith(`.${ext}`));
    
    if (!file.type.startsWith('video/') && !hasVideoExtension) {
      setLoadError('Please select a valid video file');
      return;
    }

    try {
      // Notify other participants that video is being processed
      socket.emit('video:processing', { 
        filename: file.name,
        size: file.size 
      });

      // Process video (analyze, transcode if needed, cache)
      console.log('📁 Processing video file:', file.name);
      const processedFile = await processVideo(file);
      
      // Create object URL for the processed video file
      const videoUrl = URL.createObjectURL(processedFile);
      
      // Create a hidden video element to capture stream
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      videoRef.current = video;

      // Wait for video to load metadata
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout. The file may be corrupted or unsupported.'));
        }, 30000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };

        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load video. Try a different file or convert to MP4.'));
        };
      });

      // Play the video (required for captureStream)
      await video.play();
      
      // Capture stream from video element
      const stream = video.captureStream();
      
      if (!stream) {
        throw new Error('Failed to capture video stream. Your browser may not support this feature.');
      }

      console.log('✅ Stream captured successfully');
      
      // Notify participants that video is ready
      socket.emit('video:ready', { 
        filename: file.name 
      });
      
      onStreamReady(stream, video);
      
    } catch (err) {
      console.error('❌ File processing error:', err);
      setLoadError(err.message || 'Error processing video file');
      reset();
    }
  };

  const handleCancel = () => {
    cancelProcessing();
    setLoadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const dismissError = () => {
    setLoadError(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <TranscodingProgress
        isProcessing={isProcessing}
        progress={progress}
        stage={stage}
        error={error}
        fileInfo={fileInfo}
        estimatedTime={estimatedTime}
        onCancel={handleCancel}
      />
      
      <div className="file-selector">
        <div className="file-selector-content">
          <div className="file-selector-icon">🎬</div>
          <h2>Select a Video File</h2>
          <p>Choose a movie from your device to stream to your friends</p>
          
          {/* Error Display */}
          {(loadError || error) && (
            <div className="file-error">
              <span>❌ {loadError || error}</span>
              <button onClick={dismissError} className="error-dismiss">✕</button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="video-file-input"
            disabled={isProcessing}
          />
          <label 
            htmlFor="video-file-input" 
            className={`file-select-btn ${isProcessing ? 'disabled' : ''}`}
          >
            {isProcessing ? 'Processing...' : 'Choose Video File'}
          </label>
          <p className="file-hint">
            ✨ <strong>All formats supported:</strong> MP4, MKV, AVI, MOV, WebM, FLV, WMV, and more!
          </p>
          <p className="file-hint-secondary">
            MP4 and WebM play instantly. Other formats are automatically converted.
          </p>
        </div>
      </div>
    </>
  );
};

export default FileSelector;
