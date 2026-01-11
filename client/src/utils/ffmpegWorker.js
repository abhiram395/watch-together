// FFmpeg Worker - Robust video transcoding with proper error handling
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let isLoaded = false;
let loadPromise = null;

// Configuration
const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_CORE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

// Progress tracking constants
const PROGRESS_START = 15;
const PROGRESS_END = 90;
const PROGRESS_RANGE = PROGRESS_END - PROGRESS_START;

/**
 * Load FFmpeg with proper error handling
 */
export const loadFFmpeg = async (onProgress) => {
  if (isLoaded && ffmpeg) {
    return ffmpeg;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      console.log('🎬 Loading FFmpeg...');
      onProgress?.({ stage: 'Loading video processor...', percent: 5 });
      
      ffmpeg = new FFmpeg();
      
      // Progress logging
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      // Load from CDN
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      console.log('✅ FFmpeg loaded successfully');
      isLoaded = true;
      return ffmpeg;
      
    } catch (error) {
      console.error('❌ FFmpeg load error:', error);
      loadPromise = null;
      ffmpeg = null;
      throw new Error('Failed to load video processor. Your browser may not support this feature. Try using Chrome or Firefox, or use an MP4 file instead.');
    }
  })();

  return loadPromise;
};

/**
 * Get file extension
 */
const getExtension = (filename) => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Transcode video to browser-compatible format
 */
export const transcodeVideo = async (file, onProgress) => {
  let ff = null;
  
  try {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log('🎬 Starting transcode for:', file.name, 'Size:', fileSizeMB, 'MB');
    
    // Warn about large files
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
      console.warn('⚠️ Large file detected. Transcoding may take a long time or fail.');
    }
    
    // Load FFmpeg
    ff = await loadFFmpeg(onProgress);
    
    // Prepare file names
    const ext = getExtension(file.name);
    const inputName = `input.${ext || 'video'}`;
    const outputName = 'output.mp4';
    
    // Write input file
    onProgress?.({ stage: 'Reading video file...', percent: 10 });
    console.log('📁 Writing input file to FFmpeg...');
    
    const fileData = await fetchFile(file);
    await ff.writeFile(inputName, fileData);
    
    console.log('✅ Input file written, starting transcode...');
    onProgress?.({ stage: 'Converting video (this may take a while)...', percent: PROGRESS_START });
    
    // Set up progress tracking
    let lastProgress = PROGRESS_START;
    ff.on('progress', ({ progress }) => {
      // Map FFmpeg progress (0-1) to our progress (PROGRESS_START-PROGRESS_END)
      const percent = Math.min(PROGRESS_END, Math.round(PROGRESS_START + (progress * PROGRESS_RANGE)));
      if (percent > lastProgress) {
        lastProgress = percent;
        onProgress?.({ stage: 'Converting video...', percent });
      }
    });
    
    // FFmpeg encoding arguments - using H.264 for maximum compatibility
    const ffmpegArgs = [
      '-i', inputName,
      '-c:v', 'libx264',        // H.264 video codec (most compatible)
      '-preset', 'ultrafast',   // Fastest encoding
      '-crf', '28',             // Quality (23-28 is good for speed)
      '-c:a', 'aac',            // AAC audio
      '-b:a', '128k',           // Audio bitrate
      '-movflags', '+faststart', // Enable streaming
      '-max_muxing_queue_size', '1024', // Prevent muxing errors
      '-y',                     // Overwrite output
      outputName
    ];
    
    console.log('🎬 FFmpeg command:', ffmpegArgs.join(' '));
    
    // Run FFmpeg
    await ff.exec(ffmpegArgs);
    
    console.log('✅ Transcode complete, reading output...');
    onProgress?.({ stage: 'Finalizing...', percent: 95 });
    
    // Read output file
    const outputData = await ff.readFile(outputName);
    
    // Clean up FFmpeg files
    try {
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    
    // Create blob
    const blob = new Blob([outputData.buffer], { type: 'video/mp4' });
    console.log('✅ Output blob created:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
    
    onProgress?.({ stage: 'Complete!', percent: 100 });
    
    return blob;
    
  } catch (error) {
    console.error('❌ Transcode error:', error);
    
    // Provide helpful error messages
    let userMessage = 'Video conversion failed. ';
    
    if (error.message.includes('memory')) {
      userMessage += 'The file may be too large. Try a smaller file or use MP4 format.';
    } else if (error.message.includes('codec') || error.message.includes('decoder')) {
      userMessage += 'This video format is not supported. Please convert to MP4 using VLC or HandBrake.';
    } else if (error.message.includes('load')) {
      userMessage += 'Failed to load video processor. Try refreshing the page or use Chrome/Firefox.';
    } else {
      userMessage += 'Please try an MP4 or WebM file, or convert your video using VLC or HandBrake.';
    }
    
    throw new Error(userMessage);
  }
};

/**
 * Check if FFmpeg is loaded
 */
export const isFFmpegLoaded = () => isLoaded;

/**
 * Terminate FFmpeg instance
 */
export const terminateFFmpeg = () => {
  if (ffmpeg) {
    try {
      ffmpeg.terminate();
    } catch (e) {
      console.warn('FFmpeg terminate warning:', e);
    }
    ffmpeg = null;
    isLoaded = false;
    loadPromise = null;
  }
};

const ffmpegAPI = {
  loadFFmpeg,
  transcodeVideo,
  isFFmpegLoaded,
  terminateFFmpeg
};

export default ffmpegAPI;
