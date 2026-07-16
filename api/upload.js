// /api/upload.js
// Single ingestion endpoint used by dev.html's docs, and by any external
// client (e.g. the WhatsApp bot) that wants a CDN URL back for a file.
//
// Runs as a Vercel Edge Function, so it can use the native Request/FormData
// APIs directly — no extra npm dependencies, no package.json changes needed.
//
// Reuses the exact same Cloudinary cloud name + unsigned preset that
// img.html / video.html / audio.html / doc.html / sticker.html already use,
// so every file this endpoint saves is stored and served exactly like the
// rest of the site (and works with the existing vercel.json /img|/vid|/aud|/doc
// rewrites).

export const config = { runtime: 'edge' };

const CLOUD_NAME = 'wdhnno7y';
const UPLOAD_PRESET = 'linkify_unsigned';

// Payload limits shown as badges on /dev
const LIMITS = {
  image: 10 * 1024 * 1024,   // 10MB
  video: 100 * 1024 * 1024,  // 100MB
  audio: 50 * 1024 * 1024,   // 50MB
  raw: 25 * 1024 * 1024,     // 25MB (documents)
};

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heic'];
const VIDEO_EXT = ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', '3gp'];
const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus'];

function classify(file) {
  const type = (file.type || '').toLowerCase();
  const ext = (file.name || '').toLowerCase().split('.').pop();

  if (type.startsWith('image/') || IMAGE_EXT.includes(ext)) {
    return { resourceType: 'image', prefix: 'img', kind: 'image', limit: LIMITS.image };
  }
  if (type.startsWith('video/') || VIDEO_EXT.includes(ext)) {
    return { resourceType: 'video', prefix: 'vid', kind: 'video', limit: LIMITS.video };
  }
  // Cloudinary stores audio under its "video" resource type.
  if (type.startsWith('audio/') || AUDIO_EXT.includes(ext)) {
    return { resourceType: 'video', prefix: 'aud', kind: 'audio', limit: LIMITS.audio };
  }
  return { resourceType: 'raw', prefix: 'doc', kind: 'document', limit: LIMITS.raw };
}

function cors(extra) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra,
  };
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ 'Content-Type': 'application/json' }),
  });
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  if (request.method !== 'POST') {
    return json({ status: 'error', message: 'Method not allowed. Use POST.' }, 405);
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return json({ status: 'error', message: 'Expected multipart/form-data with a "file" field.' }, 400);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return json({ status: 'error', message: 'Missing "file" field.' }, 400);
  }

  const { resourceType, prefix, kind, limit } = classify(file);

  if (file.size > limit) {
    return json({
      status: 'error',
      message: `File exceeds the ${Math.round(limit / (1024 * 1024))}MB limit for ${kind} uploads.`,
    }, 413);
  }

  const cloudForm = new FormData();
  cloudForm.append('file', file, file.name || 'upload');
  cloudForm.append('upload_preset', UPLOAD_PRESET);

  let cloudRes, cloudData;
  try {
    cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: 'POST',
      body: cloudForm,
    });
    cloudData = await cloudRes.json();
  } catch (err) {
    return json({ status: 'error', message: 'Could not reach storage backend.' }, 502);
  }

  if (!cloudRes.ok) {
    return json({
      status: 'error',
      message: (cloudData && cloudData.error && cloudData.error.message) || 'Upload failed.',
    }, 502);
  }

  // Turn Cloudinary's full delivery URL into our own short link, exactly
  // the same way the client-side pages already do (see shortenUrl() in
  // img.html): strip everything up to "/upload/", drop the "/v123.../"
  // version segment, then prefix with our short folder (img/vid/aud/doc).
  const marker = '/upload/';
  const idx = cloudData.secure_url.indexOf(marker);
  let tail = idx !== -1 ? cloudData.secure_url.slice(idx + marker.length) : cloudData.secure_url;
  tail = tail.replace(/^v[0-9]+\//, '');

  const filename = tail.split('/').pop();
  const origin = `https://${request.headers.get('host')}`;

  return json({
    status: 'success',
    filename,
    size_bytes: file.size,
    url: `${origin}/${prefix}/${tail}`,
  }, 200);
}
