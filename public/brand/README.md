# Brand Assets Directory

Place your custom logo, favicon, and typography assets in the respective folders:

### 1. Logo (`public/brand/logo/` or `public/brand/logo.svg`)
- Primary Logo: `public/brand/logo.svg` or `public/brand/logo.png`
- Logo Icon / Mark: `public/brand/logo/mark.svg` or `public/brand/logo/mark.png`

### 2. Favicon (`public/brand/favicon/` or `public/brand/favicon.ico`)
- Standard Favicon: `public/brand/favicon.ico` or `public/brand/favicon.svg`
- Web Manifest Icon: `public/brand/favicon/icon-192.png`, `public/brand/favicon/icon-512.png`
- Apple Touch Icon: `public/brand/favicon/apple-touch-icon.png`

### 3. Typography Images / Wordmarks (`public/brand/typography/`)
- Header typography images or wordmark assets: `public/brand/typography/wordmark.svg` or `.png`

---

### How to use in Next.js code:
All assets inside `public/brand/` are directly accessible at the URL path `/brand/...`:
- Logo URL: `/brand/logo.svg` (or `/brand/logo/logo.png`)
- Favicon URL: `/brand/favicon.ico`
- Typography Image URL: `/brand/typography/wordmark.png`
