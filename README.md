# Portfolio Blog Starter

This is a porfolio site template complete with a blog. Includes:

- MDX and Markdown support
- Optimized for SEO (sitemap, robots, JSON-LD schema)
- RSS Feed
- Dynamic OG images
- Syntax highlighting
- Tailwind v4
- Vercel Speed Insights / Web Analytics
- Geist font

## Demo

https://portfolio-blog-starter.vercel.app

## Running locally / setup on a new machine

> **Important — install with `--legacy-peer-deps`.** This repo uses **Tailwind CSS v4 (alpha)** with `next@16`, but `geist` still pins `next <15`, so a plain `npm install` fails on the peer conflict and Tailwind never builds — which makes the styling look broken / completely different.

```bash
npm install --legacy-peer-deps
npm run dev            # → http://localhost:3000
```

If you just pulled changes and the CSS looks wrong, do a clean reinstall and clear the build cache (stale `.next` and a bad install are the usual culprits):

```bash
rm -rf .next node_modules
npm install --legacy-peer-deps
npm run dev
```

Notes:

- `tsconfig.json` `target` must stay **ES2015+** (currently `ES2017`) or `npm run build` fails with `TS1252` on the function-in-block pattern in `SpaceHero.tsx`.
- The 3D hero/decor load **three.js r128 from a CDN at runtime** (not an npm dependency), so a network connection is needed for the space scene to render locally.

## How to Use

You can choose from one of the following two methods to use this repository:

### One-Click Deploy

Deploy the example using [Vercel](https://vercel.com?utm_source=github&utm_medium=readme&utm_campaign=vercel-examples):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/solutions/blog&project-name=blog&repository-name=blog)

### Clone and Deploy

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [pnpm](https://pnpm.io/installation) to bootstrap the example:

```bash
pnpm create next-app --example https://github.com/vercel/examples/tree/main/solutions/blog blog
```

Then, run Next.js in development mode:

```bash
pnpm dev
```

Deploy it to the cloud with [Vercel](https://vercel.com/templates) ([Documentation](https://nextjs.org/docs/app/building-your-application/deploying)).
