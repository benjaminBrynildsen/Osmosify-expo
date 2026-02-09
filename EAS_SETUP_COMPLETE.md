# Complete EAS Build Setup (No Mac Required!)

Since you're running Linux on your Mac mini, EAS Build is the perfect solution. Expo's cloud servers will build your iOS app — no Xcode needed!

---

## What You Need

1. **Expo account** (free) — https://expo.dev/signup
2. **Apple Developer Account** ($99/year) — Required for iOS device builds
3. **This repo** — Already cloned on your Linux Mac mini

---

## Quick Start (Automated)

Run the setup script:

```bash
cd Osmosify-Expo
./setup-eas.sh
```

This will:
- Install EAS CLI
- Install dependencies
- Log you into Expo
- Initialize the project

---

## Manual Setup (Step-by-Step)

If the script doesn't work, do it manually:

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo username/email and password.

### Step 3: Install Dependencies

```bash
cd Osmosify-Expo
npm install
```

### Step 4: Initialize EAS Project

```bash
eas init
```

This creates your project on Expo's servers and updates `app.json` with your EAS project ID.

---

## Building Your App

### Build for iOS (Simulator)

Best for testing:

```bash
eas build --platform ios --profile preview
```

You'll get an email with a download link. Install the `.app` on an iOS Simulator.

### Build for iOS (Device)

For testing on your iPhone:

```bash
eas build --platform ios --profile development
```

**First time only** — register your device:

```bash
eas device:create
```

Follow prompts to register your iPhone. Then rebuild.

**Install on device:**
- Expo sends you a link
- Open on your iPhone
- Install the app
- Trust the developer certificate in Settings → General → VPN & Device Management

### Build for App Store

When ready to submit:

```bash
eas build --platform ios --profile production
```

Then submit:

```bash
eas submit --platform ios
```

---

## Building Android

Even easier — no developer account needed:

```bash
# APK for testing
eas build --platform android --profile preview

# AAB for Play Store
eas build --platform android --profile production
```

---

## GitHub Actions (Automated Builds)

I've set up GitHub Actions so builds happen automatically:

**Trigger builds from GitHub:**
1. Go to https://github.com/benjaminBrynildsen/Osmosify-expo
2. Click "Actions" tab
3. Select "EAS Build" workflow
4. Click "Run workflow"
5. Choose platform (iOS/Android) and profile
6. Click "Run"

**Set up GitHub Actions:**

Add your Expo token as a GitHub secret:

1. Get your token:
   ```bash
   eas login
   eas token:create
   ```

2. Add to GitHub:
   - Go to repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `EXPO_TOKEN`
   - Value: (paste your token)
   - Click "Add secret"

Now builds will trigger automatically on every push!

---

## Build Profiles Explained

| Profile | Use Case | iOS Output | Android Output |
|---------|----------|------------|----------------|
| `development` | Testing on device | `.ipa` | `.apk` |
| `preview` | Internal testing | `.ipa` (simulator) | `.apk` |
| `production` | App Store / Play Store | `.ipa` (signed) | `.aab` |

---

## Monitoring Builds

**View builds:**
```bash
eas build:list
```

**View logs:**
```bash
eas build:logs
```

**Open in browser:**
```bash
eas build:view
```

---

## Pricing

**Free tier:**
- 30 iOS builds/month
- 30 Android builds/month
- Shared builders (may queue)

**Paid (if you exceed free tier):**
- $8 per iOS build
- $8 per Android build

Most projects never exceed the free tier.

---

## Troubleshooting

### "Bundle identifier already exists"

Change it in `app.json`:
```json
"ios": {
  "bundleIdentifier": "com.yourname.osmosify"
}
```

### "Provisioning profile not found"

Sync credentials:
```bash
eas credentials:sync
```

### Build fails

Check logs:
```bash
eas build:logs --id BUILD_ID
```

### "You don't have permission"

Make sure you're logged in:
```bash
eas whoami
```

If not:
```bash
eas login
```

---

## Next Steps After Build

### Install on iPhone

1. Expo sends you an email with install link
2. Open link on your iPhone
3. Tap "Install"
4. Go to Settings → General → VPN & Device Management
5. Find your developer certificate
6. Tap "Trust"
7. Open the app!

### Submit to App Store

1. Build production version:
   ```bash
   eas build --platform ios --profile production
   ```

2. Submit:
   ```bash
   eas submit --platform ios
   ```

3. Complete submission in App Store Connect

---

## Complete Command Reference

```bash
# Login/logout
eas login
eas logout
eas whoami

# Build
eas build --platform ios
eas build --platform android
eas build --platform all

# List builds
eas build:list
eas build:view
eas build:logs

# Credentials
eas credentials
eas credentials:sync

# Device management (iOS)
eas device:list
eas device:create
eas device:delete

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Project info
eas project:info
eas project:open
```

---

## Support

- EAS docs: https://docs.expo.dev/build/introduction/
- Expo forums: https://forums.expo.dev/
- Discord: https://chat.expo.dev/

---

## Summary

✅ **EAS Build lets you build iOS apps on Linux**  
✅ **No Xcode or macOS required**  
✅ **Cloud builds are fast and reliable**  
✅ **Free tier includes 30 builds/month**  

You're all set! Run `./setup-eas.sh` to get started.
