# HANDOFF — The Indic View Ghost Theme

**For:** Claude Code (or any AI assistant continuing this work)  
**Version at handoff:** `indic-view v2.0.1`  
**GitHub:** `https://github.com/kartiknarayananD/the-indic-view` (branch: `main`)  
**Live site:** `https://the-indic-view-prod.fly.dev/`  
**Ghost Admin:** `https://the-indic-view-prod.fly.dev/ghost/`  
**Fly.io app name:** `the-indic-view-prod`

---

## Repository layout

```
the-indic-view/               ← GitHub repo root
├── ghost-theme/              ← ALL theme source files (edit these)
│   ├── package.json          version 2.0.1, Ghost engine constraint
│   ├── default.hbs           site shell
│   ├── index.hbs             homepage
│   ├── post.hbs              single post
│   ├── page.hbs              static pages
│   ├── author.hbs            author archive
│   ├── tag.hbs               tag archive
│   ├── partials/
│   │   ├── nav.hbs
│   │   ├── footer.hbs
│   │   ├── logo-mark.hbs
│   │   ├── post-card.hbs
│   │   └── subscribe-band.hbs
│   ├── assets/
│   │   ├── css/main.css      ~2,338 lines, all styles
│   │   ├── js/main.js        ~385 lines, all JS
│   │   └── images/
│   │       ├── logo-icon.png         400×218 tree icon
│   │       └── logo-with-name.png    820×447 full logo
│   └── README.md             quick-start for humans
└── indic-view-v2.0.1.zip     ready-to-upload to Ghost Admin
```

---

## Design system (CSS custom properties in `main.css` `:root`)

```css
/* Light mode */
--saffron:       #EF6C00   /* primary accent, CTAs, ribbon border */
--saffron-light: #FFF3E0
--saffron-mid:   #FB8C00
--green:         #057200   /* tag pills */
--green-light:   #E8F5E9
--navy:          #1C2040   /* headings */
--ink:           #1E1610   /* body text */
--bg:            #FFFFFF
--bg-soft:       #FAF8F3   /* page background */
--bg-band:       #F4EDE2   /* footer, subscribe band, action ribbon */
--border:        #E8DDD0
--muted:         #8A7968

/* Dark mode — applied on html.dark (see dark mode section) */
--navy:          #E8C87A   /* warm gold replaces navy */
--bg:            #0C1227
--bg-soft:       #0F1530
--bg-band:       #111A38
--border:        #1C2B4E
```

Fonts loaded via Google Fonts in `default.hbs`:
- **Playfair Display** — headings (`--font-heading`)
- **Source Serif 4** — body text (`--font-body`)
- **DM Sans** — UI chrome (`--font-ui`)
- **DM Mono** — labels, code (`--font-mono`)

---

## Hard constraints (user preferences — do not violate)

1. **No third-party CSS frameworks** — zero Tailwind, Bootstrap, etc.
2. **No JS frameworks** — vanilla JS only, no jQuery, no Alpine, no React
3. **No `localStorage` or `sessionStorage`** — use cookies instead
4. **Logos use `mix-blend-mode: multiply`** — do not re-process PNGs
5. **No double quotes inside `{{}}` helpers** — gscan (Ghost theme validator) rejects them; always use single quotes inside Handlebars expressions

---

## Dark mode implementation

### How it works
- `html.dark` / `html.light` class on the `<html>` element drives all dark styles
- Manual toggle: moon/sun button in `nav.hbs` calls `applyThemeClass()` in `main.js`
- OS default: `prefers-color-scheme: dark` media query in `main.css` applies dark vars when no class is set
- Preference persisted in cookie `tiv-theme` (not localStorage)

### Anti-FOUC (flash of unstyled content)
Inline `<script>` at the **top of `<head>`** in `default.hbs`, before any stylesheet:
```html
<script>
(function(){
    var m=document.cookie.match(/(?:^|; )tiv-theme=([^;]*)/);
    if(m){document.documentElement.classList.add(decodeURIComponent(m[1]));}
})();
</script>
```
This reads the cookie and adds `dark` or `light` to `<html>` before the browser paints anything.

