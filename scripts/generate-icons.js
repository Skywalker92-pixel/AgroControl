const fs = require('fs');
const path = require('path');

// SVG content for AgroControl
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="100" fill="#059669"/>
  <!-- Truck / Cart icon stylized -->
  <path d="M110 330 A 30 30 0 1 0 170 330 A 30 30 0 1 0 110 330 Z" fill="#ffffff" />
  <path d="M330 330 A 30 30 0 1 0 390 330 A 30 30 0 1 0 330 330 Z" fill="#ffffff" />
  <path d="M90 180 L 290 180 L 290 300 L 90 300 Z" fill="#ffffff" opacity="0.9" />
  <path d="M290 220 L 370 220 L 410 270 L 410 300 L 290 300 Z" fill="#ffffff" />
  <path d="M305 235 L 360 235 L 390 270 L 305 270 Z" fill="#059669" />
  <!-- Sprout leaf over truck -->
  <path d="M220 120 C 220 120, 260 120, 270 160 C 270 160, 230 170, 220 120 Z" fill="#34d399" />
  <path d="M220 135 C 220 135, 185 130, 180 165 C 180 165, 215 170, 220 135 Z" fill="#10b981" />
  <path d="M220 135 L 220 180" stroke="#34d399" stroke-width="6" stroke-linecap="round" />
</svg>`;

const publicDir = path.join(__dirname, '..', 'frontend', 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'vite.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), svgContent, 'utf8');

console.log('Icons generated successfully');
