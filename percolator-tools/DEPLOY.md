# Deploying Percolator Tools

## Dashboard

The dashboard is a Next.js app. It does **not** depend on `@percolatortool/sdk`; it uses `@solana/web3.js` and its own engine-state decoder.

### Option A: Vercel (recommended)

1. **From repo root** (e.g. GitHub → Vercel):
   - Import the repo in [Vercel](https://vercel.com).
   - Set **Root Directory** to `percolator-tools/dashboard`.
   - Vercel will detect Next.js. Deploy.

2. **From dashboard folder**:
   ```bash
   cd percolator-tools/dashboard
   pnpm install
   pnpm run build   # optional: verify first
   npx vercel       # or: vercel --prod
   ```

### Option B: Static export (e.g. GitHub Pages, S3)

1. In `percolator-tools/dashboard/next.config.ts` (or `.js`), set:
   ```js
   const nextConfig = { output: 'export' };
   ```
2. Build and deploy the `out` folder:
   ```bash
   cd percolator-tools/dashboard
   pnpm run build
   # Upload the contents of `out/` to your host.
   ```

### Option C: Node server

```bash
cd percolator-tools/dashboard
pnpm run build
pnpm start
# Or use output: 'standalone' in next.config and run .next/standalone/server.js
```

---

## SDK

**What it is:** `@percolatortool/sdk` is a separate package for **wrapper builders** and frontends: TypeScript types and instruction builders (deposit, withdraw, trade, keeper crank). The **keeper** uses it; the **dashboard** does not.

**Publishing (optional):**

- To use locally or in a monorepo: `npm install ./percolator-tools/sdk` or link via workspace.
- To publish to npm (for others to `npm install @percolatortool/sdk`):
  ```bash
  cd percolator-tools/sdk
  npm run build
  npm publish --access public
  ```
  Ensure the npm org/scope matches the package name (e.g. org `percolatortool` → `@percolatortool/sdk`). Scoped packages need `--access public` for open-source.

You don’t need to publish the SDK to deploy the dashboard.
