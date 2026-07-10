// api/index.js
// GET /api?num=9876543210
//
// Proxies https://sbsakib.eu.cc/apis/num_info_v1 and reshapes the
// response into a clean, flat format.

const UPSTREAM_BASE = "https://sbsakib.eu.cc/apis/num_info_v1";
const UPSTREAM_KEY = "@Bunnym32";
const OWNER_TAG = "@th3bunny";

// ─────────────────────────────────────────────────
// Valid API keys — add/remove keys here to manage access.
// Anyone using your API must pass one of these as ?key=
// ─────────────────────────────────────────────────
const VALID_KEYS = [
  "@Bunnym32",
  "@rabbit",
  "@Bunny",
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
    number: info.num || num,
    name: info.name ?? null,
    fathername: info.fname ?? null,
    aadhar: info.aadhar ?? null,
    address: info.address ?? null,
    alt: info.alt ?? null,
    circle: info.circle ?? null,
    email: info.email ?? null,
    Owner: OWNER_TAG,
  };

  res.status(200).json(reshaped);
};
