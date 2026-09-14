# BiosenseSignal SDK — Web Sample App

Sample web application demonstrating integration of the BiosenseSignal Web SDK for contactless vital signs measurement using the device camera.

## Prerequisites

- Node.js 18+ and Yarn
- A browser with camera access (Chrome or Edge recommended)
- Valid Artifactory credentials (see below)

## Setup

### 1. Configure Artifactory credentials

The BiosenseSignal Web SDK is pulled from a private npm registry configured in `.npmrc`. Set your API key as an environment variable before installing:

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
cd web
yarn install
```

### 3. Run

```bash
cd web
yarn start
```

The dev server starts at `https://localhost:8000`. Your browser will warn about the self-signed certificate — proceed to the site, then allow camera access when prompted.

Enter your license key and product ID in the in-app settings before starting a measurement.

### 4. Production build

```bash
cd web
yarn build
```

Output is written to `web/dist/`.

## Notes

- The app requires a device with a working camera. Some browsers restrict camera access on non-secure origins; the sample serves over HTTPS for that reason.
- Measurement uses SharedArrayBuffer and requires Cross-Origin Isolation headers (already configured on the dev server).
- License key and product ID are stored in browser localStorage via the settings UI — they are not read from environment variables.
