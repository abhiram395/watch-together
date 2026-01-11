// useVideoProcessor - Hook for processing video files with FFmpeg
import { useState, useCallback, useRef } from 'react';
import { 
  analyzeVideoFile, 
  formatFileSize, 
  estimateTranscodingTime
} from '../utils/formatDetector';
import { transcodeVideo, terminateFFmpeg } from '../utils/ffmpegWorker';
import { getCachedVideo, cacheTranscodedVideo } from '../utils/videoCache';

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
    setStage('Analyzing video...');
    setError(null);
    cancelledRef.current = false;

    try {
      // Stage 1: Analyze file
      const analysis = await analyzeVideoFile(file);
      setFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        format: analysis.extension.toUpperCase()
      });

      console.log('📊 Video analysis:', analysis);

      // Stage 2: Check if native playback is supported
      if (!analysis.needsTranscoding) {
        console.log('✅ Native playback supported, no transcoding needed');
        setStage('Ready!');
        setProgress(100);
        setIsProcessing(false);
        return file; // Return original file
      }

      console.log('🔄 Transcoding required for:', file.name);

      // Stage 3: Check cache
      setStage('Checking cache...');
      setProgress(5);
      
      try {
        const cached = await getCachedVideo(file);
        if (cached) {
          console.log('✅ Found in cache!');
          setStage('Loaded from cache!');
          setProgress(100);
          setIsProcessing(false);
          return cached;
        }
      } catch (cacheError) {
        console.warn('Cache check failed:', cacheError);
        // Continue with transcoding
      }

      if (cancelledRef.current) {
        throw new Error('Processing cancelled');
      }

      // Stage 4: Estimate time
      setEstimatedTime(estimateTranscodingTime(file.size));

      // Stage 5: Transcode
      setStage('Starting conversion...');
      setProgress(10);

      const transcodedBlob = await transcodeVideo(file, ({ stage: s, percent }) => {
        if (!cancelledRef.current) {
          setStage(s);
          setProgress(percent);
        }
      });

      if (cancelledRef.current) {
        throw new Error('Processing cancelled');
      }

      // Stage 6: Cache the result
      setStage('Saving to cache...');
      setProgress(95);
      
      try {
        await cacheTranscodedVideo(file, transcodedBlob);
        console.log('✅ Cached transcoded video');
      } catch (cacheError) {
        console.warn('Failed to cache:', cacheError);
        // Continue anyway
      }

      setStage('Complete!');
      setProgress(100);
      setIsProcessing(false);

      return transcodedBlob;

    } catch (err) {
      console.error('❌ Video processing error:', err);
      setError(err.message || 'Failed to process video');
      setIsProcessing(false);
      terminateFFmpeg();
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
    cancelledRef.current = false;
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
