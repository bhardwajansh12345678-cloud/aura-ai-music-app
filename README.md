# Aura Music App - Setup & Run Guide

To run the application again, follow these simple steps:

### 1. Install Dependencies (First time only)
Open your terminal in this folder and run:
```bash
npm install
```

### 2. Start the Server
Run this command to start the backend (proxy and file server):
```bash
npm start
```
*You should see: `Server running at http://localhost:5500`*

### 4. Build Android APK (Optional)
If you want to run this as an Android app:
1.  **Install Android Studio**.
2.  **Sync assets**:
    ```bash
    npx cap copy android
    ```
3.  **Open in Android Studio**:
    ```bash
    npx cap open android
    ```
4.  In Android Studio, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

*Note: The mobile app is configured to bypass the local proxy and call APIs directly, as mobile environments typically don't have the same CORS restrictions as browsers.*

---

### **Key Features**
- **Search**: Find any song using the top search bar.
- **Sidebar**: Navigate between Home, Discover, and your Local Files.
- **Regional Playlists**: Click on genre links like "Bollywood" or "Punjabi" in the sidebar.
- **Local Music**: Click the upload icon in the top right to add your own `.mp3` files.

### **Troubleshooting**
- **Search fails**: Ensure the terminal running `npm start` is still open.
- **Playback error**: The app will automatically try to fix this by switching to a direct source. Check the browser console (F12) for details.
