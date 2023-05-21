const express = require('express');
// const videoQueue = require('./jobs');
const videoQueue = require('./jobs1');
const app = express();
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const mongoClient = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoClient.connect();
const db = mongoClient.db('jobnoise');
const jobsCollection = db.collection('jobs');

const port = 4000;
app.use(cors());
app.use(express.json());

app.post('/submit-video', async (req, res) => {
    const videoLink = req.body.videoLink;
    const job = await videoQueue.add({ videoLink, status: 'new' });
    await jobsCollection.insertOne({ _id: job.id, videoLink, status: 'new' });
  
    res.json({ jobId: job.id });
  });
  

  app.get('/status/:jobId', async (req, res) => {
    const jobId = req.params.jobId;
  
    try {
      const job = await jobsCollection.findOne({ _id: jobId });
  
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
  
      const response = {
        jobId: job._id,
        status: job.status,
      };
  
      if (job.status === 'processed') {
        response.downloadUrl = job.downloadUrl; 
      }
  
      res.json(response);
    } catch (error) {
      console.error('Error retrieving job status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
