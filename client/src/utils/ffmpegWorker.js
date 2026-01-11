// FFmpeg Worker - Robust video transcoding with proper error handling
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;
let isLoaded = false;
let loadPromise = null;

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
      
      ffmpeg = new FFmpeg();
      
      // Progress logging
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg Log]', message);
      });

      // Load from CDN with proper URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      console.log('✅ FFmpeg loaded successfully');
      isLoaded = true;
      return ffmpeg;
      
    } catch (error) {
      console.error('❌ FFmpeg load error:', error);
      loadPromise = null;
      ffmpeg = null;
      throw new Error('Failed to load video processor. Please refresh and try again.');
    }
  })();

  return loadPromise;
};

/**
 * Transcode video to browser-compatible format
 */
export const transcodeVideo = async (file, onProgress) => {
  try {
    console.log('🎬 Starting transcode for:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Load FFmpeg
    onProgress?.({ stage: 'Loading video processor...', percent: 5 });
    const ff = await loadFFmpeg();
    
    // Get file extension
    const ext = file.name.split('.').pop().toLowerCase();
    const inputName = `input.${ext}`;
    const outputName = 'output.mp4'; // MP4 is most compatible
    
    // Write input file
    onProgress?.({ stage: 'Reading video file...', percent: 10 });
    console.log('📁 Writing input file to FFmpeg...');
    
    const fileData = await fetchFile(file);
    await ff.writeFile(inputName, fileData);
    
    console.log('✅ Input file written, starting transcode...');
    onProgress?.({ stage: 'Converting video (this may take a while)...', percent: 15 });
    
    // Set up progress tracking
    let lastProgress = 15;
    ff.on('progress', ({ progress }) => {
      // Map FFmpeg progress (0-1) to our progress (15-90)
      const percent = Math.round(15 + (progress * 75));
      if (percent > lastProgress) {
        lastProgress = percent;
        onProgress?.({ stage: 'Converting video...', percent });
      }
    });
    
    // Use simple, reliable encoding settings
    // - libx264: Most compatible video codec
    // - aac: Most compatible audio codec  
    // - ultrafast preset: Fastest encoding
    // - crf 28: Reasonable quality/speed balance
    const ffmpegArgs = [
      '-i', inputName,
      '-c:v', 'libx264',      // H.264 video codec (most compatible)
      '-preset', 'ultrafast', // Fastest encoding
      '-crf', '28',           // Quality (lower = better, 28 is fast)
      '-c:a', 'aac',          // AAC audio
      '-b:a', '128k',         // Audio bitrate
      '-movflags', '+faststart', // Enable streaming
      '-y',                   // Overwrite output
      outputName
    ];
    
    console.log('🎬 FFmpeg command:', ffmpegArgs.join(' '));
    
    // Run FFmpeg
    await ff.exec(ffmpegArgs);
    
    console.log('✅ Transcode complete, reading output...');
    onProgress?.({ stage: 'Finalizing...', percent: 95 });
    
    // Read output file
    const outputData = await ff.readFile(outputName);
    
    // Clean up
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
    throw new Error(`Video conversion failed: ${error.message}`);
  }
};

/**
 * Check if FFmpeg is loaded
 */
export const isFFmpegLoaded = () => isLoaded;

/**
 * Terminate FFmpeg
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