### Dark mode CSS location
All dark overrides are at the **bottom of `main.css`** in two blocks:
```css
@media (prefers-color-scheme: dark) { html:not(.light) { ... } }
html.dark { ... }
```

### Ghost comments widget in dark mode
**CRITICAL — do not change this approach:**
- Ghost's `{{comments}}` helper renders an iframe you cannot fully style from outside
- `colorScheme="light"` is passed to keep the widget always light: `{{comments colorScheme="light"}}`
- In dark mode, the surrounding `.post-comments-inner` gets a cream island:
  ```css
  html.dark .post-comments-inner {
      background: #FAF8F3;
      border-radius: 8px;
      padding: 8px;
  }
  ```
- **Do NOT** use `filter: invert(1) hue-rotate(180deg)` on the iframe — it caused a black background + hot-pink text glitch
- `main.js` has `applyCommentsFilter()` which explicitly clears any stale inline `filter` style on the iframe

---

## Post page layout (`post.hbs`) — order of sections

```
<article>
  <header>           title, excerpt, author meta, top share button
  <figure>           feature image (if any)
  <section.post-content>   article body (.gh-content class)
  <footer>           author card, tags ("Filed under")

  <div.post-action-bar>    ← ACTION RIBBON (reactions + share + discussion)
  <div.post-comments>      ← COMMENTS PANEL (collapsed by default)

  <section.related-essays> ← "You might also enjoy" grid
</article>
```

### Action ribbon (`.post-action-bar`)
- `id="postActionBar"` + `data-post-slug="{{slug}}"` — JS reads slug for reaction cookies
- Three groups separated by `.action-bar-sep` dividers:
  1. **Reactions** — Like (❤), Dislike (👎) — both are `<button>` elements
  2. **Share** — X, LinkedIn, Facebook, WhatsApp, Reddit (all `<a>` links), Copy link (`<button>`)
  3. **Discussion** — `<button id="commentsToggleBtn">` (only rendered when `@site.comments_enabled`)
- CSS: `justify-content: center`, `border-top: 2px solid var(--saffron)`, `background: var(--bg-band)`
- Mobile (≤600px): `.action-bar-label { display: none }` — icons only

### Comments panel
- `id="commentsPanel"`, default CSS: `display: none` (collapsed)
- CSS class `.is-expanded` toggled by JS sets `display: block`
- Contains `{{comments colorScheme="light"}}` — **only called once per page** (Ghost ignores a second call)
- `aria-expanded` attribute on the toggle button is kept in sync by JS

---

## JavaScript architecture (`main.js`, ~385 lines, IIFE, strict mode)

Sections in order:
1. **Theme helpers** — `getEffectiveTheme()`, `applyThemeClass()`, `syncCommentWidget()`
2. **Comments filter** — `applyCommentsFilter()` clears stale iframe filters (runs on load + theme change)
3. **Comments panel toggle** — `#commentsToggleBtn` click handler, smooth scroll
4. **Theme toggle button** — `.theme-toggle-btn` click handler
5. **Mobile menu** — open/close/overlay, `aria-expanded`, `body.menu-open`
6. **Nav scroll shadow** — adds `.is-scrolled` to `#siteHeader` after 60px scroll
7. **Reading progress bar** — `#readingProgress` width tracks scroll through `.post-content`
8. **Card animations** — IntersectionObserver adds `.is-visible` to `.js-animate-card` elements
9. **Active nav state** — URL-based, sets `.active` on `.js-tag-nav` and `.js-nav-home` links
10. **Page fade-in** — removes `no-js` and `is-loading` classes
11. **Share helpers** — `window.sharePost()`, `window.copyPostLink()`, toast notification
12. **Reactions** — cookie-based like/dislike, toggle behaviour (click again to un-react)

### Reactions cookie format
Cookie name: `tiv_reaction_<post-slug>` (e.g. `tiv_reaction_he-too-fell-in-love`)  
Cookie value: URL-encoded JSON — `{"reaction":"like","likes":3,"dislikes":0}`  
Expiry: 365 days

