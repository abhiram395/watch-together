// ffmpegWorker.js - FFmpeg WebAssembly transcoding utility

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = null;
let isLoading = false;
let isLoaded = false;

/**
 * Load FFmpeg WebAssembly
 */
export const loadFFmpeg = async (onProgress) => {
  if (isLoaded) return ffmpegInstance;
  if (isLoading) {
    // Wait for loading to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return ffmpegInstance;
  }
  
  try {
    isLoading = true;
    ffmpegInstance = new FFmpeg();
    
    // Set up progress listener
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress, time }) => {
        onProgress({ 
          progress: Math.round(progress * 100),
          time 
        });
      });
    }
    
    // Set up log listener for debugging
    ffmpegInstance.on('log', ({ message }) => {
      console.log('[FFmpeg]:', message);
    });
    
    // Load FFmpeg core
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    isLoaded = true;
    isLoading = false;
    console.log('FFmpeg loaded successfully');
    return ffmpegInstance;
  } catch (error) {
    isLoading = false;
    isLoaded = false;
    console.error('Failed to load FFmpeg:', error);
    throw error;
  }
};

/**
 * Transcode video to browser-compatible format
 */
export const transcodeVideo = async (file, options = {}, progressCallback) => {
  try {
    // Load FFmpeg if not already loaded
    const ffmpeg = await loadFFmpeg(progressCallback);
    
    console.log('Starting transcoding:', file.name);
    progressCallback?.({ stage: 'loading', progress: 0 });
    
    // Write input file to FFmpeg file system
    await ffmpeg.writeFile('input', await fetchFile(file));
    progressCallback?.({ stage: 'processing', progress: 5 });
    
    // Determine output format
    const outputFormat = options.format || 'webm';
    const videoCodec = options.videoCodec || 'libvpx-vp9';
    const audioCodec = options.audioCodec || 'libopus';
    const outputFile = `output.${outputFormat}`;
    
    // FFmpeg transcoding arguments
    // Using faster presets for real-time transcoding
    const args = [
      '-i', 'input',
      '-c:v', videoCodec,
      '-b:v', '2M', // Video bitrate
      '-c:a', audioCodec,
      '-b:a', '128k', // Audio bitrate
      '-cpu-used', '5', // Faster encoding (0=slowest, 5=faster)
      '-deadline', 'realtime', // Real-time encoding
      '-row-mt', '1', // Enable row-based multithreading
      outputFile
    ];
    
    console.log('FFmpeg command:', args.join(' '));
    progressCallback?.({ stage: 'processing', progress: 10 });
    
    // Execute transcoding
    await ffmpeg.exec(args);
    progressCallback?.({ stage: 'processing', progress: 90 });
    
    // Read output file
    const data = await ffmpeg.readFile(outputFile);
    progressCallback?.({ stage: 'finalizing', progress: 95 });
    
    // Clean up
    await ffmpeg.deleteFile('input');
    await ffmpeg.deleteFile(outputFile);
    
    // Create blob from output
    const blob = new Blob([data.buffer], { 
      type: outputFormat === 'webm' ? 'video/webm' : 'video/mp4' 
    });
    
    progressCallback?.({ stage: 'complete', progress: 100 });
    console.log('Transcoding complete:', blob.size, 'bytes');
    
    return blob;
  } catch (error) {
    console.error('Transcoding error:', error);
    progressCallback?.({ stage: 'error', progress: 0, error: error.message });
    throw error;
  }
};

/**
 * Get video metadata using FFprobe (via FFmpeg)
 */
export const getVideoMetadata = async (file) => {
  try {
    const ffmpeg = await loadFFmpeg();
    
    // Write input file
    await ffmpeg.writeFile('probe_input', await fetchFile(file));
    
    // Use FFmpeg to get basic info (duration, resolution)
    // Note: FFmpeg.wasm doesn't include ffprobe, so we use basic FFmpeg output parsing
    await ffmpeg.exec(['-i', 'probe_input', '-f', 'null', '-']);
    
    // Clean up
    await ffmpeg.deleteFile('probe_input');
    
    // Return basic metadata
    // In a real implementation, we'd parse FFmpeg output
    return {
      filename: file.name,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error getting metadata:', error);
    return {
      filename: file.name,
      size: file.size,
      type: file.type
    };
  }
};

/**
 * Check if FFmpeg is loaded
 */
export const isFFmpegLoaded = () => isLoaded;

/**
 * Unload FFmpeg (free memory)
 */
export const unloadFFmpeg = () => {
  if (ffmpegInstance) {
    ffmpegInstance = null;
    isLoaded = false;
    console.log('FFmpeg unloaded');
  }
};

const ffmpegAPI = {
  loadFFmpeg,
  transcodeVideo,
  getVideoMetadata,
  isFFmpegLoaded,
  unloadFFmpeg
};

export default ffmpegAPI;
