# BiosenseSignal SDK — Android Sample App (Java)

Sample Android application (Java) demonstrating integration of the BiosenseSignal SDK for contactless vital signs measurement using the device camera.

A Kotlin version of the same app is available in [`../kotlin`](../kotlin/README.md).

## Prerequisites

- Android Studio Hedgehog or later
- Android SDK with API level 27+
- Valid Artifactory credentials (see below)

## Setup

### 1. Configure Artifactory credentials

Open `settings.gradle` and replace the placeholder values with your credentials:

```gradle
credentials {
    username = "your-artifactory-username"
    password = "your-artifactory-api-key"
}
```

Alternatively, to avoid committing credentials, define them in your global `~/.gradle/gradle.properties`:

```properties
ARTIFACTORY_USERNAME=your-artifactory-username
ARTIFACTORY_API_KEY=your-artifactory-api-key
```

Then update `settings.gradle` to reference them:

```gradle
credentials {
    username = ARTIFACTORY_USERNAME
    password = ARTIFACTORY_API_KEY
}
```

### 2. Sync and run

Open the `android/java` directory in Android Studio, let Gradle sync, then run the app on a device or emulator.

Or build from the command line:

```bash
./gradlew assembleRelease
```

## Notes

- The app requires a physical device with a camera for vital signs measurement. The camera feed cannot be simulated in an emulator.
- Minimum SDK: API 27 (Android 8.1)