---

## Handlebars conventions and known gscan rules

| Rule | Detail |
|---|---|
| No double quotes in `{{}}` | Use `{{url absolute='true'}}` not `{{url absolute="true"}}` |
| `{{comments}}` singleton | Ghost silently ignores a second `{{comments}}` call on the same page — only ever put it in one place |
| `page.hbs` title guard | Title + feature image must be wrapped in `{{#if @page.show_title_and_feature_image}}` or every static page shows them |
| `.gh-content` required | Ghost injects post body HTML into an element with this class — it must have styles in `main.css` |
| Null bytes break gscan | Strip before zipping: `for f in $(find ghost-theme -name '*.hbs'); do tr -d '\000' < "$f" > /tmp/c.hbs && mv /tmp/c.hbs "$f"; done` |
| `{{#get}}` for nav tags | Navigation uses `{{#get "tags" filter="slug:[rationalism,...]"}}` — Ghost's `{{@site.navigation}}` is not used for the tag nav |

---

## How to make a change and deploy

### Step 1 — edit files
All edits go inside `ghost-theme/`. The most common targets:
- `assets/css/main.css` — all styling (CSS variables at top, dark mode at bottom)
- `assets/js/main.js` — all behaviour
- `post.hbs` — post page layout and action ribbon
- `default.hbs` — site shell, anti-FOUC script, font loading

### Step 2 — bump version
Edit `ghost-theme/package.json` — increment `"version"` (e.g. `2.0.1` → `2.0.2`).  
Rename the zip accordingly.

### Step 3 — zip

```bash
# Run from the repo root (where ghost-theme/ lives)

# 1. Strip null bytes (always do this first)
for f in $(find ghost-theme -name '*.hbs'); do
  tr -d '\000' < "$f" > /tmp/c.hbs && mv /tmp/c.hbs "$f"
done

# 2. Remove old zip, create new one
rm -f indic-view-v2.0.1.zip
zip -r indic-view-v2.0.2.zip ghost-theme/ --exclude "*.DS_Store"
```

### Step 4 — upload to Ghost
Ghost Admin → **Settings → Design & branding → Change theme → Upload** → select zip → **Activate**

### Step 5 — push to GitHub
If working in an environment where `git remote add` and `git push` are available:
```bash
git add -A
git commit -m "feat: your change description"
git push origin main
```

If in a restricted environment (like Replit), use the GitHub API via Node.js:
```js
// Pattern used in previous sessions:
// 1. GET /repos/{owner}/git/refs/heads/main          → get parent SHA
// 2. GET /repos/{owner}/git/commits/{sha}            → get tree SHA
// 3. POST /repos/{owner}/git/blobs                   → one per changed file
// 4. POST /repos/{owner}/git/trees  (base_tree: treeSha, tree: [{path, mode, sha}])
// 5. POST /repos/{owner}/git/commits (message, tree, parents)
// 6. PATCH /repos/{owner}/git/refs/heads/main  {sha: newCommitSha, force: false}
// Authorization: token $GITHUB_TOKEN
```

---

## Fly.io / infrastructure

Ghost runs on Fly.io (Alpine Linux, SQLite).

```bash
export PATH="$HOME/.fly/bin:$PATH"
flyctl auth login
flyctl ssh console -a the-indic-view-prod
```

SQLite database path inside the container: `/var/lib/ghost/content/data/ghost.db`  
Machine ID: `8293e1c7765128`

Restart the machine after infra changes:
```bash
flyctl machine restart 8293e1c7765128 -a the-indic-view-prod
```

### Known database fix
One post (`slug: he-too-fell-in-love`) had corrupt HTML causing a 500 error. Fix applied:
```bash
node -e "
const Database = require('/var/lib/ghost/current/node_modules/better-sqlite3');
const db = new Database('/var/lib/ghost/content/data/ghost.db');
db.prepare(\"UPDATE posts SET html=NULL WHERE slug='he-too-fell-in-love'\").run();
db.close();
"
```
Setting `html=NULL` forces Ghost to re-render from its Mobiledoc source on next request. This was already applied — only redo if the post regresses.

