const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const MAIN_DIR = __dirname;

// === PNG tEXt/iTXt chunk reader ===
function readPngTextChunks(filePath) {
    try {
        const fileSize = fs.statSync(filePath).size;
        if (fileSize < 8) return {};
        const fd = fs.openSync(filePath, 'r');
        const sig = Buffer.alloc(8);
        fs.readSync(fd, sig, 0, 8, 0);
        if (sig[0] !== 0x89 || sig[1] !== 0x50 || sig[2] !== 0x4E || sig[3] !== 0x47) {
            fs.closeSync(fd); return {};
        }
        const result = {};
        let offset = 8;
        while (offset + 12 <= fileSize) {
            const hdr = Buffer.alloc(8);
            if (fs.readSync(fd, hdr, 0, 8, offset) < 8) break;
            const chunkLen = hdr.readUInt32BE(0);
            const chunkType = hdr.slice(4, 8).toString('ascii');
            if (chunkType === 'IEND') break;
            if ((chunkType === 'tEXt' || chunkType === 'iTXt') && chunkLen > 0 && chunkLen < 10*1024*1024) {
                const data = Buffer.alloc(chunkLen);
                fs.readSync(fd, data, 0, chunkLen, offset + 8);
                const nul = data.indexOf(0);
                if (nul > 0) {
                    const kw = data.slice(0, nul).toString('latin1');
                    if (chunkType === 'tEXt') {
                        result[kw] = data.slice(nul + 1).toString('latin1');
                    } else {
                        let pos = nul + 3;
                        const l1 = data.indexOf(0, pos);
                        if (l1 < 0) { offset += 12 + chunkLen; continue; }
                        const l2 = data.indexOf(0, l1 + 1);
                        if (l2 < 0) { offset += 12 + chunkLen; continue; }
                        result[kw] = data.slice(l2 + 1).toString('utf8');
                    }
                }
            }
            offset += 12 + chunkLen;
        }
        fs.closeSync(fd);
        return result;
    } catch(e) { return {}; }
}

// Server-side metadata cache: filepath -> { mtime, meta }
const serverMetaCache = new Map();
function getFileMeta(filePath) {
    try {
        if (!fs.existsSync(filePath)) { serverMetaCache.delete(filePath); return {}; }
        const mtime = fs.statSync(filePath).mtimeMs;
        const cached = serverMetaCache.get(filePath);
        if (cached && cached.mtime === mtime) return cached.meta;
        const ext = path.extname(filePath).toLowerCase();
        const meta = ext === '.png' ? readPngTextChunks(filePath) : {};
        serverMetaCache.set(filePath, { mtime, meta });
        return meta;
    } catch(e) { return {}; }
}

// Get all subfolders
function getSubfolders() {
    return fs.readdirSync(MAIN_DIR)
        .filter(f => {
            const full = path.join(MAIN_DIR, f);
            return fs.statSync(full).isDirectory() && !f.startsWith('.');
        })
        .sort();
}

// Ensure common folders exist
const GOOD_DIR = path.join(__dirname, 'good');
const BAD_DIR = path.join(__dirname, 'bad');
if (!fs.existsSync(GOOD_DIR)) fs.mkdirSync(GOOD_DIR, { recursive: true });
if (!fs.existsSync(BAD_DIR)) fs.mkdirSync(BAD_DIR, { recursive: true });

