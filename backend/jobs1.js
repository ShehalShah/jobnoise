const Queue = require('bull');
const { MongoClient } = require('mongodb');
const { google } = require('googleapis');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const Redis = require('ioredis');
const path = require('path');
const util = require('util');
require('dotenv').config();
const exec = util.promisify(require('child_process').exec);
const mongoClient = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoClient.connect();
const db = mongoClient.db('jobnoise');
const jobsCollection = db.collection('jobs');

const videoQueue = new Queue('videoProcessingQueue');
const redisClient = new Redis(); 

async function processVideo(job) {
  const videoLink = job.data.videoLink;

  if (isGoogleDriveLink(videoLink)) {
    await processGoogleDriveVideo(videoLink, job);
  } else {
    await processMP4Video(videoLink, job);
  }
}

async function processGoogleDriveVideo(videoLink, job) {
  const auth = new google.auth.GoogleAuth({
    keyFile: './key/jobnoise.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  const drive = google.drive({ version: 'v3', auth });

  try {
    const fileId = extractFileId(videoLink);

    const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

    const videoFilePath = 'videos/video_temp.mp4';
    const writeStream = fs.createWriteStream(videoFilePath);
    response.data.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    await processVideoFile(videoFilePath, job);

  } catch (error) {
    console.error('Video processing error:', error);
    await jobsCollection.updateOne({ _id: job.id }, { $set: { status: 'failed' } });
  } finally {
  }
}

async function processMP4Video(videoLink, job) {
  const videoFilePath = 'videos/video_temp.mp4';
  try {
    const response = await axios.get(videoLink, { responseType: 'stream' });
    const writeStream = fs.createWriteStream(videoFilePath);
    response.data.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    await processVideoFile(videoFilePath, job);

  } catch (error) {
    console.error('Video processing error:', error);
    await jobsCollection.updateOne({ _id: job.id }, { $set: { status: 'failed' } });
  } finally {
  }
}

async function processVideoFile(videoFilePath, job) {
  try {
    const outputFileName = `output_${job.id}.mkv`;
    const outputFilePath = `videos/${outputFileName}`
    const ffmpegCommand = `ffmpeg -i ${videoFilePath} -af "highpass=200,lowpass=3000,afftdn=nf=-25" ${outputFilePath}`;

    await exec(ffmpegCommand);

    const processedVideoPath = outputFilePath;
    const formData = new FormData();
    formData.append('project_id', 'uj6hooj2ju');
    formData.append('api_password', process.env.API_PASS); 
    formData.append('file', fs.createReadStream(processedVideoPath));

    const response = await axios.post('https://upload.wistia.com', formData, {
      headers: formData.getHeaders()
    });

    const mediaId = response.data.hashed_id;

    const urlResponse = await axios.get(`https://api.wistia.com/v1/medias/${mediaId}.json`, {
      headers: {
        Authorization: `Bearer ${process.env.API_PASS}` 
      }
    });
    const downloadUrl = urlResponse.data.assets[0].url;

    await jobsCollection.updateOne({ _id: job.id }, { $set: { status: 'processed', downloadUrl } });

    // const response1 = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    // const binaryFilePath = `videos/${job.id}.bin`;
    // fs.writeFileSync(binaryFilePath, Buffer.from(response1.data), 'binary');
   
    // const convertedFileName = `converted_${job.id}.mp4`;
    // // const convertedFilePath = path.join('videos', convertedFileName);
    // const convertedFilePath = `../frontend/videos/${convertedFileName}`;
    // const ffmpegConvertCommand = `ffmpeg -f bin -i ${binaryFilePath} -c:v libx264 -b:v 2M -vf "scale=1280:720" -r 30 ${convertedFilePath}`;
    // await exec(ffmpegConvertCommand);
    // fs.unlinkSync(binaryFilePath);
  } catch (error) {
    console.error('Video processing error:', error);
    await jobsCollection.updateOne({ _id: job.id }, { $set: { status: 'failed' } });
  } finally {
    await exec(`rm -f ${videoFilePath}`);
  }
}

function isGoogleDriveLink(link) {
  return link.includes('drive.google.com');
}
function extractFileId(link) {
  const fileIdMatch = link.match(/[-\w]{25,}/);
  return fileIdMatch ? fileIdMatch[0] : null;
}

videoQueue.process(async (job) => {
  try {
    await processVideo(job);
  } catch (error) {
    console.error(`Video processing failed for job ${job.id}:`, error);
  }
});

videoQueue.on('completed', (job) => {
  console.log(`Video processing completed for job ${job.id}`);
});

videoQueue.on('failed', (job, error) => {
  console.error(`Video processing failed for job ${job.id}:`, error);
});

module.exports = videoQueue;