---

## What was changed in v2.0.1 (from v1.x)

| Area | What changed | Why |
|---|---|---|
| Post action ribbon | Replaced separate reactions block + sidebar share + author bio with a single centered `.post-action-bar` | Cleaner layout; all post-read actions in one place |
| Share targets | X, LinkedIn, Facebook, WhatsApp, Reddit + Copy link | Broader sharing surface |
| Share buttons | X and LinkedIn are icon-only (no label text on desktop); all labels hidden on mobile | Keeps ribbon compact |
| Comments panel | Collapsed by default; expanded via "Discussion" button with smooth scroll | Avoids visual clutter; keeps comments opt-in |
| Dark mode comments | Removed `invert(1) hue-rotate(180deg)` iframe filter; replaced with cream island CSS on `.post-comments-inner` | Filter caused black+pink glitch in Ghost's comment widget |
| Dark mode toggle | Moon/sun button in nav, writes `tiv-theme` cookie | No localStorage (per user constraint) |
| Anti-FOUC | Inline script in `<head>` reads cookie before paint | Prevents white flash when dark mode is set |
| Reactions storage | Cookie `tiv_reaction_<slug>` (URL-encoded JSON) | No localStorage per user constraint |
| Version | `package.json` → `2.0.1` | Matches zip filename |

---

## What is NOT done / potential next work

- **Reaction counts are per-device** (cookie-based). If Kartik wants shared/aggregated counts, a backend is needed (e.g. a lightweight API endpoint + a database). The Ghost theme cannot do this alone.
- **Search** — no search UI exists yet. Ghost has a built-in search API (`{{ghost_head}}` includes the Sodo search script by default in Ghost 5).
- **Newsletter archive page** — no dedicated page template for past newsletters.
- **Tag page sidebar** — `tag.hbs` has a sidebar slot; content can be added there.
- **PWA / offline** — not implemented; vanilla JS with no service worker.

---

## Quick reference: key IDs and class names

| ID / class | Element | Purpose |
|---|---|---|
| `#siteHeader` | `<header>` in nav | Gets `.is-scrolled` on scroll |
| `#mobileMenuBtn` | button | Opens mobile drawer |
| `#mobileMenuClose` | button | Closes mobile drawer |
| `#mobileMenu` | `<nav>` | Mobile drawer itself |
| `#mobileOverlay` | `<div>` | Overlay behind drawer |
| `#readingProgress` | `<div>` | Reading progress bar |
| `#postActionBar` | `<div>` | Action ribbon on post pages |
| `#reactionLike` | `<button>` | Like button |
| `#reactionDislike` | `<button>` | Dislike button |
| `#likeCount` | `<span>` | Like count display |
| `#dislikeCount` | `<span>` | Dislike count display |
| `#commentsToggleBtn` | `<button>` | Opens/closes comments panel |
| `#commentsPanel` | `<div>` | Comments panel container |
| `.post-comments-inner` | `<div>` | Wraps Ghost widget; gets cream island in dark mode |
| `.js-animate-card` | any | IntersectionObserver scroll animation target |
| `.js-tag-nav` | `<a>` | Nav tag links; gets `.active` on match |
| `.js-nav-home` | `<a>` | Home nav link; gets `.active` on `/` |
| `.copy-toast` | `<div>` (dynamic) | "Link copied!" toast, created/removed by JS |
| `.is-scrolled` | on `#siteHeader` | Nav shadow state |
| `.is-expanded` | on `#commentsPanel` | Comments panel open state |
| `.is-active` | on reaction buttons | Pressed / selected state |
| `.is-visible` | on `.js-animate-card`, overlay, toast | Visibility states |
| `.menu-open` | on `<body>` | Locks scroll when mobile menu open |
| `html.dark` | `<html>` | Dark mode active |
| `html.light` | `<html>` | Light mode forced (overrides OS) |
| `html.no-js` | `<html>` | Removed by JS on load |
| `body.is-loading` | `<body>` | Opacity 0; removed by JS for fade-in |
