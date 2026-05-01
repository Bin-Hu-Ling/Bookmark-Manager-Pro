# Repository Guidelines

## Project Structure & Module Organization

This is a Chrome/Edge Manifest V3 bookmark manager extension. Source code lives in `src/`: `src/popup/` contains popup HTML, CSS, and JavaScript; `src/background/background.js` contains background logic; `src/components/` holds reusable UI and feature managers; `src/utils/` contains shared helpers. Extension icons are in `icons/`. Use `manifest.json` for local metadata and `manifest.dist.json` for packaged builds. Root verification scripts include `feature_verification.js`, `edge_compatibility_test.js`, and `verify_extension.py`.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: run Webpack watch mode and rebuild `dist/`.
- `npm run build`: create a production build in `dist/`.
- `npm run build:chrome` / `npm run build:edge`: browser-specific build aliases.
- `npm run package:chrome` / `npm run package:edge`: build and zip `dist/` for distribution.
- `npm run lint`: run ESLint over `src/**/*.js`.
- `npm run format`: format JS, JSON, CSS, and HTML under `src/`.
- `npm test`: currently prints the manual testing reminder; use the verification scripts for deeper checks.

After building, load `dist/` as an unpacked extension from `chrome://extensions/` or `edge://extensions/` with Developer mode enabled.

## Coding Style & Naming Conventions

Use JavaScript modules targeting modern browsers and WebExtension APIs. Follow `.prettierrc`: 2-space indentation, semicolons, single quotes, ES5 trailing commas, and 100-character line width. ESLint requires strict equality and curly braces for all control blocks, and warns on unused variables unless arguments start with `_`. Use PascalCase for component/manager classes such as `BookmarkTree.js`; use descriptive camelCase for functions and variables.

## Testing Guidelines

There is no automated unit test framework configured yet. Before submitting changes, run `npm run lint`, `npm run build`, and relevant manual browser checks. For extension behavior, use the root verification scripts, then test core flows manually: loading bookmarks, searching, tagging, dragging folders/bookmarks, batch operations, and Edge compatibility when affected.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries such as `Add privacy policy` and `Remove Bookmark Manager Pro.zip`. Keep commits focused and describe the user-visible or maintenance change. Pull requests should include a concise description, affected browser targets, manual test notes, linked issues, and screenshots or recordings for popup UI changes.

## Security & Configuration Tips

Keep requested permissions in `manifest.json` and `manifest.dist.json` minimal and synchronized. Do not commit generated `dist/` output or packaged `.zip` files unless the release process explicitly requires them. Avoid logging bookmark URLs or user data except during local debugging.
