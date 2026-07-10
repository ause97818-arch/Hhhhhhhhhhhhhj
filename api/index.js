// api/index.js
// GET /api?num=9876543210
//
// Proxies https://sbsakib.eu.cc/apis/num_info_v1 and reshapes the
// response into a clean, flat format.

const UPSTREAM_BASE = "https://sbsakib.eu.cc/apis/num_info_v1";
const UPSTREAM_KEY = "@Bunnym32";
const OWNER_TAG = "@th3bunny";

// ─────────────────────────────────────────────────
// Response store — every SUCCESSFUL (status:true) response gets
// appended here as { "Response": {...} } inside an array.
//
// ⚠️ IMPORTANT Vercel limitation: serverless functions have an
// ephemeral, read-only filesystem (except /tmp) and no shared memory
// across instances. This module-level array + /tmp file will hold data
// only for as long as THIS warm function instance stays alive — it
// resets on cold start, redeploy, or when Vercel spins up a second
// instance under load. It is NOT permanent storage.
// If you need responses to survive forever/across instances, they need
// to go to an external store (Vercel KV, Upstash Redis, MongoDB Atlas,
// or committed to GitHub like the database.json in your bot). Say the
// word and I'll wire one of those in.
// ─────────────────────────────────────────────────
const fs = require("fs");
const TMP_STORE_FILE = "/tmp/database.json";
let responseStore = [];

function loadStoreFromTmp() {
  try {
    if (fs.existsSync(TMP_STORE_FILE)) {
      const raw = fs.readFileSync(TMP_STORE_FILE, "utf8").trim();
      responseStore = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(responseStore)) responseStore = [];
    }
  } catch (e) {
    responseStore = [];
  }
}

function saveResponse(responseObj) {
  loadStoreFromTmp();
  responseStore.push({ Response: responseObj });
  try {
    fs.writeFileSync(TMP_STORE_FILE, JSON.stringify(responseStore, null, 2), "utf8");
  } catch (e) {
    console.error("Could not write to /tmp store:", e.message);
  }
}

// Valid API keys — add/remove keys here to manage access.
// Anyone using your API must pass one of these as ?key=

const VALID_KEYS = [
  "@Bunnym32",
  "@rabbit",
  "@Bunny",
  "sayan",
  // "@AnotherKey1",
  // "@AnotherKey2",
];

const NO_KEY_MESSAGE =
  "Use Api Key , If you Want to Buy New Api key Contact with Developer: @th3bunny | Telegram";
const INVALID_KEY_MESSAGE =
  "Use Active Api Key . For Buy New Api Key Contact with Developer: @th3bunny | Telegram";

module.exports = async (req, res) => {
  // CORS (harmless to allow, remove if you don't want it)
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = (req.query && req.query.key) || "";

  if (!key) {
    res.status(401).json({ status: false, message: NO_KEY_MESSAGE });
    return;
  }

  if (!VALID_KEYS.includes(key)) {
    res.status(403).json({ status: false, message: INVALID_KEY_MESSAGE });
    return;
  }

  const num = (req.query && req.query.num) || "";

  if (!num || !/^\d{10}$/.test(num)) {
    res.status(400).json({
      status: false,
      message: "Provide a valid 10 digit 'num' query parameter. Example: /api?num=9876543210",
    });
    return;
  }

  const upstreamUrl = `${UPSTREAM_BASE}?key=${encodeURIComponent(UPSTREAM_KEY)}&num=${encodeURIComponent(num)}`;

  let data;
  try {
    const upstreamRes = await fetch(upstreamUrl, { method: "GET" });
    if (!upstreamRes.ok) {
      res.status(502).json({
        status: false,
        message: `Upstream API returned HTTP ${upstreamRes.status}`,
      });
      return;
    }
    data = await upstreamRes.json();
  } catch (err) {
    res.status(502).json({
      status: false,
      message: "Failed to reach upstream API",
      error: err.message,
    });
    return;
  }

  const isSuccess = data && (data.status === true || String(data.status).toLowerCase() === "true");

  if (!isSuccess || !data.result || typeof data.result !== "object") {
    res.status(404).json({
      status: false,
      message: "No info found for this number",
    });
    return;
  }

  // Pull out the first numeric-keyed entry ("0", "1", ...), skip the
  // stray top-level "developer" key that the upstream API mixes into result
  const firstKey = Object.keys(data.result).find(
    (k) => String(parseInt(k, 10)) === k && typeof data.result[k] === "object"
  );

  if (!firstKey) {
    res.status(404).json({
      status: false,
      message: "No info found for this number",
    });
    return;
  }

  const info = data.result[firstKey];

  const reshaped = {
    number: info.num || num,\n
    name: info.name ?? null,\n
    fathername: info.fname ?? null,\n
    aadhar: info.aadhar ?? null,\n
    address: info.address ?? null,\n
    alt: info.alt ?? null,\n
    circle: info.circle ?? null,\n
    email: info.email ?? null,\n\n
    Owner: OWNER_TAG,\n
  };

  // Log this successful (status:true) response into the store
  saveResponse(reshaped);

  res.status(200).json(reshaped);
};
