# Self-Update Feature Completion

## Tasks:
- [x] Fix webview-bridge.tsx - Add missing useState import
- [x] Create SelfUpdate component
- [x] Add SelfUpdate to profile page settings tab
- [x] Fix setUpdateStatus export from useSelfUpdate hook
- [x] Remove @capacitor/app dependency (using window.appVersion instead)
- [x] Create AutoUpdateChecker component for auto-update on app launch
- [x] Add AutoUpdateChecker to root layout
- [x] Update MainActivity.java to inject app version
- [x] Configure APK download URL (GitHub Releases)

## Progress:
- [x] Plan approved
- [x] In progress
- [x] Testing
- [x] Complete

## Summary:
The self-update feature has been successfully implemented with auto-update functionality:

### Components Created/Updated:

1. **webview-bridge.tsx**: Fixed missing `useState` import and exposed `setUpdateStatus` from the hook

2. **self-update.tsx**: Updated with static configuration:
   - Version: 2.0.0 (V2)
   - Download URL: https://github.com/martincajurao/LET/releases/download/V2/let.apk
   - Manual "Check for Updates" and "Download & Install" buttons
   - Only renders in native WebView

3. **auto-update-checker.tsx**: NEW component for automatic updates:
   - Checks for updates on app launch (3 second delay)
   - Shows update dialog if new version available
   - 24-hour check interval to avoid spam
   - Download progress tracking
   - "Remind Me Later" option

4. **layout.tsx**: Added AutoUpdateChecker to root layout for app-wide auto-update checking

5. **MainActivity.java**: Updated to inject app version into WebView:
   - Exposes `window.appVersion` for version comparison
   - Called on WebView configuration

6. **profile/page.tsx**: SelfUpdate component available in Settings/Calibration tab

## Configuration:
The APK is hosted on GitHub Releases:
- **URL**: https://github.com/martincajurao/LET/releases/download/V2/let.apk
- **Version**: 2.0.0
- **File**: let.apk

## Latest Update (Firestore Integration):
- [x] Switched AutoUpdateChecker to use Firestore instead of GitHub API for Firebase Spark plan compatibility
- [x] Updated layout.tsx to import auto-update-checker-firestore.tsx
- [x] Version info now stored in Firestore collection 'app_config/version' document
- [x] No Firebase Functions required - works with free Spark plan

## How to Test:
1. Build and deploy the web app:
   ```bash
   npm run build;
   firebase deploy --only hosting;
   ```

2. Build the Android APK with version 1.0.0 (older than server version 2.0.0):
   ```bash
   npx cap sync android;
   cd android
   ./gradlew assembleRelease
   ```

3. Install the APK on an Android device

4. Launch the app - after 3 seconds, an update dialog should appear showing:
   - Current version: 1.0.0
   - New version: 2.0.0
   - Download & Install Now button

5. Click "Download & Install Now" to download and install the update

## How to Release a New Version:
1. Build new APK with updated version in `android/app/build.gradle`:
   ```gradle
   versionName "3.0.0"
   versionCode 3
   ```

2. Upload APK to GitHub Releases with tag (e.g., V3)

3. Update `STATIC_APK_CONFIG` in:
   - `src/components/self-update.tsx`
   - `src/components/auto-update-checker.tsx`
   
   Set new version and download URL

4. Deploy web app:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Troubleshooting:
- **No update dialog appears**: Check that `window.appVersion` is being injected (check Android logs)
- **Download fails**: GitHub may block direct downloads; consider using Firebase Storage or other hosting
- **"Self-update not available"**: Not running in native WebView - test on actual Android device
- **Version comparison fails**: Ensure version format matches (e.g., "2.0.0" vs "2.0.0")
