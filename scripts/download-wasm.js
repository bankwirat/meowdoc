const fs = require('fs');
const https = require('https');
const path = require('path');

const wasmDir = path.join(__dirname, '../wasm');
if (!fs.existsSync(wasmDir)) {
    fs.mkdirSync(wasmDir);
}

const files = [
    'tree-sitter-typescript.wasm',
    'tree-sitter-tsx.wasm',
    'tree-sitter-javascript.wasm',
    'tree-sitter-abap.wasm'
];

const baseUrl = 'https://unpkg.com/tree-sitter-wasms/out/';

files.forEach(file => {
    const url = baseUrl + file;
    const dest = path.join(wasmDir, file);
    const fileStream = fs.createWriteStream(dest);

    console.log(`Downloading ${url}...`);
    https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            // Handle redirect if needed
            const location = response.headers.location;
            let newUrl = location;
            if (location.startsWith('/')) {
                const u = new URL(url);
                newUrl = `${u.protocol}//${u.host}${location}`;
            }

            https.get(newUrl, (response2) => {
                response2.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`Downloaded ${file}`);
                });
            });
            return;
        }

        response.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Downloaded ${file}`);
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => { });
        console.error(`Error downloading ${file}: ${err.message}`);
    });
});
