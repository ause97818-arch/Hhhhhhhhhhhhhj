# Num Info API

A tiny Vercel serverless API that proxies the SB-SAKIB number-info API
and reshapes the response into a flat, clean JSON format.

## Endpoint

```
GET /api?num=9876543210
```

### Success response
```json
{
  "number": "9883444273",
  "name": "JAGANNATH MAHANTA",
  "fathername": "Debendra Mahanta",
  "aadhar": null,
  "address": "!!!!Suarara Bankura!West Bengal!722203",
  "alt": "918918867089",
  "circle": "JIO WB",
  "email": null,
  "Owner": "@th3bunny"
}
```

### Error responses
- `400` — missing/invalid `num` query param
- `404` — upstream API found no info for that number
- `502` — upstream API unreachable or returned a non-OK status

## Deploy: GitHub → Vercel

1. Create a new GitHub repo and push these files exactly as they are:
   ```
   api/index.js
   package.json
   README.md
   vercel.json   (optional, included for clarity)
   ```
   ```bash
   git init
   git add .
   git commit -m "num info api"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New Project** → **Import**
   your GitHub repo.

3. Framework preset: leave as **Other** (Vercel auto-detects the `/api`
   folder — no build step, no config needed).

4. Click **Deploy**. Vercel will give you a URL like
   `https://your-project.vercel.app`.

5. Test it:
   ```
   https://your-project.vercel.app/api?num=9883444273
   ```

## Notes

- No dependencies needed — uses Node 18's built-in `fetch`, which Vercel
  supports natively.
- Only the **first** matching record is returned (the upstream API can
  return multiple duplicate entries for one number; this API picks the
  first one). Say the word if you'd instead like an array of all matches.
- `Owner` is a fixed, hardcoded tag on every response — change
  `OWNER_TAG` in `api/index.js` if you want to update it.
