# Adarsh Shankar Portfolio — Agent Notes

## Project
B2B Email Campaign Specialist portfolio. Production site for Adarsh Shankar.

## Stack
- Vite (vanilla) + Tailwind CSS v4 + Alpine.js 3.14.1 (CDN)
- Mobile-first, plain semantic HTML, minimal custom CSS

## Breakpoints (custom Tailwind v4 theme tokens)
| Name  | Width   | Tailwind prefix |
|-------|---------|-----------------|
| phone | 320px+  | `phone:`        |
| tab   | 700px+  | `tab:`          |
| lap   | 1080px+ | `lap:`          |

## Section Order
1. Sticky Nav
2. Hero (id="hero")
3. Case Studies (id="work")
4. Packages (id="packages")
5. Proof — Dashboard + Reports (id="proof")
6. Testimonial (id="testimonials")
7. Contact (id="contact")
8. Footer

## Hard Rules
- No About section. No Services section.
- Headshot is in Contact only.
- Exactly one testimonial — no carousel.
- Mobile pricing = compact 3-col table (not 3 stacked cards).
- Dashboard video: no autoplay on mobile. Autoplay muted on tab+.
- Contact form: 3 fields mobile (Name, Email, Need). 4 fields tab+ (+ Budget).

## Color Tokens
```
--color-bg: #141210
--color-surface: #1E1B18
--color-surface-raised: #252119
--color-border: rgba(48,43,38,0.6)
--color-text: #EDE6DC
--color-muted: #9C9188
--color-faint: #5A5755
--color-accent: #E07A58
--color-accent-hover: #F0906A
--color-success: #6DAA45
--color-footer: #0F0D0B
```

## Design Reference (Stitch)
Stitch screens saved in `.stitch/designs/` — PNG screenshots and HTML files.
Screens: hero, packages, contact, footer, about (ignore), services (ignore),
work, proof, testimonials.

## Assets Needed (currently placeholders)
- `/public/assets/video/dashboard-desktop.mp4`
- `/public/assets/video/dashboard-tablet.mp4`
- `/public/assets/video/dashboard-poster.jpg`
- `/public/assets/headshot/headshot-mobile.jpg`
- `/public/assets/headshot/headshot-tablet.jpg`
- `/public/assets/headshot/headshot-desktop.jpg`
- `/public/assets/screenshots/` — campaign screenshots for case study galleries

## ffmpeg Commands
```bash
# Desktop video
ffmpeg -i source.mp4 -vf scale=1920:1080 -c:v libx264 -crf 23 -an dashboard-desktop.mp4

# Tablet video
ffmpeg -i source.mp4 -vf scale=1280:720 -c:v libx264 -crf 25 -an dashboard-tablet.mp4

# Poster frame
ffmpeg -i source.mp4 -vframes 1 -q:v 2 dashboard-poster.jpg
```

## Dev
```bash
bun run dev -- --host
```
