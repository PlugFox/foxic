# Deployment Guide

This guide covers how to deploy your Foxic application to Firebase Hosting and GitHub Pages both manually and automatically.

## Prerequisites

### For Firebase Hosting
1. **Firebase Project**: Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. **Firebase CLI**: Install globally with `npm install -g firebase-tools`

### For GitHub Pages
1. **GitHub Repository**: Repository with Pages enabled
2. **GitHub Actions**: Enabled in repository settings

### Common Requirements
- **GitHub Secrets**: Configure repository secrets for deployment

## Initial Setup

### 1. Configure Firebase Project

Update `.firebaserc` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

### 2. Install Dependencies

```bash
npm install
```

This will install `firebase-tools` as a dev dependency.

### 3. Login to Firebase (Local Development)

```bash
npm run firebase:login
# or
firebase login
```

## Manual Deployment

### Local Manual Deployment

```bash
# Build and deploy to Firebase Hosting
npm run deploy

# Deploy only hosting (skip other Firebase services)
npm run deploy:hosting

# Build with version from package.json and deploy
npm run deploy:version

# Test locally before deploying
npm run firebase:serve

# Deploy with custom version using script
./deploy.sh production 1.2.3

# Deploy to staging with custom version
./deploy.sh staging 1.2.3-beta
```

### GitHub Actions Manual Deployment

1. Go to your repository on GitHub
2. Navigate to "Actions" tab
3. Find "Deploy to Firebase Hosting (Manual)" workflow
4. Click "Run workflow"
5. Choose environment (production/staging)
6. **Optional**: Specify app version (if empty, uses package.json version)
7. Click "Run workflow"

## Automatic Deployment on Tags

### Creating a Release Tag

```bash
# Create and push a version tag (will trigger deployment)
git tag 1.0.0
git push origin 1.0.0

# Or create a pre-release tag
git tag 1.0.0-beta
git push origin 1.0.0-beta
```

### Supported Tag Formats

- `1.0.0` - Production release
- `1.0.0-beta` - Pre-release (marked as draft in GitHub)
- `1.0.0-alpha.1` - Pre-release with additional identifier

## GitHub Pages Deployment

### Automatic Deployment
GitHub Pages deployment happens automatically on every push to `master` branch.

### Manual GitHub Pages Deployment
1. Go to your repository on GitHub
2. Navigate to "Actions" tab
3. Find "Deploy to GitHub Pages" workflow
4. Click "Run workflow"
5. **Optional**: Specify app version (if empty, uses package.json version)
6. Click "Run workflow"

### GitHub Pages Features
- **Automatic Deployment**: Triggers on every push to master
- **Version Injection**: Uses package.json version or manual input
- **Environment Variables**: Supports Firebase config from secrets
- **Build Summary**: Detailed deployment information in Actions
- **Quick Links**: Direct links to deployed site and settings

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

### Firebase Configuration (Required for both Firebase and GitHub Pages)
- `FIREBASE_API_KEY` - Your Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
- `FIREBASE_APP_ID` - Your Firebase app ID
- `FIREBASE_MEASUREMENT_ID` - Your Firebase measurement ID (optional)

### Firebase Service Account (Required only for Firebase Hosting)
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON (see below)

### Creating Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Save the JSON file content as `FIREBASE_SERVICE_ACCOUNT` secret

## Environment Variables

### Local Development

Create `.env.local` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Production Build

Environment variables are injected during GitHub Actions build process from repository secrets.

## Version Management

### Automatic Version Injection

All deployment methods automatically inject the app version into the build:

- **Tag Deployments**: Uses the git tag version (e.g., `1.0.0`)
- **Manual GitHub Actions**: Uses provided version or falls back to `package.json`
- **Local Deployments**: Uses `package.json` version by default

### Access Version in Application

The version is available in your app via `import.meta.env.VITE_APP_VERSION`:

```typescript
// In your SolidJS components
const appVersion = import.meta.env.VITE_APP_VERSION;
console.log(`App Version: ${appVersion}`);
```

### Version Override Options

```bash
# Local deployment with custom version
VITE_APP_VERSION=1.2.3 npm run build
./deploy.sh production 1.2.3

# Build with package.json version
npm run build:version
```

## Deployment Features

### Automatic Features
- **Version Management**: Automatic version injection from tags, manual input, or package.json
- **GitHub Releases**: Automatic release creation with deployment links
- **Cache Control**: Optimized caching headers for static assets
- **SPA Support**: Single Page Application routing support
- **Environment Support**: Staging and production deployment channels

### Firebase Hosting Configuration

The `firebase.json` includes:
- SPA routing rewrites
- Optimized cache headers
- CORS support for fonts
- Build output from `dist/` directory

## Troubleshooting

### Common Issues

1. **Build Failures**: Check that all environment variables are set correctly
2. **Firebase Permission Errors**: Verify service account has proper permissions
3. **Version Conflicts**: Ensure tag versions follow semantic versioning

### Debug Commands

```bash
# Check Firebase configuration
firebase projects:list

# Test build locally
npm run build

# Serve built files locally
npm run serve

# Check Firebase tools version
firebase --version
```

## Monitoring

### Firebase Console
- [Hosting Dashboard](https://console.firebase.google.com/project/i-c-o-n-s/hosting)
- [Usage Analytics](https://console.firebase.google.com/project/i-c-o-n-s/analytics)

### GitHub Pages
- [Pages Settings](https://github.com/PlugFox/foxic/settings/pages)
- [Deployments History](https://github.com/PlugFox/foxic/deployments)
- [Live Site](https://plugfox.github.io/foxic/)

### GitHub Actions
- Monitor deployment status in repository's Actions tab
- Check deployment logs for troubleshooting
- View build summaries with version and deployment info

## Advanced Configuration

### Custom Domains

1. Add custom domain in Firebase Console
2. Update DNS records as instructed
3. SSL certificates are automatically provisioned

### Staging Environment

Use Firebase Hosting channels for staging:

```bash
# Deploy to staging channel
firebase hosting:channel:deploy staging

# Deploy to custom preview channel
firebase hosting:channel:deploy feature-xyz
```

### Multi-site Hosting

For multiple sites in one project, update `firebase.json`:

```json
{
  "hosting": [
    {
      "target": "main-site",
      "public": "dist",
      "site": "main-site-id"
    },
    {
      "target": "admin-site",
      "public": "admin-dist",
      "site": "admin-site-id"
    }
  ]
}
```