# Fragrance Planner - Multi-Platform Build Guide

This application is built using React, Vite, and Tailwind CSS. It is configured to be built for Web, Desktop (Windows/macOS/Linux), and Mobile (Android/iOS).

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **For Desktop:** No extra tools needed for building locally.
- **For Android:** [Android Studio](https://developer.android.com/studio) and Java JDK 17.
- **For iOS:** [Xcode](https://developer.apple.com/xcode/) (macOS only) and CocoaPods.

---

## 🌐 1. Web Deployment
The standard web build produces static files in the `dist/` folder.

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview the build locally
npm run preview
```
**Deployment:** Upload the contents of the `dist/` folder to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

---

## 💻 2. Desktop App (.exe, .dmg, .app)
Build a standalone desktop application that works **completely offline**.

### Development Mode
Runs the app in an Electron window with Hot Module Replacement.
```bash
npm run electron:dev
```

### Production Build (Generate Executables)
This command packages the app into the native format for your current Operating System.
```bash
npm run electron:build
```
**Output Formats:**
- **Windows:** `.exe` (Installer) and Portable versions.
- **macOS:** `.dmg` (Disk Image) and `.app` (Application).
- **Linux:** `.AppImage`, `.deb`, and `.rpm`.

The files will be generated in the `release/` folder.

---

## 📱 3. Mobile App (.apk, .ipa, .app)
Build native mobile apps for Android and iOS. These apps are designed to work **offline** by default.

### Setup Platforms
You need to add the native platforms first (run these on your local machine):
```bash
# Add Android platform
npx cap add android

# Add iOS platform (macOS only)
npx cap add ios
```

### Build and Generate Files
```bash
# 1. Build for Android and open in Android Studio
npm run mobile:android
# In Android Studio: Go to Build > Build Bundle(s) / APK(s) > Build APK(s) to get your .apk file.

# 2. Build for iOS and open in Xcode
npm run mobile:ios
# In Xcode: Select "Any iOS Device", then Product > Archive to generate your .ipa / .app file.
```

### Syncing Changes
If you make changes to the web code, sync them to the native projects:
```bash
npm run mobile:sync
```

---

## 📶 Offline Capability & AI
- **Offline Mode:** All core features (Database, Calculator, Trackers, Formulas) work **100% offline**. Data is stored locally on your device.
- **AI Features:** The "Scent Assistant" (Gemini AI) requires an active internet connection to communicate with Google's servers. If you are offline, the AI features will display a connection error, but the rest of the app will remain fully functional.

## 🛠️ Configuration & Customization

### UI Scaling & Navigation
- **Tab Drawer:** Access all application sections via the expandable side drawer (click the menu icon in the header).
- **UI Scaling:** Adjust the interface size (80% to 150%) using the zoom controls in the header. Settings are saved locally.

### App Metadata
- **Name:** Fragrance Planner
- **Package ID:** `com.fragranceplanner.app`
- **Version:** `1.0.3`
- **Icon:** The app uses `public/icon.png`. 
  - **Electron:** Automatically uses this icon for the window.
  - **Mobile:** To update mobile icons, replace the files in `android/app/src/main/res` and `ios/App/App/Assets.xcassets` with your generated icon sets.

### Environment Variables
Ensure you have a `.env` file with your `GEMINI_API_KEY` if you are using AI features. For native builds, these are baked into the code during `npm run build`.

---

## ⚠️ Possible Issues & Troubleshooting

### 1. White Screen on Launch (Electron/Mobile)
- **Cause:** Incorrect base path in `vite.config.ts`.
- **Fix:** Ensure `base: './'` is set in `vite.config.ts`. (Already configured in this repo).

### 2. Android Build Failures
- **Cause:** Incompatible Java version or missing SDK components.
- **Fix:** Ensure you are using **JDK 17** and have the latest Android SDK Platforms/Tools installed via Android Studio SDK Manager.

### 3. iOS CocoaPods Errors
- **Cause:** Outdated pods or missing architecture support.
- **Fix:** Run `cd ios/App && pod install` or `arch -x86_64 pod install` on M1/M2 Macs.

### 4. API Key Not Working
- **Cause:** Environment variables not loaded correctly during build.
- **Fix:** Check `vite.config.ts` to ensure `define` is correctly mapping your keys.

### 5. Permission Denied (Linux/macOS)
- **Cause:** Script execution permissions.
- **Fix:** Run `chmod +x <script_name>` or use `sudo` if necessary (not recommended for npm).

---

## 📄 License
This project is private. All rights reserved.
