# Testing Checklist

Run these checks before packaging or publishing the extension.

## Automated Checks

```bash
npm run test:syntax
npm run lint
npm run build
```

`npm test` runs the syntax check, lint check, and production build together.

## Browser Smoke Test

1. Run `npm run build`.
2. Open `chrome://extensions/` or `edge://extensions/`.
3. Enable Developer mode.
4. Load the `dist/` folder as an unpacked extension.
5. Open the popup and confirm the UI renders without console errors.

## Manual Feature Regression

- Search bookmarks by title and URL.
- Open a bookmark from popup and fullscreen views.
- Create, edit, move, and delete a bookmark.
- Create, edit, and delete a folder.
- Import a JSON/HTML bookmark file.
- Export bookmarks and confirm a download is created.
- Switch theme and language settings.
- Use batch selection and batch actions.
- Rebuild and repeat the smoke test in Microsoft Edge when release changes affect permissions, manifests, or browser APIs.
