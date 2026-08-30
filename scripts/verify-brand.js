const fs = require('node:fs');
const path = require('node:path');

const BRAND_DIR = path.join(__dirname, '../assets/brand');

const EXPECTED_FILES = [
  // Master
  'master/meyalo-mark.svg',
  'master/meyalo-wordmark.svg',
  'master/meyalo-horizontal.svg',
  'master/meyalo-stacked.svg',
  // Mark
  'mark/meyalo-mark-teal.svg',
  'mark/meyalo-mark-ink.svg',
  'mark/meyalo-mark-white.svg',
  'mark/meyalo-mark-black.svg',
  'mark/meyalo-mark-teal-16.png',
  'mark/meyalo-mark-teal-512.png',
  'mark/meyalo-mark-teal-1024.png',
  // Logo
  'logo/horizontal/meyalo-horizontal-teal-ink.svg',
  'logo/horizontal/meyalo-horizontal-teal-ink.png',
  'logo/stacked/meyalo-stacked-light.svg',
  'logo/stacked/meyalo-stacked-light.png',
  'logo/stacked/meyalo-stacked-dark.png',
  // App Icon
  'app-icon/app-icon-1024.png',
  'app-icon/ios-icon-1024.png',
  'app-icon/adaptive-icon-foreground.png',
  'app-icon/monochrome-icon.png',
  // Favicon
  'favicon/favicon.ico',
  'favicon/apple-touch-icon.png',
  'favicon/favicon-32x32.png',
  // Social
  'social/avatar-512.png',
  // Splash
  'splash/splash-light.png',
  'splash/splash-dark.png',
];

let failed = false;

console.log('=== Meyalo Brand Asset Verification ===\n');

// Check assets/brand exists
if (!fs.existsSync(BRAND_DIR)) {
  console.error(`❌ Brand directory does not exist: ${BRAND_DIR}`);
  process.exit(1);
}
console.log(`✅ Brand directory exists: ${BRAND_DIR}`);

// Verify all expected files
EXPECTED_FILES.forEach((relPath) => {
  const fullPath = path.join(BRAND_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Missing asset: ${relPath}`);
    failed = true;
    return;
  }

  const stats = fs.statSync(fullPath);
  if (stats.size === 0) {
    console.error(`❌ Empty asset: ${relPath}`);
    failed = true;
  } else {
    console.log(`✅ Verified: ${relPath} (${stats.size} bytes)`);
  }
});

console.log('\n=======================================');
if (failed) {
  console.error(
    '❌ Verification FAILED: Some branding assets are missing or invalid.',
  );
  process.exit(1);
} else {
  console.log(
    '🎉 Verification PASSED: All canonical branding assets are complete and correct!',
  );
  process.exit(0);
}
