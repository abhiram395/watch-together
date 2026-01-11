// TranscodingProgress.jsx - Display transcoding progress with cancellation

import React from 'react';
import { formatFileSize } from '../utils/formatDetector';

const TranscodingProgress = ({ 
  isProcessing, 
  progress, 
  stage, 
  error, 
  fileInfo,
  estimatedTime,
  onCancel 
}) => {
  if (!isProcessing && !error) return null;

  const getStageText = () => {
    switch (stage) {
      case 'analyzing':
        return 'Analyzing video file...';
      case 'checking_cache':
        return 'Checking cache...';
      case 'loading':
        return 'Loading video processor...';
      case 'transcoding':
        return 'Transcoding video to compatible format...';
      case 'caching':
        return 'Saving to cache...';
      case 'complete':
        return 'Processing complete!';
      case 'cancelled':
        return 'Processing cancelled';
      case 'error':
        return 'Processing failed';
      default:
        return 'Processing...';
    }
  };

  const getTimeRemaining = () => {
    if (stage !== 'transcoding' || progress <= 10) return null;
    
    // Calculate remaining time based on progress
    const progressDecimal = progress / 100;
    const elapsedRatio = Math.max(0.01, progressDecimal); // Prevent division by zero
    const remainingRatio = 1 - elapsedRatio;
    const remainingSeconds = Math.ceil((estimatedTime * remainingRatio) / elapsedRatio);
    
    if (remainingSeconds > 60) {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return `~${minutes}m ${seconds}s remaining`;
    }
    return `~${remainingSeconds}s remaining`;
  };

  return (
    <div className="transcoding-progress-overlay">
      <div className="transcoding-progress-modal">
        <div className="transcoding-header">
          <h3>🎬 Processing Video</h3>
          {fileInfo && (
            <p className="file-details">
              {fileInfo.filename} ({formatFileSize(fileInfo.size)})
            </p>
          )}
        </div>

        <div className="transcoding-body">
          {error ? (
            <div className="transcoding-error">
              <div className="error-icon">⚠️</div>
              <p className="error-message">{error}</p>
              <button 
                className="btn-primary" 
                onClick={onCancel}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="stage-text">{getStageText()}</div>
              
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progress}%` }}
                >
                  <span className="progress-text">{Math.round(progress)}%</span>
                </div>
              </div>

              {stage === 'transcoding' && (
                <div className="transcoding-info">
                  <p className="info-text">
                    Converting video to browser-compatible format (WebM/VP9)
                  </p>
                  {getTimeRemaining() && (
                    <p className="time-remaining">{getTimeRemaining()}</p>
                  )}
                  <p className="cache-notice">
                    ℹ️ This file will be cached to avoid re-processing
                  </p>
                </div>
              )}

              {stage === 'loading' && (
                <div className="transcoding-info">
                  <p className="info-text">
                    Loading FFmpeg WebAssembly module (first time only)
                  </p>
                </div>
              )}

              {stage === 'complete' && (
                <div className="transcoding-success">
                  <div className="success-icon">✓</div>
                  <p>Video ready for streaming!</p>
                </div>
              )}

              {stage !== 'complete' && stage !== 'cancelled' && (
                <button 
                  className="btn-cancel" 
                  onClick={onCancel}
                  disabled={stage === 'caching'}
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>

        <div className="transcoding-footer">
          <div className="format-support-info">
            <details>
              <summary>ℹ️ About Video Format Support</summary>
              <div className="format-details">
                <p>
                  This platform supports ALL video formats including:
                  MP4, MKV, AVI, MOV, WebM, FLV, and more.
                </p>
                <p>
                  Unsupported formats are automatically converted to 
                  browser-compatible formats using FFmpeg WebAssembly.
                </p>
                <p>
                  <strong>Note:</strong> Transcoding happens in your browser 
                  and may take a few minutes depending on file size.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscodingProgress;
