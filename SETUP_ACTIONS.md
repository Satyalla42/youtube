# GitHub Actions Setup Guide

## Step-by-Step Instructions

### 1. Go to Secrets Page
Navigate to: **https://github.com/Satyalla42/youtube/settings/secrets/actions**

Or:
1. Go to your repository: https://github.com/Satyalla42/youtube
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret** button

---

### 2. Add Each Secret

Click **"New repository secret"** for each one below:

#### Secret 1: `PIXABAY_API_KEY`
- **Name**: `PIXABAY_API_KEY`
- **Secret**: `53285472-233b9ed1ac23d1516fe17b3d1`
- Click **Add secret**

#### Secret 2: `YOUTUBE_CLIENT_ID`
- **Name**: `YOUTUBE_CLIENT_ID`
- **Secret**: *(Get from your `client_secret_*.json` file - look for `client_id` in the `web` section)*
- Click **Add secret**

#### Secret 3: `YOUTUBE_CLIENT_SECRET`
- **Name**: `YOUTUBE_CLIENT_SECRET`
- **Secret**: *(Get from your `client_secret_*.json` file - look for `client_secret` in the `web` section)*
- Click **Add secret**

#### Secret 4: `YOUTUBE_REFRESH_TOKEN`
- **Name**: `YOUTUBE_REFRESH_TOKEN`
- **Secret**: *(You need to get this - see instructions below)*
- Click **Add secret**

#### Secret 5: `YOUTUBE_ACCESS_TOKEN` (Optional)
- **Name**: `YOUTUBE_ACCESS_TOKEN`
- **Secret**: *(Leave empty or get from OAuth Playground - optional)*
- Click **Add secret**

---

## How to Get the Refresh Token

### Option 1: Using OAuth 2.0 Playground (Easiest)

1. Go to: https://developers.google.com/oauthplayground/

2. Click the **⚙️ Settings** icon (top right)

3. Check the box: **"Use your own OAuth credentials"**

4. Enter your OAuth credentials (from your `client_secret_*.json` file):
   - **OAuth Client ID**: *(from `client_id` field)*
   - **OAuth Client secret**: *(from `client_secret` field)*

5. Click **Close**

6. In the left panel, scroll down and find **"YouTube Data API v3"**

7. Expand it and check: **`https://www.googleapis.com/auth/youtube.upload`**

8. Click **"Authorize APIs"** button

9. Sign in with your Google account and click **"Allow"**

10. Click **"Exchange authorization code for tokens"**

11. Copy the **"Refresh token"** value (it's a long string)

12. Paste it as the `YOUTUBE_REFRESH_TOKEN` secret in GitHub

---

## Verify Setup

After adding all secrets, you should see 4-5 secrets listed:
- ✅ `PIXABAY_API_KEY`
- ✅ `YOUTUBE_CLIENT_ID`
- ✅ `YOUTUBE_CLIENT_SECRET`
- ✅ `YOUTUBE_REFRESH_TOKEN`
- ✅ `YOUTUBE_ACCESS_TOKEN` (optional)

---

## Test the Workflow

1. Go to: https://github.com/Satyalla42/youtube/actions

2. Click on **"Upload YouTube Shorts"** workflow

3. Click **"Run workflow"** button (right side)

4. Select **"Run workflow"** from the dropdown

5. Watch it run! It should:
   - Search Pixabay
   - Download a video
   - Upload to YouTube

---

## Troubleshooting

### If the workflow fails:

1. **Check the Actions logs**: Click on the failed run → Check the error message

2. **Common issues**:
   - Missing refresh token → Get it from OAuth Playground
   - Invalid credentials → Double-check you copied them correctly
   - YouTube API not enabled → Make sure YouTube Data API v3 is enabled in Google Cloud Console

3. **Check secrets are set**: Go back to Settings → Secrets and variables → Actions to verify all secrets exist

---

## Quick Reference: All Secret Values

| Secret Name | Where to Find |
|------------|----------------|
| `PIXABAY_API_KEY` | Your Pixabay account API key |
| `YOUTUBE_CLIENT_ID` | From `client_secret_*.json` file (`client_id` field) |
| `YOUTUBE_CLIENT_SECRET` | From `client_secret_*.json` file (`client_secret` field) |
| `YOUTUBE_REFRESH_TOKEN` | Get from OAuth Playground (see instructions above) |
| `YOUTUBE_ACCESS_TOKEN` | Optional - can be left empty |

