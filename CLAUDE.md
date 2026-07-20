# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install --legacy-peer-deps   # required — geist pins next <15 but the project uses next 16
npm run dev      # start dev server (Next.js with Turbopack)
npm run build    # production build
npm run start    # run production build locally
```

There is no linter or test suite configured. Note: `tsconfig.json` `target` must be **ES2015+** (currently `ES2017`) or `next build` fails on `TS1252` for the function-in-block pattern used throughout `SpaceHero.tsx`.

## Architecture

**Stack**: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · MDX via `next-mdx-remote`

**Routing** follows the App Router convention — every `app/<route>/page.tsx` is a page. The main sections are:

| Route | File |
|-------|------|
| `/` | `app/page.tsx` → `MainMenu` — a scrollable space page: fixed backdrop + `SpaceHero` (first screen) + a `ProjectGrid` card grid |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` — a project write-up, space-themed (shared backdrop + side decor) |
| `/code`, `/design` | `app/{code,design}/page.tsx` — plain `BlogPosts` list per category. **Orphaned/unlinked** (the tabs were removed); reachable only by URL |
| `/og` | `app/og/route.tsx` — dynamic OG image generation |

There is no `/games` route or `games` category anymore (folded into `design`). The **`Code`/`Design` tabs are gone everywhere** — the hero's tabs and the navbar's tab links were replaced by the scroll-to-projects flow on `/` and a "Back to projects" link elsewhere.

**Layout** (`app/layout.tsx`): wraps every page with Geist fonts, `Navbar`, Vercel Analytics/Speed Insights, and `px-6 sm:px-8 py-10` body padding inside a `max-w-6xl` container. The footer is removed (`footer.tsx` unused). The `Navbar` (`'use client'`) returns `null` on `/` (the hero has no top nav); on every other page it renders a single **"← Back to projects"** dark-pill link (`/#projects`, which smooth-scrolls to the projects section).

