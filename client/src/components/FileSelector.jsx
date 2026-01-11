// FileSelector - Universal video format support
import React, { useRef, useState } from 'react';
import socket from '../socket';
import { transcodeVideo, terminateFFmpeg } from '../utils/ffmpegWorker';

// Formats that browsers can play natively (no transcoding needed)
const NATIVE_FORMATS = ['mp4', 'webm', 'ogg', 'mov'];

const FileSelector = ({ onStreamReady }) => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', percent: 0 });
  const [error, setError] = useState(null);

  // Check if file can be played natively
  const canPlayNatively = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    
    // Check extension
    if (!NATIVE_FORMATS.includes(ext)) {
      return false;
    }
    
    // Check if browser can actually play it
    const video = document.createElement('video');
    const canPlay = video.canPlayType(file.type);
    return canPlay === 'probably' || canPlay === 'maybe';
  };

  // Try to load video natively
  const tryNativePlayback = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      const cleanup = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
      };

      video.onloadedmetadata = () => {
        cleanup();
        console.log('✅ Native playback supported for:', file.name);
        resolve({ video, url });
      };

      video.onerror = () => {
        cleanup();
        URL.revokeObjectURL(url);
        reject(new Error('Cannot play natively'));
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        cleanup();
        URL.revokeObjectURL(url);
        reject(new Error('Native playback timeout'));
      }, 10000);
    });
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 Selected file:', file.name, 'Type:', file.type, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    setIsProcessing(true);
    setError(null);
    setProgress({ stage: 'Analyzing video...', percent: 5 });

    try {
      // Notify others
      socket.emit('video:processing', { filename: file.name, size: file.size });

      let videoElement;
      let videoUrl;

      // Step 1: Try native playback first
      if (canPlayNatively(file)) {
        setProgress({ stage: 'Loading video...', percent: 10 });
        
        try {
          const result = await tryNativePlayback(file);
          videoElement = result.video;
          videoUrl = result.url;
          console.log('✅ Using native playback');
        } catch (e) {
          console.log('⚠️ Native playback failed, will transcode');
        }
      }

      // Step 2: If native failed, transcode
      if (!videoElement) {
        console.log('🔄 Transcoding required for:', file.name);
        setProgress({ stage: 'Preparing video converter...', percent: 10 });

        // Transcode the video
        const transcodedBlob = await transcodeVideo(file, (p) => {
          setProgress(p);
        });

        // Create video element from transcoded blob
        videoUrl = URL.createObjectURL(transcodedBlob);
        videoElement = document.createElement('video');
        videoElement.src = videoUrl;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.preload = 'auto';

        // Wait for it to load
        await new Promise((resolve, reject) => {
          videoElement.onloadedmetadata = resolve;
          videoElement.onerror = () => reject(new Error('Failed to load converted video'));
          setTimeout(() => reject(new Error('Converted video load timeout')), 30000);
        });
      }

      setProgress({ stage: 'Starting stream...', percent: 98 });

      // Play and capture stream
      await videoElement.play();
      const stream = videoElement.captureStream();

      if (!stream) {
        throw new Error('Failed to capture video stream');
      }

      console.log('✅ Stream captured successfully');

      // Notify ready
      socket.emit('video:ready', { filename: file.name });

      setProgress({ stage: 'Ready!', percent: 100 });
      setIsProcessing(false);

      // Pass stream and video element to parent
      onStreamReady(stream, videoElement);

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message || 'Failed to process video');
      setIsProcessing(false);
      terminateFFmpeg();
    }
  };

  // Cancel processing
  const handleCancel = () => {
    terminateFFmpeg();
    setIsProcessing(false);
    setProgress({ stage: '', percent: 0 });
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-selector">
      <div className="file-selector-content">
        <div className="file-selector-icon">🎬</div>
        <h2>Select a Video File</h2>
        <p>Choose any video to stream to your friends</p>

        {/* Error Message */}
        {error && (
          <div className="file-error">
            ❌ {error}
            <button onClick={() => setError(null)} className="error-dismiss">✕</button>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="processing-container">
            <div className="processing-stage">{progress.stage}</div>
            <div className="processing-bar">
              <div 
                className="processing-fill" 
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="processing-percent">{progress.percent}%</div>
            <button onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
          </div>
        )}

        {/* File Input */}
        {!isProcessing && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mkv,.avi,.flv,.wmv,.mov,.m4v,.3gp,.mpeg,.ts,.divx,.xvid"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="video-file-input"
            />
            <label htmlFor="video-file-input" className="file-select-btn">
              Choose Video File
            </label>
            <p className="file-hint">
              ✨ <strong>All formats supported:</strong> MP4, MKV, AVI, MOV, WebM, FLV, WMV, and more!
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileSelector;
