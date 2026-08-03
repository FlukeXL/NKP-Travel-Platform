const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

/**
 * Reads a video file's duration in seconds using ffprobe (via
 * fluent-ffmpeg). This is the REAL server-side enforcement of the
 * "ไม่เกินคนละ 1 นาที" (max 1 minute per person) rule — the frontend
 * also blocks anything longer before upload as a UX nicety, but that
 * check is trivially bypassable (e.g. calling the API directly), so
 * this is the check that actually matters.
 */
function getVideoDurationSeconds(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration;
      if (typeof duration !== 'number' || Number.isNaN(duration)) {
        return reject(new Error('ไม่สามารถอ่านความยาววิดีโอได้'));
      }
      resolve(duration);
    });
  });
}

/** Deletes a file if it exists — used to clean up rejected uploads (too long, corrupt, etc). */
function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best-effort cleanup, ignore failures
  }
}

/**
 * Extracts a single frame (at 0.5s in, to skip any black leading
 * frame) from the uploaded video as a JPEG poster/thumbnail — shown
 * on the video card before the visitor hovers/taps to play, same
 * pattern the old Wardoo mock videos used (poster + video pair).
 */
function generateVideoPoster(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .screenshots({
        timestamps: ['0.5'],
        filename: require('path').basename(outputPath),
        folder: require('path').dirname(outputPath),
        size: '480x?',
      });
  });
}

module.exports = { getVideoDurationSeconds, safeUnlink, generateVideoPoster };
