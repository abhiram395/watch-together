// formatDetector.js - Detect video format and codec compatibility

/**
 * Supported video formats and their browser compatibility
 */
const FORMAT_SUPPORT = {
  // Native browser support (no transcoding needed)
  native: {
    containers: ['mp4', 'webm', 'ogg'],
    videoCodecs: ['h264', 'vp8', 'vp9', 'av1'],
    audioCodecs: ['aac', 'opus', 'vorbis', 'mp3']
  },
  
  // Requires transcoding
  requiresTranscoding: {
    containers: ['mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', '3gp', 'mpeg', 'ts'],
    videoCodecs: ['hevc', 'h265', 'mpeg4', 'divx', 'xvid', 'theora'],
    audioCodecs: ['ac3', 'dts', 'flac', 'pcm']
  }
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
  const parts = filename.toLowerCase().split('.');
  return parts[parts.length - 1];
};

/**
 * Check if a video element can play a given MIME type
 */
export const canPlayType = (mimeType) => {
  const video = document.createElement('video');
  const support = video.canPlayType(mimeType);
  return support === 'probably' || support === 'maybe';
};

/**
 * Detect if a file format is natively supported by the browser
 */
export const isNativelySupported = (file) => {
  const extension = getFileExtension(file.name);
  
  // Check container support
  if (!FORMAT_SUPPORT.native.containers.includes(extension)) {
    return false;
  }
  
  // Check MIME type support
  const mimeType = file.type;
  if (mimeType) {
    return canPlayType(mimeType);
  }
  
  // Fallback: assume native support for common formats
  return ['mp4', 'webm'].includes(extension);
};

/**
 * Determine if a file needs transcoding
 */
export const needsTranscoding = (file) => {
  const extension = getFileExtension(file.name);
  
  // Check if format requires transcoding
  if (FORMAT_SUPPORT.requiresTranscoding.containers.includes(extension)) {
    return true;
  }
  
  // Check native support
  return !isNativelySupported(file);
};

/**
 * Get recommended output format for transcoding
 */
export const getRecommendedOutputFormat = () => {
  // VP9/Opus in WebM is widely supported and efficient
  if (canPlayType('video/webm; codecs="vp9,opus"')) {
    return {
      container: 'webm',
      videoCodec: 'vp9',
      audioCodec: 'opus',
      mimeType: 'video/webm'
    };
  }
  
  // Fallback to VP8/Vorbis
  if (canPlayType('video/webm; codecs="vp8,vorbis"')) {
    return {
      container: 'webm',
      videoCodec: 'vp8',
      audioCodec: 'vorbis',
      mimeType: 'video/webm'
    };
  }
  
  // Last resort: H.264/AAC in MP4
  return {
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    mimeType: 'video/mp4'
  };
};

/**
 * Analyze video file metadata
 */
export const analyzeVideoFile = async (file) => {
  const extension = getFileExtension(file.name);
  const needsTranscode = needsTranscoding(file);
  
  return {
    filename: file.name,
    size: file.size,
    type: file.type,
    extension,
    needsTranscoding: needsTranscode,
    isSupported: true, // We support all formats via transcoding
    recommendedFormat: needsTranscode ? getRecommendedOutputFormat() : null
  };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Estimate transcoding time (rough estimate based on file size)
 * Returns estimate in seconds
 */
export const estimateTranscodingTime = (fileSize) => {
  // Rough estimate: ~1MB per second of processing
  // This varies greatly based on:
  // - Video resolution and bitrate
  // - System performance
  // - Browser WebAssembly performance
  const mbSize = fileSize / (1024 * 1024);
  const baseTime = mbSize * 1; // 1 second per MB
  
  // Add 20% buffer
  return Math.ceil(baseTime * 1.2);
};

const formatDetectorAPI = {
  getFileExtension,
  canPlayType,
  isNativelySupported,
  needsTranscoding,
  getRecommendedOutputFormat,
  analyzeVideoFile,
  formatFileSize,
  estimateTranscodingTime
};

export default formatDetectorAPI;
