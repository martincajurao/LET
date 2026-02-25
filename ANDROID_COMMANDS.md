# Android Development Commands

Here are the new commands added to your package.json for Android development:

## 📱 Available Scripts:

### `npm run android:build`
Builds your Next.js app and syncs it with the Android project
```bash
npm run android:build
```

### `npm run android:run`
Runs the app on an Android device or emulator
```bash
npm run android:run
```

### `npm run android:open`
Opens the Android project in Android Studio
```bash
npm run android:open
```

### `npm run android:serve`
Starts the development server AND runs the app on Android
```bash
npm run android:serve
```

## 🔄 Typical Workflow:

1. **For Development:**
   ```bash
   npm run android:serve
   ```
   This starts your Next.js dev server and launches the app on Android

2. **For Testing Changes:**
   ```bash
   npm run android:build
   npm run android:run
   ```

3. **For Building APK:**
   ```bash
   npm run android:build
   npm run android:open
   ```
   Then use Android Studio to build the APK

## 📋 Prerequisites:
- Android Studio installed
- Android device/emulator set up
- USB debugging enabled (for physical devices)

## 🎯 Quick Start:
1. Install Android Studio
2. Run `npm run android:open` to open the project
3. Let Android Studio sync and download dependencies
4. Build and run the app!
