# ColdHole ❄️📁

An elegant, modern, mobile-responsive web repository for uploading, searching, previewing, sharing, and managing files anywhere. Built with React, Vite, TypeScript, Tailwind CSS, Lucide Icons, and Motion.

---

## ✨ Features (A to Z Completed)

- 📤 **Batch Multi-File Drag & Drop Upload**: Upload single or multiple files concurrently.
- ⏳ **File Retention & Auto-Expiry**: Select file expiration policies (`Never Expire`, `24 Hours`, `7 Days`, `30 Days`).
- 👁️ **In-App Media Lightbox & Code Preview**:
  - **Images**: Zoom in/out, fit-to-screen lightbox.
  - **Video & Audio**: Embedded media players.
  - **PDF Viewer**: Embedded document viewer.
  - **Code / Text**: Syntax-highlighted text reader for JSON, JS, TS, HTML, CSS, TXT, MD, CSV.
- 📱 **Mobile QR Code Generator**: Generate an instant QR Code for any file link to scan and download directly on mobile devices.
- 🌙 **Dark / Light Theme Switcher**: Fluid dark and light mode toggle with system preference auto-detection.
- 📊 **Vault Storage Meter**: Real-time storage consumption progress bar and file metrics.
- 🔍 **Real-time Search & Filter Tabs**: Instantly search by filename or filter by categories (Images, Documents, Media, Archives, Code).
- 🧹 **Bulk File Selection & Deletion**: Select multiple files for bulk deletion or download.
- ⚡ **Hybrid Storage Engine (Netlify Ready)**:
  - **Server Mode**: Uses Node.js Express server with multer disk storage (`uploads/`).
  - **Client/Netlify Mode**: Uses browser IndexedDB and Blob URLs for static Netlify hosting without backend configuration!

---

## 🚀 Quick Start

### Running Locally with Express Backend

```bash
# 1. Install dependencies
npm install

# 2. Run dev server with Node backend (Port 3000)
npm run dev
```

### Production Build

```bash
npm run build
```

---

## 🌐 Netlify Deployment

ColdHole is pre-configured for Netlify deployment! See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for step-by-step instructions.

### Summary:
1. Connect your GitHub repository to [Netlify](https://www.netlify.com/).
2. Netlify will read `netlify.toml` automatically:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Click **Deploy**!
