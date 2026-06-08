import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = path.join(__dirname, '..', 'files');

// Allowed file extensions for security
const ALLOWED_EXTENSIONS = ['.zip', '.pdf', '.md', '.txt'];

export default function handler(req, res) {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: 'Missing file name parameter (?name=filename.zip)' });
  }

  // Sanitize: prevent path traversal
  const basename = path.basename(name);
  const ext = path.extname(basename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(403).json({ error: `File type '${ext}' is not allowed for download.` });
  }

  const filePath = path.join(FILES_DIR, basename);

  // Ensure the resolved path is still inside FILES_DIR
  if (!filePath.startsWith(FILES_DIR)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `File '${basename}' not found.` });
  }

  const stat = fs.statSync(filePath);
  const mimeTypes = {
    '.zip': 'application/zip',
    '.pdf': 'application/pdf',
    '.md':  'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  res.setHeader('Content-Disposition', `attachment; filename="${basename}"`);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'no-store');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    console.error('[download] stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream file.' });
    }
  });
}
