# BiosenseSignal SDK — React Native Sample App

Sample React Native application demonstrating integration of the BiosenseSignal SDK for contactless vital signs measurement using the device camera. Supports both Android and iOS.

## Prerequisites

- Node.js 18+ and Yarn
- For Android: Android Studio with Android SDK (API 27+)
- For iOS: macOS with Xcode 15 or later, CocoaPods (`sudo gem install cocoapods`)
- Valid Artifactory credentials (see below)

## Setup

### 1. Configure Artifactory credentials

The BiosenseSignal React Native SDK is pulled from a private npm registry configured in `.npmrc`. Set your API key as an environment variable before installing:

```bash
export ARTIFACTORY_API_KEY=your-api-key
```

To make this permanent, add it to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
echo 'export ARTIFACTORY_API_KEY=your-api-key' >> ~/.zshrc
source ~/.zshrc
```

### 2. Install dependencies

```bash
cd react-native/SampleApp
yarn install
```

### 3. iOS only — install CocoaPods dependencies

```bash
cd react-native/SampleApp/ios
pod install
```

### 4. Run

Start the Metro bundler:

```bash
cd react-native/SampleApp
yarn start
```

Then in a separate terminal, run on your target platform:

```bash
# Android
yarn android

# iOS
yarn ios
```

Or open `ios/SampleApp.xcworkspace` in Xcode / `android` in Android Studio and run from there.

## Notes

- The app requires a physical device with a camera. Vital signs measurement does not work in simulators or emulators.
- Android minimum SDK: API 27
- iOS minimum deployment target: iOS 14.0
- You will need to set your own Apple Developer Team in Xcode under **Signing & Capabilities** before running on an iOS device.

