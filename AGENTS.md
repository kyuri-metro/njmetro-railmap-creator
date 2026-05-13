# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **client-side only** single-page React application (Nanjing Metro Platform Screen Door Badge Generator). There is no backend, no database, and no external services required for development.

### Tech Stack

- React 19 + TypeScript 5.9 + Vite 7 + Redux Toolkit
- Deployed to Cloudflare Pages (assets-only SPA)
- Package manager: **npm** (lockfile: `package-lock.json`)

### Running the Dev Server

```bash
npm run dev
```

The Vite dev server starts on `http://localhost:5173` by default. Use `--host 0.0.0.0` if you need external access.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (HMR enabled) |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Build + run via Wrangler (Cloudflare Pages local preview) |
| `npm run deploy` | Build + deploy to Cloudflare Pages (requires auth) |

### Type Checking / Lint

There is no dedicated lint script (no ESLint configured). Use TypeScript's type checker as the primary static analysis tool:

```bash
npx tsc -b
```

### Testing

No automated test framework is currently configured in this repository. Verify changes by:
1. Running `npx tsc -b` (type checking passes with no errors)
2. Running `npm run build` (production build succeeds)
3. Running `npm run dev` and visually inspecting the SVG badge output in the browser

### Notes

- The `@cloudflare/vite-plugin` emits a deprecation warning about the `punycode` module — this is harmless and can be ignored.
- No environment variables or secrets are needed to run the dev server.
- The app is entirely self-contained; all state lives in the Redux store (in-memory).
