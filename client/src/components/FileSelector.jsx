// FileSelector - Host selects video file with universal format support
import React, { useRef } from 'react';
import useVideoProcessor from '../hooks/useVideoProcessor';
import TranscodingProgress from './TranscodingProgress';
import socket from '../socket';

const FileSelector = ({ onStreamReady }) => {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  
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

    // Validate file is a video
    const fileName = file.name.toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', '3gp', 'ogg', 'mpeg', 'ts'];
    const hasVideoExtension = videoExtensions.some(ext => fileName.endsWith(`.${ext}`));
    
    if (!file.type.startsWith('video/') && !hasVideoExtension) {
      alert('Please select a valid video file');
      return;
    }

    try {
      
      // Notify other participants that video is being processed
      socket.emit('video:processing', { 
        filename: file.name,
        size: file.size 
      });

      // Process video (analyze, transcode if needed, cache)
      console.log('Processing video file:', file.name);
      const processedFile = await processVideo(file);
      
      // Create object URL for the processed video file
      const videoUrl = URL.createObjectURL(processedFile);
      
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
            
            // Notify participants that video is ready
            socket.emit('video:ready', { 
              filename: file.name 
            });
            
            onStreamReady(stream);
          } else {
            throw new Error('Failed to capture video stream');
          }
        }).catch(err => {
          console.error('Error playing video:', err);
          throw new Error('Error playing video. Please try another file.');
        });
      });

      video.addEventListener('error', (e) => {
        console.error('Video error:', e);
        throw new Error('Error loading video file');
      });
      
    } catch (err) {
      console.error('File processing error:', err);
      alert(err.message || 'Error processing video file');
      reset();
    }
  };

  const handleCancel = () => {
    cancelProcessing();
    // Reset file input
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
            Unsupported formats will be automatically converted
          </p>
        </div>
      </div>
    </>
  );
};

export default FileSelector;
