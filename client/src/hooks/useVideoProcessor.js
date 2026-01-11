// useVideoProcessor.js - Hook for video processing with FFmpeg

import { useState, useCallback, useRef } from 'react';
import { analyzeVideoFile, formatFileSize, estimateTranscodingTime } from '../utils/formatDetector';
import { getCachedVideo, cacheTranscodedVideo } from '../utils/videoCache';
import { transcodeVideo, loadFFmpeg } from '../utils/ffmpegWorker';

export const useVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(''); // 'analyzing', 'loading', 'transcoding', 'caching', 'complete'
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const cancelledRef = useRef(false);

  /**
   * Process video file - analyze, transcode if needed, cache result
   */
  const processVideo = useCallback(async (file) => {
    try {
      cancelledRef.current = false;
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      
      // Stage 1: Analyze file
      setStage('analyzing');
      console.log('Analyzing video file:', file.name);
      const analysis = await analyzeVideoFile(file);
      setFileInfo(analysis);
      
      // Check if transcoding is needed
      if (!analysis.needsTranscoding) {
        console.log('No transcoding needed, using file directly');
        setStage('complete');
        setProgress(100);
        setIsProcessing(false);
        return file;
      }
      
      // Stage 2: Check cache
      setStage('checking_cache');
      setProgress(5);
      console.log('Checking cache for transcoded video');
      const cachedVideo = await getCachedVideo(file);
      
      if (cachedVideo) {
        console.log('Found cached transcoded video');
        setStage('complete');
        setProgress(100);
        setIsProcessing(false);
        return cachedVideo;
      }
      
      // Stage 3: Load FFmpeg
      setStage('loading');
      setProgress(10);
      console.log('Loading FFmpeg...');
      await loadFFmpeg();
      
      if (cancelledRef.current) {
        throw new Error('Processing cancelled');
      }
      
      // Estimate transcoding time
      const estimate = estimateTranscodingTime(file.size);
      setEstimatedTime(estimate);
      
      // Stage 4: Transcode
      setStage('transcoding');
      console.log('Starting transcoding...');
      console.log(`Estimated time: ${estimate} seconds`);
      console.log(`File size: ${formatFileSize(file.size)}`);
      
      const transcodedBlob = await transcodeVideo(
        file,
        analysis.recommendedFormat,
        ({ stage: ffmpegStage, progress: ffmpegProgress }) => {
          if (cancelledRef.current) return;
          
          // Map FFmpeg progress to 10-90%
          const mappedProgress = 10 + (ffmpegProgress * 0.8);
          setProgress(Math.min(90, mappedProgress));
        }
      );
      
      if (cancelledRef.current) {
        throw new Error('Processing cancelled');
      }
      
      // Stage 5: Cache result
      setStage('caching');
      setProgress(95);
      console.log('Caching transcoded video...');
      await cacheTranscodedVideo(file, transcodedBlob);
      
      // Complete
      setStage('complete');
      setProgress(100);
      setIsProcessing(false);
      console.log('Video processing complete');
      
      return transcodedBlob;
    } catch (err) {
      console.error('Video processing error:', err);
      setError(err.message);
      setIsProcessing(false);
      setStage('error');
      throw err;
    }
  }, []);

  /**
   * Cancel ongoing processing
   */
  const cancelProcessing = useCallback(() => {
    cancelledRef.current = true;
    setIsProcessing(false);
    setStage('cancelled');
    console.log('Processing cancelled by user');
  }, []);

  /**
   * Reset processor state
   */
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setStage('');
    setError(null);
    setFileInfo(null);
    setEstimatedTime(0);
    cancelledRef.current = false;
  }, []);

  return {
    // State
    isProcessing,
    progress,
    stage,
    error,
    fileInfo,
    estimatedTime,
    
    // Actions
    processVideo,
    cancelProcessing,
    reset
  };
};

export default useVideoProcessor;
