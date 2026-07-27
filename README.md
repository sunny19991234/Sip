# Sip

Sip is a personal water intake tracker built with React, TypeScript, Vite, and Supabase.

## Run locally

1. Install Node.js and npm.
2. Run `npm install`.
3. Create a `.env.local` file with:
   - `VITE_SUPABASE_URL=https://<project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon-key>`
4. Run `npm run dev`.

## Build for production

Run `npm run build`.

## Deploy to GitHub Pages

The repository includes a GitHub Actions workflow that deploys the contents of the `dist` folder to GitHub Pages on pushes to `main`.
