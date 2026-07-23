# 🚀 How to Deploy ColdHole on Netlify (Step-by-Step Guide)

ColdHole is pre-configured for seamless **Netlify** deployment. Because ColdHole includes an automatic **Hybrid Storage Engine**, it works 100% out of the box on Netlify static hosting without requiring external database or server setup!

---

## 🛠️ Method 1: Deploy via GitHub (Recommended & Automated)

This method connects Netlify directly to your GitHub repository so every git push automatically deploys your updates.

### Step 1: Push ColdHole to GitHub
If you haven't pushed your modified ColdHole project to GitHub yet, run:
```bash
git add .
git commit -m "Complete ColdHole app with Netlify configuration"
git push origin main
```

### Step 2: Log in to Netlify
1. Go to [Netlify.com](https://www.netlify.com/) and click **Log in** (or **Sign up** using your GitHub account).

### Step 3: Import Project from GitHub
1. In your Netlify Overview Dashboard, click **Add new site** -> **Import an existing project**.
2. Select **GitHub** as your Git provider and authorize Netlify.
3. Search for and select your **`ColdHole`** repository.

### Step 4: Configure Build Settings
Netlify will automatically detect the included `netlify.toml` file. Verify the following settings:
- **Branch to deploy:** `main` (or `master`)
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Step 5: Click Deploy Site!
1. Click **Deploy ColdHole**.
2. Netlify will build your project in ~30 seconds.
3. Once completed, Netlify will provide your live URL (e.g. `https://coldhole.netlify.app`).

---

## 📦 Method 2: Deploy via Netlify Drag & Drop (Instant Manual Deploy)

If you do not want to connect GitHub, you can deploy the built project folder directly!

### Step 1: Build the project locally
In your project directory, run:
```bash
npm run build
```
This generates a production folder named `dist`.

### Step 2: Drag and Drop to Netlify
1. Log in to [Netlify.com](https://app.netlify.com/drop).
2. Open the **Sites** tab or navigate to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the **`dist`** folder from your computer and drop it directly onto the Netlify drag-and-drop area.
4. Your site will be live instantly!

---

## 💻 Method 3: Deploy via Netlify CLI

If you prefer terminal commands:

1. Install Netlify CLI globally:
```bash
npm install -g netlify-cli
```
2. Log in to Netlify:
```bash
netlify login
```
3. Initialize and deploy:
```bash
netlify deploy --prod
```
4. Follow the prompt to choose your publish directory (`dist`).

---

## ⚡ Features & How Storage Works on Netlify

| Host Environment | Storage Behavior |
| :--- | :--- |
| **Local Node / Express Server** | Saves uploaded files to server disk (`uploads/` folder). |
| **Netlify Deploy** | Uses high-speed browser **IndexedDB + Blob URLs**. Files persist in user's browser vault with batch uploads, file previews, mobile QR codes, and instant links! |

---

## 💡 Troubleshooting & FAQ

- **Q: Why does SPA routing work on refreshes?**  
  **A:** `netlify.toml` contains `[[redirects]] from = "/*" to = "/index.html" status = 200` which prevents 404 errors on page refresh.

- **Q: What is the maximum file size?**  
  **A:** Recommended up to 50 MB per file for browser storage.

- **Q: How do I set custom domain on Netlify?**  
  **A:** Go to **Site Configuration** -> **Domain management** -> **Add custom domain**.
