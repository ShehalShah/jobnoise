import React, { useState } from 'react';
import axios from 'axios';
import { FaCheck, FaDownload, FaSpinner } from 'react-icons/fa';
import '../input.css';

const VideoProcessingForm = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [showVideo, setShowVideo] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:4000/submit-video', { videoLink: videoUrl });
      const { jobId } = response.data;
      setJobId(jobId);
      setStatus('queued up');
    } catch (error) {
      console.error('Error submitting video for processing:', error);
      // Handle error state
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!jobId) return;

    try {
      const response = await axios.get(`http://localhost:4000/status/${jobId}`);
      const { status, downloadUrl } = response.data;
      setStatus(status);
      setDownloadUrl(downloadUrl);

      // if (status === 'processed') {
      //   setShowVideo(true);
      // }
    } catch (error) {
      setStatus('failed');
      console.error('Error checking job status:', error);

    }
  };

  const handleViewVideo = () => {
    setShowVideo(true);
  };

  const handleGoBack = () => {
    setShowVideo(false);
    setVideoUrl('');
    setJobId('');
    setStatus('');
    setDownloadUrl('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      {!showVideo ? (
        <>
          <h1 className="text-3xl font-bold mb-8">Video Processing App</h1>
          <div className="max-w-md w-full bg-blue-200 rounded-lg shadow">
            <form onSubmit={handleSubmit} className="p-6">
              <input
                type="text"
                placeholder="Enter video URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-4 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              />
              <input
                type="text"
                placeholder="Job ID"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-4 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-500 text-white py-2 px-4 rounded-lg w-full hover:bg-blue-600 flex items-center justify-center"
              >
                {isLoading ? 'Processing...' : 'Submit'}
              </button>
            </form>
            {jobId && (
              <div className="p-6 border-t border-gray-700">
                <p className="text-gray-800 mb-2">Job ID: {jobId}</p>
                <button
                  onClick={handleCheckStatus}
                  className="bg-green-500 text-white py-2 px-4 rounded-lg w-full hover:bg-green-600 flex items-center justify-center"
                >
                  {status === 'processed' ? (
                    <FaCheck className="mr-2" />
                  ) : (
                    <FaSpinner className="animate-spin mr-2" />
                  )}
                  {status === 'processed' ? 'Processed' : 'Check Status'}
                </button>
                <p className="text-gray-800 mt-2">Status: {status}</p>
                {status === 'processed' && (
                  <>
                    <button
                      onClick={handleViewVideo}
                      className="block bg-purple-500 text-white py-2 px-4 rounded-lg w-full mt-2 hover:bg-purple-600 flex items-center justify-center"
                    >
                      View Video
                    </button>
                    <a
                      href={downloadUrl}
                      download
                      className="block bg-purple-500 text-white py-2 px-4 rounded-lg w-full mt-2 hover:bg-purple-600 flex items-center justify-center"
                    >
                      <FaDownload className="mr-2" />
                      Download
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="max-w-md w-full bg-blue-200 rounded-lg shadow">
          <div className="p-6">
            <video src={downloadUrl} controls className="w-full" />
            <button
              onClick={handleGoBack}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg w-full mt-2 hover:bg-blue-600 flex items-center justify-center"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoProcessingForm;
