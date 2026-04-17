# Bookmark Manager Extension

A powerful bookmark manager extension for Chrome and Edge browsers with advanced features for organizing and managing bookmarks.

## Features

- **Tag System**: Add custom tags to bookmarks, support multiple tags classification
- **Smart Search**: Quick search by name, URL, or tags
- **Visual Folder Management**: Tree structure display with drag-and-drop organization
- **Tag Filtering**: Quickly filter bookmarks by tags
- **Bookmark Editing**: Edit bookmark name, URL, and tags
- **Batch Operations**: Batch move, delete, and tag operations
- **Bookmark Statistics**: View bookmark classification distribution

## Browser Support

- Google Chrome (Manifest V3)
- Microsoft Edge (Chromium-based)

## Project Structure

```
bookmark-manager-extension/
├── src/
│   ├── popup/           # Popup page UI
│   ├── background/      # Background scripts
│   ├── content/         # Content scripts (if needed)
│   ├── utils/           # Utility functions
│   └── components/      # Shared UI components
├── icons/              # Extension icons
├── manifest.json       # Extension manifest
├── package.json        # NPM dependencies
└── README.md          # This file
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in browser:
   - Chrome: Go to `chrome://extensions/`, enable Developer mode, click "Load unpacked"
   - Edge: Go to `edge://extensions/`, enable Developer mode, click "Load unpacked"

## Permissions

- `bookmarks`: Read and manage bookmarks
- `storage`: Save tags and settings
- `activeTab`: Optional for future features

## License

MIT