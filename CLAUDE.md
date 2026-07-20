# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Next.js with Turbopack)
npm run build    # production build
npm run start    # run production build locally
```

There is no linter or test suite configured.

## Architecture

**Stack**: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · MDX via `next-mdx-remote`

**Routing** follows the App Router convention — every `app/<route>/page.tsx` is a page. The main sections are:

| Route | File |
|-------|------|
| `/` | `app/page.tsx` → `MainMenu` → `SpaceHero` — full 3D space-themed hero, IS the homepage |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` |
| `/code`, `/design` | `app/{code,design}/page.tsx` — plain `BlogPosts` list per category |
| `/og` | `app/og/route.tsx` — dynamic OG image generation |

There is no `/games` route or `games` category anymore — it was folded into `design` and removed everywhere (see git history if you need the old code).

**Layout** (`app/layout.tsx`): wraps every page with Geist fonts, `Navbar`, Vercel Analytics/Speed Insights, and `px-6 sm:px-8 py-10` body padding inside a `max-w-6xl` container. The footer has been removed (`footer.tsx` still exists but is not used). The `Navbar` is a `'use client'` component that uses `usePathname` to detect the home route — on `/` it positions itself absolutely over the hero with white text; on all other routes it uses normal flow with `mb-16`.

**Posts / MDX pipeline**:
- All project posts live as `.mdx` files in `app/blog/posts/`
- `app/blog/utils.ts` exports `getBlogPosts()` which reads the filesystem at build/request time, parses YAML frontmatter manually (no library), and returns typed post objects
- Required frontmatter fields: `title`, `publishedAt` (YYYY-MM-DD), `summary`, `category` (`'design' | 'code'`); optional `image` (static path, used for screen textures — never point this at `/og?...`, see note below)
- `app/components/mdx.tsx` provides `CustomMDX` which wraps `MDXRemote` with custom components (anchored headings, `next/image` wrapper, `next/link` smart routing, `sugar-high` syntax highlighting). No remark-gfm — markdown pipe tables don't render; use the custom `<Table data={{headers, rows}} />` JSX component instead.
- `app/components/posts.tsx` exports `BlogPosts` — accepts an optional `category` prop to filter

**`next/image` gotcha**: any local `src` with a query string (e.g. `/og?title=...`) is blocked by `images.localPatterns` and throws at runtime. Don't reintroduce query-string image sources — use a static `image` field or a canvas-drawn placeholder instead.

**Styles** (`app/global.css`): uses `@import 'tailwindcss'` (Tailwind v4 syntax). The space theme lives here as `.sp-*` classes (hero container, star field, constellation, hero text, highlight-screen DOM overlays, dot pagination, the "browse all projects" signpost), plus `.prose` styles for MDX content. Theme colors are CSS vars on `:root`: `--void`, `--navy2`, `--code` (#6fb4ff), `--design` (#b39bff), `--pop-pink`, `--pop-teal`, `--cream`, `--warm`, `--sp-text`, `--sp-text2`. The `@apply` warnings in VS Code are a known false positive — Tailwind v4 processes them correctly.

**SpaceHero** (`app/components/SpaceHero.tsx`): client component, and the entire homepage. A single vanilla Three.js scene (r128, loaded at runtime via a CDN `<script>` tag through `app/lib/loadThree.ts` — **not** an npm package). Style is deliberately low-poly / flat-shaded: `MeshStandardMaterial({ flatShading: true })`. Scene contents:

- **Crescent moon** — built from `CylinderGeometry` frustum segments (N=20) swept along an arc, with `ConeGeometry` cusp tips. Uses `openEnded: true` + 12% segment overlap to eliminate gap notches at junctions. Located at `MOON_BASE_Y = -1.6`.
- **Ringed planet**, **rocket** (with window), **low-poly humanoid astronaut** (head/torso/hips/arms/legs, one arm raised) — all built from primitive geometries, flat-shaded.
- **Asteroids** and **comets** with trailing tails.
- **Jeff Larson TV** (`/public/old-tv-jeff.glb`, 82 KB, CC-BY via Poly Pizza) — loaded via `GLTFLoader` from the same CDN, attached to a `screenGroup`. It cycles through the 6 most recent posts, displaying their `metadata.image` (or a canvas-drawn placeholder) on a `PlaneGeometry` screen overlaid inside the TV's screen bezel. Attribution shown in `.sp-model-credit` DOM overlay.
- **Virgo constellation** — lines + star dots only.

**TV model critical details** (hard-won from bbox logging — do not change these without re-verifying):
- Model bbox: size `(1.200, 1.776, 0.910)`, center `(0.189, 0.122, 0.216)` in local space. Antennas inflate the Y bbox significantly (`tvSize.y = 1.776` includes antennas — don't use it for screen height math).
- **No `rotation.y = Math.PI`** — the model's screen face already points in +Z (toward camera). Centering: `tvTemplate.position.set(-tvCenter.x, -tvCenter.y, -tvCenter.z)`.
- Screen mesh (`group1190924403`) center in TV local space: `(0.169, -0.285, 0.456)`. After centering, the screen plane is placed at `x = 0.169 - tvCenter.x`, `y = -0.285 - tvCenter.y`, `z = tvSize.z * 0.5 - 0.01`. Dimensions: `0.65 × 0.50` in screenGroup local space.
- `screenGroup` is scaled by `mainS = TARGET_W / tvSize.x = 4.0 / 1.2 = 3.333`, then positioned at `(3.0, -0.9, -0.5)` with `rotation.y = -0.65`, `rotation.x = 0.07`.

A handful of DOM overlays (bio copy, screen click target, dot pagination, Code/Design buttons) are positioned on top of the canvas using `Vector3.project(camera)` so they track 3D objects' on-screen position at any viewport size. The camera auto-fits a fixed content bounding box (`CONTENT_HALF_HEIGHT`/`CONTENT_HALF_WIDTH`/`CONTENT_CENTER_Y` constants near the top of the file). Keep new objects within roughly `x: [-8, 8]`, `y: [-5, 9]` world units to stay in frame.

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
