# Firebase Static Deployment Guide

This project has been converted to static routes for Firebase Spark Plan deployment.

## Changes Made

### 1. Next.js Configuration
- Added `output: 'export'` for static generation
- Set `trailingSlash: true` and `skipTrailingSlashRedirect: true`
- Updated `distDir: 'out'`

### 2. Firebase Configuration
- Updated `firebase.json` to use `out` directory as public folder
- Added rewrites to route API calls to Firebase Functions
- Configured caching headers for static assets

### 3. Firebase Functions
- Created `functions/` directory with separate package.json
- Moved API routes to Firebase Functions:
  - `/api/daily-task` → `dailyTask` function
  - `/api/events` → `events` function  
  - `/api/download` → `download` function
  - `/api/apk` → `apk` function

### 4. Environment Variables
- Created `.env.local` with Firebase configuration
- Updated all API calls to use environment variables

## Deployment Instructions

### Step 1: Update Firebase Project ID
1. Open `.env.local`
2. Replace `your-project-id` with your actual Firebase project ID
3. Update the URLs to match your Firebase project

### Step 2: Deploy Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

### Step 3: Deploy Hosting
```bash
npm run build
firebase deploy --only hosting
```

## Important Notes

### Firebase Spark Plan Limitations
- **Functions**: Limited to 125,000 invocations/month
- **Hosting**: 10GB bandwidth/month
- **No server-side rendering**: All pages are static

### Function URLs
Your API calls will be routed as:
- Development: `http://localhost:5001/your-project-id/us-central1/dailyTask`
- Production: `https://us-central1-your-project-id.cloudfunctions.net/dailyTask`

### Testing
1. Test locally: `npm run dev`
2. Test functions: `cd functions && npm run serve`
3. Test static build: Open `out/index.html` directly

## API Endpoints

All previous API routes are now Firebase Functions:
- `POST /api/daily-task` → `POST /dailyTask`
- `GET /api/events` → `GET /events`
- `POST /api/events` → `POST /events`
- `GET /api/download` → `GET /download`
- `GET /api/apk` → `GET /apk`
- `POST /api/apk` → `POST /apk` (limited functionality)

## Static Routes
All pages are now static:
- `/` - Main dashboard
- `/admin` - Admin panel
- `/events` - Events page
- `/profile` - User profile
- `/tasks` - Tasks page
- `/test-auth` - Authentication test page

The app maintains full functionality while being compatible with Firebase Spark Plan!
