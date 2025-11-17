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
  // Validate credentials
  if (!YOUTUBE_CLIENT_ID) {
    throw new Error('YOUTUBE_CLIENT_ID is missing. Set it as an environment variable or ensure client_secret_*.json file exists.');
  }
  if (!YOUTUBE_CLIENT_SECRET) {
    throw new Error('YOUTUBE_CLIENT_SECRET is missing. Set it as an environment variable or ensure client_secret_*.json file exists.');
  }
  if (!YOUTUBE_REFRESH_TOKEN) {
    throw new Error('YOUTUBE_REFRESH_TOKEN is missing. Get it from OAuth Playground (see README.md).');
  }

  console.log('Using Client ID:', YOUTUBE_CLIENT_ID.substring(0, 20) + '...');
  console.log('Refresh token present:', YOUTUBE_REFRESH_TOKEN ? 'Yes' : 'No');

  // For web OAuth clients, use the redirect URI from the JSON file if available
  let redirectUri = 'http://localhost';
  try {
    const clientSecretFiles = fs.readdirSync(path.join(__dirname, '..'))
      .filter(file => file.startsWith('client_secret') && file.endsWith('.json'));
    if (clientSecretFiles.length > 0) {
      const credsPath = path.join(__dirname, '..', clientSecretFiles[0]);
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (creds.web?.redirect_uris && creds.web.redirect_uris.length > 0) {
        redirectUri = creds.web.redirect_uris[0];
        console.log('Using redirect URI from JSON:', redirectUri);
      }
    }
  } catch (error) {
    console.warn('Could not load redirect URI from JSON, using default:', error.message);
  }

  const oauth2Client = new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: YOUTUBE_REFRESH_TOKEN,
    access_token: YOUTUBE_ACCESS_TOKEN
  });

  // Ensure we have a valid access token
  try {
    if (!YOUTUBE_ACCESS_TOKEN) {
      console.log('No access token provided, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log('Access token refreshed successfully');
    }
  } catch (error) {
    if (error.message.includes('invalid_client')) {
      throw new Error(`Invalid OAuth client credentials. Please verify:\n` +
        `1. Client ID and Secret are correct\n` +
        `2. OAuth client is enabled in Google Cloud Console\n` +
        `3. YouTube Data API v3 is enabled\n` +
        `4. Redirect URI matches: ${redirectUri}\n` +
        `Original error: ${error.message}`);
    }
    throw error;
  }

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  // Create title - ensure it's valid and not too long (YouTube limit: 100 chars)
  let title = `#shorts #dog ${videoInfo.videoTitle}`;
  
  // Truncate if too long (YouTube max is 100 characters)
  if (title.length > 100) {
    // Keep "#shorts #dog " prefix and truncate the rest
    const prefix = '#shorts #dog ';
    const maxRemaining = 100 - prefix.length;
    const truncated = videoInfo.videoTitle.substring(0, maxRemaining);
    title = prefix + truncated;
  }
  
  // Ensure title is not empty
  if (!title || title.trim().length === 0) {
    title = '#shorts #dog Cute Dog Video';
  }
  
  // Clean up title - remove any problematic characters
  title = title.trim().replace(/\s+/g, ' '); // Replace multiple spaces with single space
  
  // Description without source URL - just hashtags for Shorts
  const description = `#Shorts #CuteAnimals #Dogs #Cats #PetVideos`;
  
  // Tags to help YouTube recognize it as a Short
  const tags = ['shorts', 'dog', 'cute', 'animals', 'pets', 'funny'];
  
  console.log('Video title:', title);
  console.log('Title length:', title.length);
  console.log('Description:', description);

  const fileSize = fs.statSync(videoPath).size;
  const videoFile = fs.createReadStream(videoPath);
  
  // Detect MIME type from file extension
  const ext = path.extname(videoPath).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm'
  };
  const mimeType = mimeTypes[ext] || 'video/mp4';

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title,
        description: description,
        tags: tags,
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
      body: videoFile,
      mimeType: mimeType
    }
  });

  return response.data;
}

async function main() {
  try {
    // Check if refresh token is set
    if (!YOUTUBE_REFRESH_TOKEN) {
      console.error('\n❌ ERROR: YOUTUBE_REFRESH_TOKEN is not set!');
      console.error('\nTo fix this:');
      console.error('1. Get a refresh token from OAuth Playground: https://developers.google.com/oauthplayground/');
      console.error('2. Set it as an environment variable:');
      console.error('   export YOUTUBE_REFRESH_TOKEN="your-refresh-token-here"');
      console.error('\nSee README.md or SETUP_ACTIONS.md for detailed instructions.\n');
      process.exit(1);
    }

    console.log('Searching Pixabay for videos...');
    const pixabayData = await searchPixabay();

    console.log('Selecting random video...');
    const videoInfo = selectRandomVideo(pixabayData);
    console.log(`Selected: ${videoInfo.videoTitle}`);

    const videoPath = path.join(__dirname, '..', 'temp-video.mp4');
    
    console.log('Downloading video...');
    await downloadVideo(videoInfo.videoUrl, videoPath);

    // Verify video is vertical (required for Shorts)
    if (videoInfo.width && videoInfo.height) {
      const aspectRatio = videoInfo.width / videoInfo.height;
      const isVertical = videoInfo.height > videoInfo.width;
      console.log(`Video dimensions: ${videoInfo.width}x${videoInfo.height} (${isVertical ? 'Vertical' : 'Horizontal'})`);
      console.log(`Aspect ratio: ${aspectRatio.toFixed(2)}`);
      
      if (!isVertical) {
        console.warn('⚠️  Warning: Video is not vertical. YouTube Shorts require vertical videos (9:16 aspect ratio).');
      } else {
        console.log('✅ Video is vertical - will be uploaded as a Short');
      }
    }

    console.log('Uploading to YouTube as Short...');
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