function countImages(folder) {
    if(!fs.existsSync(folder)) return 0;
    return fs.readdirSync(folder).filter(f=>{
        const full = path.join(folder, f);
        const ext = path.extname(f).toLowerCase();
        return fs.statSync(full).isFile() && ['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg','.tiff','.tif','.ico','.jxl','.avif'].includes(ext);
    }).length;
}

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsed.pathname);

    // Serve HTML
    if (pathname === '/' || pathname === '/index.html') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) return res.writeHead(500).end('Error loading HTML');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
    // Serve images
    else if (fs.existsSync(path.join(__dirname, pathname.slice(1)))) {
        const filePath = path.join(__dirname, pathname.slice(1));
        fs.readFile(filePath, (err, data) => {
            if (err) return res.writeHead(404).end('Not found');
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.webm': 'video/webm',
                '.bmp': 'image/bmp',
                '.svg': 'image/svg+xml',
                '.tiff': 'image/tiff',
                '.tif': 'image/tiff',
                '.ico': 'image/x-icon',
                '.jxl': 'image/jxl',
                '.avif': 'image/avif'
            };
            const mime = mimeTypes[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        });
    }
    // API: image metadata (reads PNG tEXt chunks)
    else if (pathname === '/api/meta') {
        const imgParam = parsed.query.image;
        if (!imgParam) return res.writeHead(400).end('Missing image param');
        const cleanPath = imgParam.startsWith('/') ? imgParam.slice(1) : imgParam;
        const fullPath = path.resolve(path.join(MAIN_DIR, cleanPath));
        if (!fullPath.startsWith(MAIN_DIR)) return res.writeHead(403).end('Forbidden');
        if (!fs.existsSync(fullPath)) return res.writeHead(404).end('Not found');
        const stat = fs.statSync(fullPath);
        const meta = getFileMeta(fullPath);
        const result = {
            filename: path.basename(fullPath),
            size_kb: Math.round(stat.size / 1024),
            modified: stat.mtime,
            ...meta
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    }
    // API: list folders
    else if (pathname === '/api/folders') {
        const folders = getSubfolders();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(folders));
    }
    // API: list images
    else if (pathname === '/api/list') {
        let folder;
        const folderParam = parsed.query.folder;
        
        if(folderParam === 'root' || !folderParam) {
            folder = MAIN_DIR;
        } else {
            folder = path.join(MAIN_DIR, folderParam);
        }
        
        if (!fs.existsSync(folder)) {
            return res.writeHead(404).end('Folder not found');
        }

        fs.readdir(folder, (err, files) => {
            if (err) return res.writeHead(500).end('Error reading folder');

            let images = files.filter(f => {
                const full = path.join(folder, f);
                const ext = path.extname(f).toLowerCase();
                return fs.statSync(full).isFile() && ['.jpg','.jpeg','.png','.gif','.webp','.webm','.bmp','.svg','.tiff','.tif','.ico','.jxl','.avif'].includes(ext);
            });

            images.sort((a,b)=>{
                const aTime = fs.statSync(path.join(folder,a)).mtime.getTime();
                const bTime = fs.statSync(path.join(folder,b)).mtime.getTime();
                return bTime - aTime;
            });

            // Server-side filter: only search positive_prompt inside user_metadata
            const filterText = (parsed.query.filter || '').toLowerCase().trim();
            if (filterText) {
                images = images.filter(f => {
                    const meta = getFileMeta(path.join(folder, f));
                    const umRaw = meta['user_metadata'] || meta['user metadata'] || '';
                    try {
                        const um = JSON.parse(umRaw);
                        return String(um.positive_prompt || '').toLowerCase().includes(filterText);
                    } catch(e) {
                        return false;
                    }
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            const prefix = folderParam && folderParam !== 'root' ? `${folderParam}/` : '';
            res.end(JSON.stringify(images.map(f=>`/${prefix}${f}`)));
        });
    }
    // API: image counts
    else if (pathname === '/api/counts') {
        const folders = getSubfolders();
        const counts = { root: countImages(MAIN_DIR) };
        folders.forEach(folder => {
            counts[folder] = countImages(path.join(MAIN_DIR, folder));
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(counts));
    }
    // API: move image
    else if (pathname === '/api/move' && req.method==='POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', ()=>{
            try{
                const { image, target } = JSON.parse(body);
                let destFolder;
                
                if(target === 'root') {
                    destFolder = MAIN_DIR;
                } else {
                    destFolder = path.join(MAIN_DIR, target);
                    // Ensure target folder exists
                    if (!fs.existsSync(destFolder)) {
                        fs.mkdirSync(destFolder, { recursive: true });
                    }
                }

                const srcPath = path.join(__dirname, image.startsWith('/')? image.slice(1) : image);
                const destPath = path.join(destFolder, path.basename(image));

                fs.rename(srcPath, destPath, err=>{
                    if(err) return res.writeHead(500).end('Failed to move image');
                    res.writeHead(200).end('OK');
                });
            } catch(e) {
                res.writeHead(400).end('Invalid request');
            }
        });
    }
    else {
        res.writeHead(404).end('Not found');
    }
});

const PORT = 3500;
server.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));
