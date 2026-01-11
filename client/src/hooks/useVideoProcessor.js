// useVideoProcessor.js - Hook for video processing with FFmpeg

import { useState, useCallback, useRef } from 'react';
import { analyzeVideoFile, formatFileSize, estimateTranscodingTime, needsTranscoding } from '../utils/formatDetector';
import { transcodeVideo, loadFFmpeg, terminateFFmpeg } from '../utils/ffmpegWorker';
import videoCache from '../utils/videoCache';

const useVideoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const cancelledRef = useRef(false);

  const processVideo = useCallback(async (file) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    cancelledRef.current = false;

    try {
      // Stage 1: Analyze file
      setStage('Analyzing video...');
      setProgress(5);
      
      const analysis = await analyzeVideoFile(file);
      setFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        format: analysis.extension.toUpperCase()
      });

      console.log('Video analysis:', analysis);

      // Check if transcoding is needed
      if (!analysis.needsTranscoding) {
        console.log('No transcoding needed, using original file');
        setStage('Ready!');
        setProgress(100);
        setIsProcessing(false);
        return file;
      }

      // Check cache first
      setStage('Checking cache...');
      setProgress(10);
      
      const cached = await videoCache.getCachedVideo(file);
      if (cached) {
        console.log('Found in cache!');
        setStage('Loaded from cache!');
        setProgress(100);
        setIsProcessing(false);
        return cached;
      }

      if (cancelledRef.current) {
        throw new Error('Processing cancelled');
      }

      // Stage 2: Load FFmpeg
      setStage('Loading video processor...');
      setProgress(15);
      setEstimatedTime(estimateTranscodingTime(file.size));
      
      await loadFFmpeg();
      
      if (cancelledRef.current) {
        throw new Error('Processing cancelled');
      }

      // Stage 3: Transcode
      setStage('Converting video...');
      
      const outputFormat = analysis.recommendedFormat;
      console.log('Transcoding to:', outputFormat);
      
      const transcodedBlob = await transcodeVideo(
        file,
        outputFormat,
        (ffmpegProgress) => {
          // Map FFmpeg progress (0-100) to our progress (20-90)
          const mappedProgress = 20 + (ffmpegProgress * 0.7);
          setProgress(Math.min(mappedProgress, 90));
        }
      );

      if (cancelledRef.current) {
        throw new Error('Processing cancelled');
      }

      // Stage 4: Cache the result
      setStage('Saving to cache...');
      setProgress(95);
      
      await videoCache.cacheTranscodedVideo(file, transcodedBlob);
      
      setStage('Complete!');
      setProgress(100);
      setIsProcessing(false);
      
      return transcodedBlob;

    } catch (err) {
      console.error('Video processing error:', err);
      setError(err.message || 'Failed to process video');
      setIsProcessing(false);
      throw err;
    }
  }, []);

  const cancelProcessing = useCallback(() => {
    cancelledRef.current = true;
    terminateFFmpeg();
    setIsProcessing(false);
    setProgress(0);
    setStage('');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(0);
    setStage('');
    setError(null);
    setFileInfo(null);
    setEstimatedTime(0);
  }, []);

  return {
    isProcessing,
    progress,
    stage,
    error,
    fileInfo,
    estimatedTime,
    processVideo,
    cancelProcessing,
    reset
  };
};

export default useVideoProcessor;
