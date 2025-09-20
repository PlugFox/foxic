# Deployment Quick Reference

## 🚀 Automatic Deployments

### Firebase Hosting
- **Tag Release**: Create a git tag (e.g., `1.0.0`) to trigger automatic deployment
- **Manual**: Use GitHub Actions "Deploy to Firebase Hosting (Manual)" workflow

### GitHub Pages
- **Auto**: Every push to `master` branch automatically deploys
- **Manual**: Use GitHub Actions "Deploy to GitHub Pages" workflow

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase (requires setup)
npm run deploy
```

## 📚 Documentation

- **[Complete Deployment Guide](./DEPLOYMENT.md)** - Detailed setup and configuration
- **[Firebase Console](https://console.firebase.google.com/project/i-c-o-n-s/hosting)** - Manage Firebase deployments
- **[GitHub Pages](https://plugfox.github.io/foxic/)** - Live GitHub Pages site

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and configure your Firebase settings:

```bash
cp .env.example .env.local
# Edit .env.local with your Firebase configuration
```

## 🏷️ Version Management

App version is automatically injected during build:
- Tag deployments use git tag version
- Manual deployments can specify version or use package.json
- Available in app via `import.meta.env.VITE_APP_VERSION`