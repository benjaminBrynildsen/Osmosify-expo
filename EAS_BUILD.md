# EAS Build Setup Guide

## What is EAS Build?

EAS (Expo Application Services) Build is Expo's cloud service that builds your app for iOS and Android without needing Xcode or Android Studio locally. Perfect for building iOS apps on Linux or Windows machines.

## Prerequisites

1. **Expo account** (free at https://expo.dev/signup)
2. **Apple Developer Account** ($99/year) - Required for iOS builds
3. **EAS CLI installed**

## Setup Steps

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```
Enter your Expo username/email and password.

### 3. Configure the Project

The configuration files are already set up:
- `eas.json` - Build profiles
- `app.json` - Updated with bundle identifiers

You need to initialize the project with EAS:

```bash
eas init
```

Or configure an existing project:

```bash
eas config
```

This will:
- Create a project on Expo's servers
- Update `app.json` with your EAS project ID
- Set up build credentials

### 4. Build for iOS (Simulator)

```bash
eas build --platform ios --profile preview
```

This builds an IPA you can install on a simulator.

### 5. Build for iOS (Device)

For testing on a physical iPhone:

```bash
eas build --platform ios --profile development
```

You'll need to:
- Register your device with Apple
- Provide your Apple Developer credentials
- Install the resulting IPA via TestFlight or direct install

### 6. Build for Production (App Store)

```bash
eas build --platform ios --profile production
```

Then submit to App Store:

```bash
eas submit --platform ios
```

### 7. Build for Android

```bash
# Development build
eas build --platform android --profile development

# Production APK
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production
```

## Build Profiles Explained

### Development
- Includes development client
- Can be installed on registered devices
- Good for testing during development

### Preview
- Production-like build
- Internal distribution (no app store)
- Good for QA testing

### Production
- App Store / Play Store ready
- Code signing configured
- Optimized for release

## iOS Specific Requirements

### For Device Testing

1. **Apple Developer Account** ($99/year)
2. **Register your device**:
   ```bash
   eas device:create
   ```
3. **Build and install**:
   ```bash
   eas build --platform ios --profile development
   ```

### For App Store

1. **App Store Connect** account
2. **Create app record** in App Store Connect
3. **Update app.json**:
   ```json
   {
     "ios": {
       "bundleIdentifier": "com.yourcompany.osmosify"
     }
   }
   ```
4. **Build and submit**:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:logs

# Cancel a build
eas build:cancel

# Open project on Expo dashboard
eas project:open

# Configure credentials
eas credentials

# Update build configuration
eas config
```

## Environment Variables

If your app needs API keys or secrets:

```bash
eas secret:create --name GOOGLE_PLACES_API_KEY --value your_key_here
```

These are securely stored and injected at build time.

## Pricing

**Free tier:**
- 30 iOS builds/month
- 30 Android builds/month
- Shared builders (may queue)

**Pay-as-you-go:**
- $8 per iOS build
- $8 per Android build
- Priority builders (faster)

**Subscription:**
- $29/month for 5 concurrent builds
- Unlimited builds
- Priority support

## Troubleshooting

### "Provisioning profile not found"
```bash
eas credentials:sync
```

### "Bundle identifier already exists"
Change the bundle identifier in `app.json` to something unique:
```json
"bundleIdentifier": "com.yourname.osmosify"
```

### Build fails
Check the build logs:
```bash
eas build:logs --id BUILD_ID
```

### Need to update build number
```bash
eas build --platform ios --auto-increment
```

## Quick Start Checklist

- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login: `eas login`
- [ ] Initialize: `eas init` or `eas config`
- [ ] (iOS) Have Apple Developer Account
- [ ] (iOS) Register test device: `eas device:create`
- [ ] Build: `eas build --platform ios --profile development`
- [ ] Install on device via QR code or TestFlight

## Support

- EAS documentation: https://docs.expo.dev/build/introduction/
- Expo forums: https://forums.expo.dev/
- EAS status: https://status.expo.dev/
