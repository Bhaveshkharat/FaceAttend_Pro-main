# 📱 Icon Replacement Guide

This guide explains how to change the app icon for all platforms (Android, iOS, Web, Chrome Extension).

## 🎨 Step 1: Prepare Your New Icon

1. **Create or obtain your new icon image**
   - Recommended size: **1024x1024 pixels** (square)
   - Format: **PNG** with transparency support
   - Make sure it looks good at small sizes (it will be scaled down)

## 📱 Step 2: Replace Icons for Different Platforms

### **A. Main App Icon (iOS & General)**

**File to replace:** `ExpoApp/assets/images/icon.png`

1. Replace `icon.png` with your new icon (keep the filename as `icon.png`)
2. Recommended size: 1024x1024px

### **B. Android Icons**

**Files to replace:**
- `ExpoApp/assets/images/android-icon-foreground.png` (your icon, transparent background)
- `ExpoApp/assets/images/android-icon-background.png` (solid color/pattern background)

**Steps:**
1. Create a **foreground** version:
   - Your icon on transparent background
   - Recommended size: 1024x1024px
   - Save as `android-icon-foreground.png`

2. Create a **background** version:
   - Solid color or pattern
   - Recommended size: 1024x1024px
   - Save as `android-icon-background.png`
   - The background color is also set in `app.json` (currently `#E6F4FE`)

### **C. Web Favicon**

**File to replace:** `ExpoApp/assets/images/favicon.png`

1. Create a smaller version: **32x32px** or **64x64px**
2. Replace `favicon.png` with your new favicon

### **D. Chrome Extension Icons**

**Files to create:** `ChromeExtension/icon16.png`, `icon48.png`, `icon128.png`

You need **three sizes**:
- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

**Quick way to create these:**
1. Use an online tool like [favicon.io](https://favicon.io/favicon-converter/) or [realfavicongenerator.net](https://realfavicongenerator.net/)
2. Upload your main icon (1024x1024px)
3. Download the generated sizes
4. Rename and place them in `ChromeExtension/` folder

### **E. Splash Screen (Optional)**

**File to replace:** `ExpoApp/assets/images/splash-icon.png`

1. Replace `splash-icon.png` if you want a different splash screen icon
2. Size: 200x200px (or larger, will be scaled)

## 🔄 Step 3: Rebuild After Icon Changes

### **For Android/iOS:**
```bash
cd ExpoApp
expo run:android  # or expo run:ios
# OR for production builds:
eas build --platform android
eas build --platform ios
```

### **For Web & Chrome Extension:**
```bash
cd ExpoApp
npx expo export -p web
# Then copy dist/ contents to ChromeExtension/ folder
```

### **For Chrome Extension:**
1. After copying web build, make sure `icon16.png`, `icon48.png`, `icon128.png` are in `ChromeExtension/`
2. Go to `chrome://extensions/`
3. Click **Reload** on your extension

## 📝 Current Icon Configuration

**Main Icon:** `ExpoApp/assets/images/icon.png`  
**Android Foreground:** `ExpoApp/assets/images/android-icon-foreground.png`  
**Android Background:** `ExpoApp/assets/images/android-icon-background.png`  
**Web Favicon:** `ExpoApp/assets/images/favicon.png`  
**Splash Icon:** `ExpoApp/assets/images/splash-icon.png`  
**Chrome Extension:** `ChromeExtension/icon16.png`, `icon48.png`, `icon128.png`

## 💡 Tips

- **Test at small sizes:** Your icon will appear small on devices, so make sure it's recognizable at 16x16px
- **Use transparency wisely:** Transparent backgrounds work well for foreground icons
- **Keep it simple:** Complex designs don't scale well to small sizes
- **Consistent branding:** Use the same icon design across all platforms for brand consistency

## 🛠️ Tools for Creating Icons

- **Online Icon Generators:**
  - [favicon.io](https://favicon.io/) - Free favicon generator
  - [realfavicongenerator.net](https://realfavicongenerator.net/) - Comprehensive favicon generator
  - [icon.kitchen](https://icon.kitchen/) - Android icon generator

- **Design Tools:**
  - Figma (free, web-based)
  - Canva (free, web-based)
  - Adobe Illustrator / Photoshop (paid)
