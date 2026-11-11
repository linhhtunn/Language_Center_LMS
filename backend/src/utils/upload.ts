import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';

// Thay cho IFormFile + IWebHostEnvironment.WebRootPath ben .NET.
// Ban .NET luu file vao wwwroot/uploads/<thu-muc>/... va tra URL "/uploads/<thu-muc>/<ten>".
// Ban Node luu vao config.uploadsDir (mac dinh backend/uploads) va giu NGUYEN dang URL do.

/**
 * Multer giu file trong bo nho (req.file.buffer / req.files) de controller tu kiem tra
 * duoi file, dung luong roi moi ghi bang saveUpload(). Mac dinh toi da 250MB moi file.
 *   router.post('/x', upload.single('file'), handler)
 *   router.post('/y', upload.array('files', 10), handler)
 *   router.post('/z', upload.any(), handler)   // khi ten field khong co dinh
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});

/** Duong dan tuyet doi tren dia cua 1 URL "/uploads/..." (null neu URL khong thuoc thu muc uploads). */
export function uploadUrlToDiskPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.split('?')[0].replace(/\\/g, '/');
  const idx = clean.toLowerCase().indexOf('/uploads/');
  if (idx < 0) return null;
  const rel = clean.slice(idx + '/uploads/'.length);
  const root = path.resolve(config.uploadsDir);
  const full = path.resolve(root, rel);
  return full.startsWith(root) ? full : null; // chan ../
}

/**
 * Ghi file vao uploads/<subfolder>/<ten>. Ten mac dinh: <guid><duoi file goc>.
 * Tra ve { url: "/uploads/<subfolder>/<ten>", fileName, diskPath, size }.
 */
export async function saveUpload(
  file: { buffer: Buffer; originalname: string },
  subfolder: string,
  fileName?: string,
) {
  const ext = path.extname(file.originalname).toLowerCase();
  const name = fileName ?? `${randomUUID()}${ext}`;
  const dir = path.resolve(config.uploadsDir, subfolder);
  await fs.mkdir(dir, { recursive: true });
  const diskPath = path.join(dir, name);
  await fs.writeFile(diskPath, file.buffer);
  const url = `/uploads/${subfolder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')}/${name}`;
  return { url, fileName: name, diskPath, size: file.buffer.length };
}

/** Xoa file theo URL "/uploads/..." - bo qua neu khong ton tai. */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  const p = uploadUrlToDiskPath(url);
  if (p) await fs.rm(p, { force: true });
}
