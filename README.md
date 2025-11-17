# YouTube Shorts Auto-Uploader

Automated workflow to upload YouTube Shorts from Pixabay videos using GitHub Actions.

## Setup Instructions

> **⚠️ Security Note**: Never share API keys or tokens publicly. If you've accidentally exposed a token, revoke it immediately and create a new one.

### 1. GitHub Secrets Configuration

Go to your repository → Settings → Secrets and variables → Actions, and add the following secrets:

#### Required Secrets:

- **`PIXABAY_API_KEY`**: Your Pixabay API key
  - Get one at: https://pixabay.com/api/docs/

- **`YOUTUBE_CLIENT_ID`**: Your Google OAuth 2.0 Client ID
  - Extract from your `client_secret_*.json` file (look for `client_id` in the `web` section)
- **`YOUTUBE_CLIENT_SECRET`**: Your Google OAuth 2.0 Client Secret
  - Extract from your `client_secret_*.json` file (look for `client_secret` in the `web` section)
- **`YOUTUBE_REFRESH_TOKEN`**: Your YouTube OAuth refresh token
- **`YOUTUBE_ACCESS_TOKEN`**: Your YouTube OAuth access token (optional, can be auto-refreshed)

### 2. YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Desktop app" or "Web application"
   - Download the credentials JSON
5. Get a refresh token:
   - Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Select "YouTube Data API v3" → "https://www.googleapis.com/auth/youtube.upload"
   - Authorize and exchange for tokens
   - Copy the refresh token

### 3. Workflow Schedule

The workflow runs automatically every 2 hours. You can also trigger it manually:
- Go to Actions tab → "Upload YouTube Shorts" → "Run workflow"

### 4. Local Testing (Optional)

To test locally:

```bash
npm install
export PIXABAY_API_KEY="your-key"
export YOUTUBE_CLIENT_ID="your-client-id"
export YOUTUBE_CLIENT_SECRET="your-secret"
export YOUTUBE_REFRESH_TOKEN="your-refresh-token"
export YOUTUBE_ACCESS_TOKEN="your-access-token"
npm run upload
```

## How It Works

1. **Searches Pixabay** for "funny dogs" videos (vertical orientation, German language)
2. **Filters** for vertical videos (height > width)
3. **Selects** a random video from the results
4. **Downloads** the video file
5. **Uploads** to YouTube as a Short with:
   - Title: `#shorts #dog [video tags]`
   - Description: `#Shorts #CuteAnimals #Dogs #Cats #PetVideos`
   - Category: 15 (Pets & Animals)
   - Privacy: Public

## Files

- `.github/workflows/upload-shorts.yml` - GitHub Actions workflow
- `scripts/upload-short.js` - Main upload script
- `package.json` - Node.js dependencies

