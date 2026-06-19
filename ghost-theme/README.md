# The Indic View — Ghost Theme `v2.0.1`

A premium **Ghost 5** Handlebars theme for [The Indic View](https://the-indic-view-prod.fly.dev/) by Kartik Narayanan.  
Indian literary magazine aesthetic — Playfair Display headings, saffron/green/navy palette, clean long-form reading experience.

---

## Live site

| | URL |
|---|---|
| Blog | https://the-indic-view-prod.fly.dev/ |
| Ghost Admin | https://the-indic-view-prod.fly.dev/ghost/ |
| Fly.io app | `the-indic-view-prod` |

---

## File structure

```
ghost-theme/
├── package.json              version + Ghost engine constraint
├── default.hbs               site shell — <head>, fonts, ghost_head/foot, partials
├── index.hbs                 homepage: hero, featured post, post feed
├── post.hbs                  single post: reading bar, action ribbon, related essays
├── page.hbs                  static pages (show_title_and_feature_image guard)
├── author.hbs                author archive
├── tag.hbs                   tag archive with sidebar
├── partials/
│   ├── nav.hbs               sticky nav, tricolor strip, mobile drawer, dark-mode toggle
│   ├── footer.hbs            3-col links, tricolor strip, cream background
│   ├── logo-mark.hbs         80px logo-icon.png (mix-blend-mode: multiply)
│   ├── post-card.hbs         card with hover lift, tag pills, reading time
│   └── subscribe-band.hbs   email CTA band
└── assets/
    ├── css/main.css          ALL styles — CSS custom props at top, dark mode at bottom
    ├── js/main.js            nav scroll, mobile menu, reading progress, reactions,
    │                         share, dark-mode toggle, comments panel toggle
    └── images/
        ├── logo-icon.png     400×218 tree icon (mix-blend-mode: multiply)
        └── logo-with-name.png 820×447 full logo
```

---

## Design system

```css
/* Light mode */
--saffron:      #EF6C00   /* primary accent, CTAs, ribbon border */
--green:        #057200   /* tag pills */
--navy:         #1C2040   /* headings */
--ink:          #1E1610   /* body text */
--bg-soft:      #FAF8F3   /* page background */
--bg-band:      #F4EDE2   /* footer, subscribe band, action ribbon */

/* Dark mode (html.dark class) */
--navy:         #E8C87A   /* warm gold — replaces navy for headings in dark */
--bg:           #0C1227
--bg-soft:      #0F1530
--bg-band:      #111A38
--border:       #1C2B4E
```

**Fonts** (loaded via Google Fonts in `default.hbs`):  
Playfair Display · Source Serif 4 · DM Sans · DM Mono

---

## Post action ribbon (`post.hbs`)

After each article a centered ribbon provides:

| Group | Buttons |
|---|---|
| Reactions | ❤ Loved it (count) · 👎 Not for me (count) |
| Share | X · LinkedIn · Facebook · WhatsApp · Reddit · Copy link |
| Discussion | Chat bubble → expands Ghost comments panel inline |

Reaction counts are stored in cookies (no `localStorage`) per post slug.  
Comments panel is collapsed by default; clicking Discussion expands it with a smooth scroll.  
In dark mode the comments widget sits inside a cream `#FAF8F3` island (no iframe filter).

---

## Dark mode

- Detected via OS (`prefers-color-scheme: dark`) or manual toggle (moon/sun button in nav)
- Toggle sets `html.dark` / `html.light` class and writes a `tiv-theme` cookie
- Anti-FOUC: inline `<script>` in `default.hbs` reads the cookie and sets the class **before** first paint

---

## How to make changes and deploy

### 1 — Edit source files

Make your changes inside `ghost-theme/`. Key files:

- **Styles** → `assets/css/main.css` (all CSS variables are at the top of the file)
- **JS behaviour** → `assets/js/main.js`
- **Post layout** → `post.hbs`
- **Site shell / head** → `default.hbs`

### 2 — Re-zip (from repo root or `tiv-railway/`)

```bash
# Strip null bytes first (required — gscan fails otherwise)
for f in $(find ghost-theme -name "*.hbs"); do
  tr -d '\000' < "$f" > /tmp/c.hbs && mv /tmp/c.hbs "$f"
done

# Zip (macOS/Linux)
zip -r indic-view-v2.0.1.zip ghost-theme/ --exclude "*.DS_Store"
```

### 3 — Upload to Ghost

Ghost Admin → **Settings → Design & branding → Change theme → Upload** → select the zip → **Activate**

---

## Known gotchas

| Issue | Fix |
|---|---|
| gscan rejects theme | Never use double quotes **inside** `{{}}` helpers — always single quotes |
| `page.hbs` shows title on pages that shouldn't have it | Wrap title + feature image in `{{#if @page.show_title_and_feature_image}}` |
| `.gh-content` styles missing | The class is defined in `main.css` — do not remove it |
| Zip contains null bytes | Run the `tr -d '\000'` loop above before zipping |
| Ghost comments widget black in dark mode | CSS cream-island approach is used — do NOT add `filter: invert()` to iframes |
| `{{comments}}` singleton | Ghost ignores any second call to `{{comments}}` on the same page — only call it once |

---

## Fly.io deployment (infrastructure)

```bash
export PATH="$HOME/.fly/bin:$PATH"
flyctl auth login
flyctl ssh console -a the-indic-view-prod
```

Ghost runs on Alpine Linux with SQLite at `/var/lib/ghost/content/data/ghost.db`.  
Machine ID for restart: `8293e1c7765128`

```bash
flyctl machine restart 8293e1c7765128 -a the-indic-view-prod
```

---

## Stack

- Ghost 5 · Handlebars templates
- Fly.io (Alpine, SQLite)
- Vanilla CSS only — no frameworks
- Vanilla JS only — no libraries, no `localStorage`
