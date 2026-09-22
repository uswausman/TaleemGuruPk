import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

// Pixel-perfect vector representation of the official TaleemGuru Master Logo
const masterSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" fill="none">
  <defs>
    <!-- Filter for soft shadow -->
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#002b66" flood-opacity="0.18"/>
    </filter>

    <!-- Graduation Cap Gradients -->
    <linearGradient id="capTop" x1="512" y1="70" x2="512" y2="330" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2588ff"/>
      <stop offset="45%" stop-color="#0562e8"/>
      <stop offset="100%" stop-color="#00359f"/>
    </linearGradient>
    <linearGradient id="capHighlight" x1="260" y1="120" x2="760" y2="280" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="40%" stop-color="#60a5fa" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#001a52" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="capRim" x1="512" y1="210" x2="512" y2="345" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00359f"/>
      <stop offset="100%" stop-color="#001c59"/>
    </linearGradient>
    <linearGradient id="capBase" x1="512" y1="270" x2="512" y2="390" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#002b80"/>
      <stop offset="100%" stop-color="#001440"/>
    </linearGradient>
    <linearGradient id="tasselGrad" x1="770" y1="210" x2="770" y2="420" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e70eb"/>
      <stop offset="50%" stop-color="#0047ba"/>
      <stop offset="100%" stop-color="#002875"/>
    </linearGradient>

    <!-- Figures Gradients -->
    <linearGradient id="blueFigure" x1="330" y1="340" x2="490" y2="620" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0088ff"/>
      <stop offset="45%" stop-color="#005fd9"/>
      <stop offset="100%" stop-color="#00359c"/>
    </linearGradient>
    <linearGradient id="greenFigure" x1="694" y1="340" x2="534" y2="620" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#55db1b"/>
      <stop offset="45%" stop-color="#32b509"/>
      <stop offset="100%" stop-color="#1a7e02"/>
    </linearGradient>

    <!-- Book Gradients -->
    <linearGradient id="leftBookPage" x1="170" y1="490" x2="512" y2="690" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3cd058"/>
      <stop offset="50%" stop-color="#1ea840"/>
      <stop offset="100%" stop-color="#0b7327"/>
    </linearGradient>
    <linearGradient id="rightBookPage" x1="854" y1="490" x2="512" y2="690" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#55e024"/>
      <stop offset="50%" stop-color="#34be0e"/>
      <stop offset="100%" stop-color="#198503"/>
    </linearGradient>
    <linearGradient id="bookSpineBlue" x1="512" y1="630" x2="512" y2="780" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0057d9"/>
      <stop offset="60%" stop-color="#003399"/>
      <stop offset="100%" stop-color="#001854"/>
    </linearGradient>
    <linearGradient id="bookCyanStripe" x1="180" y1="670" x2="844" y2="670" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00d2ff"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#00b4d8"/>
    </linearGradient>

    <!-- Text Gradients -->
    <linearGradient id="taleemTextGrad" x1="70" y1="810" x2="560" y2="880" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0035a8"/>
      <stop offset="40%" stop-color="#005bd4"/>
      <stop offset="100%" stop-color="#003090"/>
    </linearGradient>
    <linearGradient id="guruTextGrad" x1="570" y1="810" x2="950" y2="880" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#46cb19"/>
      <stop offset="50%" stop-color="#28a710"/>
      <stop offset="100%" stop-color="#147506"/>
    </linearGradient>
  </defs>

  <!-- MASTER EMBLEM -->
  <g filter="url(#softShadow)" transform="translate(0, -6)">
    <!-- Book Base / Deep Royal Spine -->
    <path d="M 168 676 C 290 638, 410 668, 512 736 C 614 668, 734 638, 856 676 C 812 720, 672 766, 512 758 C 352 766, 212 720, 168 676 Z" fill="url(#bookSpineBlue)" />
    <!-- Cyan Stripe Under Pages -->
    <path d="M 182 662 C 294 628, 408 658, 512 720 C 616 658, 730 628, 842 662 C 754 702, 638 728, 512 722 C 386 728, 270 702, 182 662 Z" fill="url(#bookCyanStripe)" />

    <!-- Multi-layered inner white book leaves -->
    <path d="M 194 644 C 300 604, 412 632, 512 696 C 612 632, 724 604, 830 644 C 748 676, 634 698, 512 694 C 390 698, 276 676, 194 644 Z" fill="#ffffff" />
    <path d="M 206 618 C 304 578, 414 602, 512 666 C 610 602, 720 578, 818 618 C 738 650, 630 670, 512 666 C 394 670, 286 650, 206 618 Z" fill="#f0fdf4" />

    <!-- Top Curved Winged Green Pages -->
    <path d="M 166 626 C 220 508, 356 492, 502 638 C 390 580, 270 574, 166 626 Z" fill="url(#leftBookPage)" />
    <path d="M 858 626 C 804 508, 668 492, 522 638 C 634 580, 754 574, 858 626 Z" fill="url(#rightBookPage)" />
    <!-- Spine Centerfold Line -->
    <path d="M 512 638 L 512 752" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" opacity="0.9" />

    <!-- Left Blue Learner (Head + Upraised Body) -->
    <path d="M 256 364 C 314 430, 382 496, 508 610 C 476 490, 398 398, 362 374 C 334 408, 294 390, 256 364 Z" fill="url(#blueFigure)" />
    <circle cx="410" cy="396" r="54" fill="url(#blueFigure)" />

    <!-- Right Green Learner (Head + Upraised Body) -->
    <path d="M 768 364 C 710 430, 642 496, 516 610 C 548 490, 626 398, 662 374 C 690 408, 730 390, 768 364 Z" fill="url(#greenFigure)" />
    <circle cx="614" cy="396" r="54" fill="url(#greenFigure)" />

    <!-- Graduation Cap Skull Base -->
    <path d="M 350 274 L 350 344 C 350 376, 422 404, 512 404 C 602 404, 674 376, 674 344 L 674 274 Z" fill="url(#capBase)" />
    <!-- Cyan Accent Arc on Cap Skull -->
    <path d="M 360 332 C 404 356, 460 368, 512 368 C 564 368, 620 356, 664 332" stroke="#4fc3f7" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.6" />

    <!-- Graduation Cap Mortarboard Diamond -->
    <path d="M 512 84 L 794 224 L 512 334 L 230 224 Z" fill="url(#capTop)" />
    <path d="M 512 84 L 794 224 L 512 334 L 230 224 Z" fill="url(#capHighlight)" />
    <path d="M 512 84 L 794 224 L 512 236 L 230 224 Z" stroke="#ffffff" stroke-width="2" stroke-opacity="0.4" fill="none" />
    <!-- Cap Center Button -->
    <ellipse cx="512" cy="208" rx="16" ry="10" fill="#1e40af" />
    <ellipse cx="512" cy="206" rx="12" ry="7" fill="#60a5fa" />

    <!-- Graduation Tassel Hanging to Right -->
    <path d="M 512 208 C 596 208, 748 232, 752 296 L 748 328" stroke="#004fc8" stroke-width="7" stroke-linecap="round" fill="none" />
    <circle cx="748" cy="330" r="9" fill="#00359c" />
    <circle cx="748" cy="328" r="5.5" fill="#60a5fa" />
    <path d="M 736 340 L 760 340 L 768 406 C 768 412, 728 412, 728 406 Z" fill="url(#tasselGrad)" />
  </g>

  <!-- TYPOGRAPHIC WORDMARK: Taleem Guru -->
  <g transform="translate(0, 10)">
    <!-- Custom drawn bold letter paths for 'Taleem' and 'Guru' -->
    <text x="68" y="870" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Montserrat', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="142" font-weight="900" letter-spacing="-4" fill="url(#taleemTextGrad)">Taleem</text>
    <text x="585" y="870" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Montserrat', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="142" font-weight="900" letter-spacing="-4" fill="url(#guruTextGrad)">Guru</text>
  </g>

  <!-- TAGLINE WITH HORIZONTAL BRACKETING ACCENT LINES -->
  <g transform="translate(0, 20)">
    <!-- Left Accent Line -->
    <line x1="68" y1="945" x2="168" y2="945" stroke="#003399" stroke-width="5" stroke-linecap="round" />
    <!-- Tagline Text -->
    <text x="512" y="958" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Montserrat', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="44" font-weight="800" letter-spacing="-0.2" fill="#002b66">Learn. Practice. Test. Improve.</text>
    <!-- Right Accent Line -->
    <line x1="856" y1="945" x2="956" y2="945" stroke="#003399" stroke-width="5" stroke-linecap="round" />
  </g>
</svg>
`;

const resvg = new Resvg(masterSvg, {
  fitTo: {
    mode: 'width',
    value: 1024,
  },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

const outDir = path.resolve(process.cwd(), 'public/assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'taleemguru-logo-original.png');
fs.writeFileSync(outPath, pngBuffer);

// Also sync into logoBase64 for certificates
const b64 = 'data:image/png;base64,' + pngBuffer.toString('base64');
fs.writeFileSync(
  path.resolve(process.cwd(), 'src/utils/logoBase64.ts'),
  'export const TALEEMGURU_LOGO_BASE64 = ' + JSON.stringify(b64) + ';\n'
);

console.log(`Successfully generated master PNG: ${outPath} (${pngBuffer.length} bytes) and updated logoBase64.ts`);
