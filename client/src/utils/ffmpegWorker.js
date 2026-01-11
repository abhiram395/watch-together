// ffmpegWorker.js - FFmpeg WebAssembly transcoding utility

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Configuration
const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_CORE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

let ffmpeg = null;
let isLoaded = false;
let loadingPromise = null;

/**
 * Load FFmpeg.wasm (singleton pattern with promise)
 */
export const loadFFmpeg = async (onProgress = null) => {
  if (isLoaded && ffmpeg) {
    return ffmpeg;
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    try {
      ffmpeg = new FFmpeg();
      
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });
      
      if (onProgress) {
        ffmpeg.on('progress', ({ progress, time }) => {
          onProgress(Math.min(progress * 100, 100));
        });
      }
      
      console.log('Loading FFmpeg core...');
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      console.log('FFmpeg loaded successfully');
      isLoaded = true;
      return ffmpeg;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      loadingPromise = null;
      throw new Error(`Failed to load FFmpeg: ${error.message}`);
    }
  })();
  
  return loadingPromise;
};

/**
 * Transcode video to browser-compatible format
 */
export const transcodeVideo = async (file, outputFormat, onProgress = null) => {
  try {
    console.log('Starting transcode for:', file.name);
    
    const ffmpegInstance = await loadFFmpeg(onProgress);
    
    const inputFileName = 'input' + getExtension(file.name);
    const outputFileName = `output.${outputFormat.container}`;
    
    console.log('Writing input file to FFmpeg...');
    const fileData = await fetchFile(file);
    await ffmpegInstance.writeFile(inputFileName, fileData);
    
    console.log('Starting FFmpeg transcode...');
    
    // Use simpler, more compatible encoding parameters
    let ffmpegArgs;
    
    if (outputFormat.container === 'webm') {
      // WebM with VP8 (more compatible than VP9) and libvorbis
      ffmpegArgs = [
        '-i', inputFileName,
        '-c:v', 'libvpx',           // VP8 codec (more compatible)
        '-b:v', '1M',               // Video bitrate
        '-c:a', 'libvorbis',        // Vorbis audio
        '-b:a', '128k',             // Audio bitrate
        '-deadline', 'realtime',   // Faster encoding
        '-cpu-used', '4',           // Speed vs quality tradeoff
        '-y',                       // Overwrite output
        outputFileName
      ];
    } else {
      // MP4 with H.264 and AAC
      ffmpegArgs = [
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',     // Fastest encoding
        '-crf', '28',               // Quality (lower = better, 28 is ok)
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',  // Enable streaming
        '-y',
        outputFileName
      ];
    }
    
    console.log('FFmpeg args:', ffmpegArgs.join(' '));
    
    await ffmpegInstance.exec(ffmpegArgs);
    
    console.log('Reading output file...');
    const outputData = await ffmpegInstance.readFile(outputFileName);
    
    // Cleanup
    try {
      await ffmpegInstance.deleteFile(inputFileName);
      await ffmpegInstance.deleteFile(outputFileName);
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    
    console.log('Transcode complete!');
    
    return new Blob([outputData.buffer], { type: outputFormat.mimeType });
    
  } catch (error) {
    console.error('Transcode error:', error);
    throw new Error(`Transcoding failed: ${error.message}`);
  }
};

const getExtension = (filename) => {
  const parts = filename.split('.');
  return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '';
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
      console.warn('FFmpeg termination warning:', e);
    }
    ffmpeg = null;
    isLoaded = false;
    loadingPromise = null;
  }
};

export default {
  loadFFmpeg,
  transcodeVideo,
  isFFmpegLoaded,
  terminateFFmpeg
};
