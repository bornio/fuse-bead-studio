# Fuse Bead Studio

Fuse Bead Studio is a browser-based editor for creating fuse bead patterns on a virtual pegboard.

## Features

- Paint and erase tools
- Color palette selection
- Undo and redo
- Fused/ironed preview mode
- Save, load, rename, and delete designs in local storage
- Multiple board sizes

## Local Development

Prerequisites:

- Node.js 20+

Install and run:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Deployment (GitHub Pages)

This repository is configured to deploy automatically to GitHub Pages using GitHub Actions.

- Workflow file: `.github/workflows/deploy-pages.yml`
- Deploy trigger: push to `main`
- Live site: `https://bornio.github.io/fuse-bead-studio/`

If you rename the repository, update the Vite `base` path in `vite.config.ts` to match:

```ts
base: '/your-repo-name/'
```
