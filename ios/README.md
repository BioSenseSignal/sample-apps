# BiosenseSignal SDK — iOS Sample App

Sample iOS application (Swift) demonstrating integration of the BiosenseSignal SDK for contactless vital signs measurement using the device camera.

## Prerequisites

- macOS with Xcode 15 or later
- CocoaPods: `sudo gem install cocoapods`
- `cocoapods-art` plugin: `gem install cocoapods-art`
- Valid Artifactory credentials (see below)

## Setup

### 1. Configure Artifactory credentials

Add your Artifactory credentials to `~/.netrc` so CocoaPods-Art can authenticate:

```bash
printf "machine <your-artifactory-host>\n  login <your-username>\n  password <your-api-key>\n" >> ~/.netrc
chmod 600 ~/.netrc
```

For example, if your Artifactory URL is `https://yourcompany.jfrog.io`:

```bash
printf "machine yourcompany.jfrog.io\n  login your-username\n  password your-api-key\n" >> ~/.netrc
chmod 600 ~/.netrc
```

### 2. Add the CocoaPods-Art repository

```bash
pod repo-art add biosensesignal-cocoapods "<your-artifactory-url>/artifactory/api/pods/<cocoapods-repo-name>"
```

### 3. Install pods

```bash
cd ios
pod install
```

### 4. Open and run

Open `SampleApp.xcworkspace` in Xcode (not the `.xcodeproj`), select a physical device, and run.

```bash
open ios/SampleApp.xcworkspace
```

## Notes

- The app requires a physical iOS device with a camera. The SDK cannot use the simulator camera.
- Minimum deployment target: iOS 15.1
- You will need to set your own Apple Developer Team in Xcode under **Signing & Capabilities** before running on a device.