**Homepage & interior composition**:
- `MainMenu` renders the scrollable homepage: `<SpaceBackdrop/>` + `<SpaceHero/>` + a `<section className="sp-projects" id="projects">` holding `<ProjectGrid/>`.
- **`SpaceBackdrop`** (`app/components/SpaceBackdrop.tsx`, client) — a `position: fixed` full-viewport layer: space gradient + a generated twinkling starfield. Stays put on scroll; the hero's transparent WebGL canvas layers over it. **The starfield lives here now, not in SpaceHero.**
- **`ProjectGrid`** (`app/components/ProjectGrid.tsx`) — responsive card grid of all posts (image or themed placeholder, category chip, title, 2-line summary, hover lift + image zoom), over a `.sp-projects` **scrim** that dims the fixed backdrop for readability.
- **`SpaceDecor`** (`app/components/SpaceDecor.tsx`, client) — a light decorative fixed Three.js layer for `/blog/[slug]`: reuses moon/planets/asteroids + one **static** TV (color-bars screen), only in the **side gutters** (camera fits by WIDTH so they never drift over the centered column), shown only `≥1200px`. Being `fixed`, it's identical on every page regardless of length.
- **Project detail** (`/blog/[slug]`) reuses `SpaceBackdrop` + `SpaceDecor`; MDX renders in a centered ~720px `.sp-article-wrap` panel with `.sp-prose` overrides that force light text (readable over the dark backdrop regardless of the viewer's color scheme).

**Posts / MDX pipeline**:
- All project posts live as `.mdx` files in `app/blog/posts/`
- `app/blog/utils.ts` exports `getBlogPosts()` which reads the filesystem at build/request time, parses YAML frontmatter manually (no library), and returns typed post objects
- Required frontmatter fields: `title`, `publishedAt` (YYYY-MM-DD), `summary`, `category` (`'design' | 'code'`); optional `image` (static path, used for screen textures — never point this at `/og?...`, see note below)
- `app/components/mdx.tsx` provides `CustomMDX` which wraps `MDXRemote` with custom components (anchored headings, `next/image` wrapper, `next/link` smart routing, `sugar-high` syntax highlighting). No remark-gfm — markdown pipe tables don't render; use the custom `<Table data={{headers, rows}} />` JSX component instead.
- `app/components/posts.tsx` exports `BlogPosts` — accepts an optional `category` prop to filter

**`next/image` gotcha**: any local `src` with a query string (e.g. `/og?title=...`) is blocked by `images.localPatterns` and throws at runtime. Don't reintroduce query-string image sources — use a static `image` field or a canvas-drawn placeholder instead.

**Styles** (`app/global.css`): uses `@import 'tailwindcss'` (Tailwind v4 syntax). The space theme lives here as `.sp-*` classes: `.sp-backdrop` (fixed gradient) + `.sp-star`/`.sp-star-field`, `.sp-hero` + hero text/links/`.sp-scroll-cue`, `.sp-projects`/`.sp-grid`/`.sp-card*` (project cards + scrim), `.sp-decor-canvas`, `.sp-navback`, `.sp-article-wrap` + `.prose.sp-prose` (light-themed MDX), plus base `.prose` for MDX. Theme colors are CSS vars on `:root`: `--void`, `--navy2`, `--code` (#6fb4ff), `--design` (#b39bff), `--pop-pink`, `--pop-teal`, `--cream`, `--warm`, `--sp-text`, `--sp-text2`. The `@apply` warnings in VS Code are a known false positive — Tailwind v4 processes them correctly.

**SpaceHero** (`app/components/SpaceHero.tsx`): client component — the hero (first ~100vh screen of the scrollable homepage). A single vanilla Three.js scene (r128, loaded at runtime via a CDN `<script>` tag through `app/lib/loadThree.ts` — **not** an npm package). Style is deliberately low-poly / flat-shaded: `MeshStandardMaterial({ flatShading: true })`. Scene contents:

- **Moon** — plain low-poly `IcosahedronGeometry(1.4, 2)` sphere, flat-shaded cream `0xe9e4f7`. Lower-left at `MOON_BASE_Y = -2.9` (below the bio).
- **Ringed/assorted planets** — `makePlanet(x,y,z,r,color,{ring,ringColor,ringTilt,detail})` builds each; pushed into a `planets[]` array that the animate loop bobs/spins. Scattered across the frame (never the upper-left bio zone).
- **Rocket** (with window) — lower-left near the moon, in open space (fully visible).
- **Asteroids** and **comets** with trailing tails.
- **Stacked TV pair** — hand-built from primitives (no external model). `buildTV(opts)` (opts: `{antennas, sideControls, bodyH, screenCY, screenCX, unit}`) returns `{group, screenMat, screenMesh, consoleLight, statusLights}`. A **big TV** (image screen, bottom control strip, no antennas) + a **compact top TV** (`unit 0.9`, `bodyH 2.4`, centered screen shifted left, **right-side control column**, dome + antennas). Screen is **inset** behind a proud 4-bar bezel.
- **Virgo constellation** — lines + star dots only.

**TV construction details** (world units; `unit` scales each body at build time — no external group scaling):
- Cabinet: `BoxGeometry(4.0, bodyH, 2.6)`, `FRONT_Z = 1.3`, slate-blue `0x565f92`, plus a **tapered CRT back** (two stepped boxes). Bezel = four dark `0x14162b` bars. Controls: big TV = bottom strip (speaker grille · buttons · dials); top TV = right-side column (`sideControls`). Antennas (dome + two V-splayed rods) only when `antennas`.
- Two screen canvases: **big** = project image only (`drawBigScreen`; color-bars test card + "CLICK TO VIEW" when no image); **small** = "CHECK OUT MY PROJECTS!" + `▸ NOW SHOWING` + auto-fit title (`drawSmallScreen`). `paintScreen(post)` repaints both. `applyCanvas` uses **no mipmaps + LinearFilter** (sharp text). No wire — the rocket floats free.
- The two TVs are **separate bodies inside a non-animated root `screenGroup`** (base `(4.0, -1.0, -0.5)`, `rot.y −0.55 / x 0.07 / z 0.05`; centered to `x 0` in stacked mode). Each **floats/rotates independently** in the animate loop (loose pair); the small TV sits above the big one (bottom-on-top, fronts co-planar).

DOM overlays (bio + contact links, the screen click target, a "Scroll down to see my projects!" pill cue) track 3D positions via `Vector3.project(camera)`. Camera auto-fits `CONTENT_HALF_HEIGHT`/`CONTENT_HALF_WIDTH`/`CONTENT_CENTER_Y`; keep new objects within roughly `x: [-8, 8]`, `y: [-5, 9]`.

**Responsive / render behavior** (key SpaceHero logic):
- **`relayout()`** (runs in `fitCamera` on every resize): measures the bio block (`.sp-hero-text`) in NDC and pushes any registered "floater" (moon/planets/asteroids/rocket, via `addFloater`) out of the text rectangle — right or down, smaller move wins — returning home when wide. Floaters **ease** toward targets (no teleport).
- **Stacked mode** (aspect `< 0.9`): camera drops the whole composition below the text and floaters pull toward center — a vertical column for portrait.
- **Two-pass render**: scene renders once without the TVs, then clears depth and renders only the TV stack → the **screens are always frontmost**.
- **Supersampling**: `setPixelRatio(min(max(dpr,2), 2.5))` for crisp screen text even on 1× monitors. Whites are off-white and the key light is warm/soft (less glare).

**SEO**: `app/sitemap.ts` exports the sitemap (deployed URL is `https://chrisk36.vercel.app/`). OG images are auto-generated at `/og?title=...` for posts without a custom image.

**Tailwind v4 note**: configuration is via `postcss.config.js` (`@tailwindcss/postcss` plugin) — there is no `tailwind.config.js`.

## SpaceHero style guide

Stay on the existing palette (CSS vars above, or the raw hex equivalents already used in `SpaceHero.tsx` — `0x6fb4ff` code blue, `0xb39bff` design purple, `0xffb05c` warm orange, `0xfdf6ec` cream), and stay low-poly/flat-shaded — don't introduce smooth-shaded or photorealistic materials.

**Astronaut** — the reference object for proportions and style. Proportioned head/torso/arms/legs, clear pose. If other objects drift in style, compare back against the astronaut for what "done" should feel like.

## Skills

One skill is installed in `.claude/skills/`:

| Skill | Source | Purpose |
|-------|--------|---------|
| `frontend-design` | `anthropics/skills` | Guidance for distinctive, opinionated UI/visual design — helps avoid templated defaults |

### Managing skills

```bash
npx skills find [query]                      # search the registry
npx skills add <owner/repo@skill>            # install a skill
npx skills add anthropics/skills@frontend-design   # reinstall this one
npx skills update                            # update all installed skills
npx skills check                             # check for updates
```

Skills are stored in `.claude/skills/` and loaded automatically by Claude Code. The `frontend-design` skill activates whenever you're building or redesigning UI — it guides toward deliberately distinctive choices rather than generic defaults.
