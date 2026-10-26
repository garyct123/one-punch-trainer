// 無依賴 PNG 圖示產生器：深色底、黃色圓、紅色拳頭符號（簡化幾何）
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2, cy = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let col = [11, 15, 23];
      const d = Math.hypot(x - cx, y - cy) / size;
      if (d < 0.36) col = [255, 212, 0];               // 黃色光頭
      // 紅色拳頭：圓角方塊 + 拇指
      const inFist = u > 0.33 && u < 0.67 && v > 0.36 && v < 0.62;
      const knuckle = [0.375, 0.458, 0.542, 0.625].some((kx) => Math.hypot(u - kx, v - 0.38) < 0.045);
      const thumb = u > 0.33 && u < 0.6 && v > 0.55 && v < 0.64;
      const wrist = u > 0.4 && u < 0.6 && v >= 0.62 && v < 0.74;
      if (d < 0.36 && (inFist || knuckle || thumb || wrist)) col = [255, 59, 59];
      if (d < 0.36 && Math.abs(v - 0.5) < 0.006 && u > 0.36 && u < 0.64) col = [170, 30, 30];
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = col[0]; raw[i + 1] = col[1]; raw[i + 2] = col[2]; raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192));
writeFileSync('public/icons/icon-512.png', png(512));
writeFileSync('public/icons/apple-touch-icon.png', png(180));
writeFileSync('public/icons/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0b0f17"/><circle cx="50" cy="50" r="36" fill="#ffd400"/><text x="50" y="64" font-size="40" text-anchor="middle">👊</text></svg>`);
console.log('icons generated');
