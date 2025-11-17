const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Try to load credentials from JSON file if env vars not set (for local testing)
let clientId, clientSecret;
if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
  try {
    const clientSecretFiles = fs.readdirSync(path.join(__dirname, '..'))
      .filter(file => file.startsWith('client_secret') && file.endsWith('.json'));
    
    if (clientSecretFiles.length > 0) {
      const credsPath = path.join(__dirname, '..', clientSecretFiles[0]);
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      clientId = creds.web?.client_id || creds.installed?.client_id;
      clientSecret = creds.web?.client_secret || creds.installed?.client_secret;
      console.log('Loaded credentials from JSON file');
    }
  } catch (error) {
    console.warn('Could not load credentials from JSON file:', error.message);
  }
}

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || clientId;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || clientSecret;
const YOUTUBE_REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;
const YOUTUBE_ACCESS_TOKEN = process.env.YOUTUBE_ACCESS_TOKEN;

async function searchPixabay() {
  const url = 'https://pixabay.com/api/videos';
  const params = {
    key: PIXABAY_API_KEY,
    q: 'funny dogs',
    safesearch: 'true',
    lang: 'de',
    orientation: 'vertical'
  };

  const response = await axios.get(url, { params });
  return response.data;
}

function selectRandomVideo(data) {
  const hits = data.hits;

  if (!hits || hits.length === 0) {
    throw new Error('No videos found');
  }

  // Filter for videos that are primarily vertical
  const verticalHits = hits.filter(hit => {
    if (hit.videos) {
      for (const key in hit.videos) {
        if (hit.videos[key] && hit.videos[key].width && hit.videos[key].height) {
          if (hit.videos[key].height > hit.videos[key].width) {
            return true;
          }
        }
      }
    }
    return false;
  });

  const videosToProcess = verticalHits.length > 0 ? verticalHits : hits;

  if (videosToProcess.length === 0) {
    throw new Error('No suitable videos found');
  }

  // Pick a random video
  const randomIndex = Math.floor(Math.random() * videosToProcess.length);
  const selectedHit = videosToProcess[randomIndex];

  let downloadUrl = null;
  let videoFileKey = null;

  // Prioritize vertical formats, then quality
  const sortedVideoFiles = Object.keys(selectedHit.videos)
    .filter(key => selectedHit.videos[key] && selectedHit.videos[key].url)
    .sort((a, b) => {
      const videoA = selectedHit.videos[a];
      const videoB = selectedHit.videos[b];
      const isAVertical = videoA.height > videoA.width;
      const isBVertical = videoB.height > videoB.width;

      if (isAVertical && !isBVertical) return -1;
      if (!isAVertical && isBVertical) return 1;

      return videoB.size - videoA.size;
    });

  for (const key of sortedVideoFiles) {
    downloadUrl = selectedHit.videos[key].url;
    videoFileKey = key;
    if (selectedHit.videos[key].height > selectedHit.videos[key].width) {
      break;
    }
  }

  if (!downloadUrl) {
    throw new Error('No download URL found');
  }

  return {
    videoUrl: downloadUrl,
    videoTitle: selectedHit.tags.replace(/, /g, ' ').trim() || 'Untitled Short',
    originalSourceUrl: selectedHit.pageURL,
    width: selectedHit.videos[videoFileKey]?.width,
    height: selectedHit.videos[videoFileKey]?.height
  };
}

async function downloadVideo(url, outputPath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function uploadToYouTube(videoPath, videoInfo) {
  const oauth2Client = new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    'http://localhost' // Redirect URI (not used in server-to-server)
  );

  oauth2Client.setCredentials({
    refresh_token: YOUTUBE_REFRESH_TOKEN,
    access_token: YOUTUBE_ACCESS_TOKEN
  });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  const title = `#shorts #dog ${videoInfo.videoTitle}`;
  const description = `#Shorts #CuteAnimals #Dogs #Cats #PetVideos\n\nSource: ${videoInfo.originalSourceUrl}`;

  const fileSize = fs.statSync(videoPath).size;
  const videoFile = fs.readFileSync(videoPath);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title,
        description: description,
        categoryId: '15',
        defaultLanguage: 'de',
        defaultAudioLanguage: 'de'
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false
      }
    },
    media: {
      body: videoFile
    }
  });

  return response.data;
}

async function main() {
  try {
    console.log('Searching Pixabay for videos...');
    const pixabayData = await searchPixabay();

    console.log('Selecting random video...');
    const videoInfo = selectRandomVideo(pixabayData);
    console.log(`Selected: ${videoInfo.videoTitle}`);

    const videoPath = path.join(__dirname, '..', 'temp-video.mp4');
    
    console.log('Downloading video...');
    await downloadVideo(videoInfo.videoUrl, videoPath);

    console.log('Uploading to YouTube...');
    const result = await uploadToYouTube(videoPath, videoInfo);
    console.log(`Upload successful! Video ID: ${result.id}`);

    // Cleanup
    fs.unlinkSync(videoPath);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

