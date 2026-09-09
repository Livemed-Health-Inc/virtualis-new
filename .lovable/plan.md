# Plan: Export project source as a downloadable zip

## Goal
Give Saamer a single zip file containing the project source code so he can download it.

## What goes in the archive
- All project source and config: `src/`, `public/`, `supabase/`, `docs/`, `package.json`, `bun.lock`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `components.json`, `bunfig.toml`, `AGENTS.md`, `README.md`, `roadmap.md`, `.prettierrc`, `.prettierignore`, `.lovable/` (plans, project metadata), `.github/` (CI).
- `.env` is **excluded** — it contains backend publishable keys, redirect URLs, and server-only config. It must not be shipped in a downloadable bundle.

## What is excluded
- `node_modules/` (383 MB; would make the archive unusable)
- `.git/` (history, not source)
- `.output/`, `.vinxi/`, `dist/` (build artifacts)
- `.env` and any other `.env*` files (secrets/config)

## How
1. Create the zip under `/mnt/documents/virtualis-source.zip` using `zip -r` with explicit excludes (or `git archive` — but `.lovable` plans are not tracked by git, so a direct `zip` of the working tree is better here).
2. Confirm the file exists and report its size.
3. Present it as a chat attachment via `<presentation-artifact>`.

## Notes
- The archive is a point-in-time snapshot of the current working tree, including unpublished Model Lab / Clinical Review work and plan files.
- It is a code archive only — not a runnable app without `bun install` and Lovable Cloud / env setup.
