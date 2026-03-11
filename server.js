const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const GOOD_DIR = path.join(__dirname, 'good');
const BAD_DIR = path.join(__dirname, 'bad');
const MAIN_DIR = __dirname;

// Ensure folders exist
if (!fs.existsSync(GOOD_DIR)) fs.mkdirSync(GOOD_DIR, { recursive: true });
if (!fs.existsSync(BAD_DIR)) fs.mkdirSync(BAD_DIR, { recursive: true });

function countImages(folder) {
    if(!fs.existsSync(folder)) return 0;
    return fs.readdirSync(folder).filter(f=>{
        const full = path.join(folder, f);
        const ext = path.extname(f).toLowerCase();
        return fs.statSync(full).isFile() && ['.jpg','.jpeg','.png','.gif'].includes(ext);
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
            const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                         ext === '.png' ? 'image/png' :
                         ext === '.gif' ? 'image/gif' : 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            res.end(data);
        });
    }
    // API: list images
    else if (pathname === '/api/list') {
        let folder;
        if(parsed.query.folder==='good') folder = GOOD_DIR;
        else if(parsed.query.folder==='bad') folder = BAD_DIR;
        else folder = MAIN_DIR;

        fs.readdir(folder, (err, files) => {
            if (err) return res.writeHead(500).end('Error reading folder');

            let images = files.filter(f => {
                const full = path.join(folder, f);
                const ext = path.extname(f).toLowerCase();
                return fs.statSync(full).isFile() && ['.jpg','.jpeg','.png','.gif'].includes(ext);
            });

            images.sort((a,b)=>{
                const aTime = fs.statSync(path.join(folder,a)).mtime.getTime();
                const bTime = fs.statSync(path.join(folder,b)).mtime.getTime();
                return bTime - aTime;
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(images.map(f=>`/${parsed.query.folder==='good'?'good/':parsed.query.folder==='bad'?'bad/':''}${f}`)));
        });
    }
    // API: image counts
    else if (pathname === '/api/counts') {
        const counts = {
            all: countImages(MAIN_DIR),
            good: countImages(GOOD_DIR),
            bad: countImages(BAD_DIR)
        };
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
                if(target==='good') destFolder = GOOD_DIR;
                else if(target==='bad') destFolder = BAD_DIR;
                else destFolder = MAIN_DIR;

                const srcPath = path.join(__dirname, image);
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
