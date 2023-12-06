const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const axios = require('axios');
const fs = require('fs');

async function downloadAndMergeSongs(urls, outputFileName) {
  try {
    const downloadedFiles = await Promise.all(
      urls.map(async (url, index) => {
        // const curl = `${process.env.downloadAndMergeSongs}/${url}`
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const fileName = `song_${index + 1}.mp3`;
        fs.writeFileSync(fileName, Buffer.from(response.data));
        return fileName;
      })
    );

    console.log(downloadedFiles);

    // Merge the downloaded files
    await new Promise((resolve, reject) => {
      const mergedFilePath = outputFileName || 'merged_song.mp3';
      const ffmpegIntence = ffmpeg()
        // ffmpegIntence.input(downloadedFiles[0])
        // .input(downloadedFiles[1])
        // .input(downloadedFiles[2])
        downloadedFiles.forEach(filePath => ffmpegIntence.input(filePath));

        ffmpegIntence
        .on('end', () => {
          console.log('Merging complete!');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error merging songs:', err);
          reject(err);
        })
        .mergeToFile(mergedFilePath, './temp');
    });

    downloadedFiles.forEach(path => {
      fs.unlink(path, (err) => {
        if (err) {
          console.error(`Error deleting file: ${err}`);
        } else {
          console.log(`File ${path} has been deleted successfully`);
        }
      });
    });
    

    return true;
  } catch (error) {
    console.error('Error:', error.message || error);
    return false;
  }
}


module.exports = downloadAndMergeSongs;

// Example usage
// const songUrls = [
//   'http://localhost:3000/song1.mp3',
//   'http://localhost:3000/song1.mp3',
//   'http://localhost:3000/song1.mp3',
// ];

// downloadAndMergeSongs(songUrls, 'output_song.mp3');
