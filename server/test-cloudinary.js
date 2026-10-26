require('dotenv').config();

const https = require('https');

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key    = process.env.CLOUDINARY_API_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET;

console.log('cloud_name:', cloud_name);
console.log('api_key:', api_key);
console.log('api_secret:', api_secret);

// Test 1: Ping (just checks cloud exists)
function httpsGet(path, headers = {}) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path,
      method: 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.end();
  });
}

async function main() {
  // --- Test 1: Ping with Basic Auth ---
  const basicAuth = 'Basic ' + Buffer.from(api_key + ':' + api_secret).toString('base64');
  console.log('\n=== Ping with Basic Auth ===');
  const ping = await httpsGet(`/v1_1/${cloud_name}/ping`, { Authorization: basicAuth });
  console.log('Status:', ping.status, '| Body:', ping.body);

  // --- Test 2: Usage API ---
  console.log('\n=== Usage API (Basic Auth) ===');
  const usage = await httpsGet(`/v1_1/${cloud_name}/usage`, { Authorization: basicAuth });
  console.log('Status:', usage.status, '| Body:', usage.body.substring(0, 500));

  // --- Test 3: Resources API ---
  console.log('\n=== Resources API (Basic Auth) ===');
  const resources = await httpsGet(`/v1_1/${cloud_name}/resources/image`, { Authorization: basicAuth });
  console.log('Status:', resources.status, '| Body:', resources.body.substring(0, 500));

  // --- Test 4: Signed upload via raw HTTP ---
  console.log('\n=== Raw Signed Upload (no SDK) ===');
  const crypto = require('crypto');
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1')
    .update(paramsToSign + api_secret)
    .digest('hex');

  console.log('Signing string:', JSON.stringify(paramsToSign + api_secret));
  console.log('Signature:', signature);

  // Build multipart body manually
  const boundary = 'XaBoundary12345';
  const CRLF = '\r\n';
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';

  const parts = [
    `--${boundary}${CRLF}Content-Disposition: form-data; name="file"${CRLF}${CRLF}${tinyPng}${CRLF}`,
    `--${boundary}${CRLF}Content-Disposition: form-data; name="api_key"${CRLF}${CRLF}${api_key}${CRLF}`,
    `--${boundary}${CRLF}Content-Disposition: form-data; name="timestamp"${CRLF}${CRLF}${timestamp}${CRLF}`,
    `--${boundary}${CRLF}Content-Disposition: form-data; name="signature"${CRLF}${CRLF}${signature}${CRLF}`,
    `--${boundary}--${CRLF}`,
  ];
  const body = Buffer.from(parts.join(''));

  await new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloud_name}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        console.log('Upload Status:', res.statusCode);
        console.log('Upload Body:', data);
        resolve();
      });
    });
    req.on('error', e => { console.error('Error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

main().catch(console.error);
