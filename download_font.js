const fs = require('fs');
const https = require('https');
const path = require('path');

const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
const outputPath = path.join('src', 'assets', 'fonts', 'Roboto-Regular.js');
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Downloading font from:', fontUrl);

https.get(fontUrl, (res) => {
    const data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(data);
        const base64 = buffer.toString('base64');
        const content = `export const font = "${base64}";`;
        fs.writeFileSync(outputPath, content);
        console.log('Font saved to:', outputPath);
    });
}).on('error', (err) => {
    console.error('Error downloading font:', err);
    process.exit(1);
});
