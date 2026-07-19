# BiosenseSignal SDK — Flutter Sample App

Sample Flutter application demonstrating integration of the BiosenseSignal SDK for contactless vital signs measurement using the device camera. Supports both Android and iOS.

## Prerequisites

- Flutter SDK 3.x or later ([install guide](https://docs.flutter.dev/get-started/install))
- Dart SDK (bundled with Flutter)
- For Android: Android Studio with Android SDK (API 27+)
- For iOS: macOS with Xcode 15 or later
- Valid Artifactory credentials (see below)

## Setup

### 1. Authenticate with Artifactory

The BiosenseSignal Flutter SDK is hosted on a private Dart/pub repository. Add your Artifactory API key as an environment variable:

```bash
export ARTIFACTORY_API_KEY=your-api-key
```

Then register the token with the Dart pub tool:

```bash
dart pub token add "<your-artifactory-url>/artifactory/api/pub/<flutter-repo-name>" \
  --env-var ARTIFACTORY_API_KEY
```

### 2. Install dependencies

```bash
cd flutter/sample_app
flutter pub get
```

### 3. iOS only — install CocoaPods dependencies

```bash
cd flutter/sample_app/ios
pod install
```

### 4. Run

```bash
cd flutter/sample_app
flutter run
```

To target a specific platform:

```bash
flutter run -d android
flutter run -d ios
```

## Notes

- The app requires a physical device with a camera. Vital signs measurement does not work in simulators or emulators.
- Android minimum SDK: API 27
- iOS minimum deployment target: iOS 14.0

