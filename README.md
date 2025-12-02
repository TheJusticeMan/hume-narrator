# Empathic Narrator

An Obsidian plugin that uses Hume AI to provide empathic text-to-speech and voice interaction capabilities. The plugin is designed to work on both Desktop and Mobile (Android/iOS) without Node.js runtime dependencies.

## Features

- **Text-to-Speech with Emotion**: Select any text in your notes and have it read aloud using Hume AI's empathic TTS.
- **Voice Brainstorm (EVI)**: Use voice interaction to brainstorm ideas with Hume's Empathic Voice Interface.
- **Mobile Compatible**: Designed to work seamlessly on both desktop and mobile Obsidian apps.

## Installation

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create a folder named `empathic-narrator` in your vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into this folder.
4. Enable the plugin in Obsidian's settings under "Community plugins".

### From Source
1. Clone this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to compile the plugin.
4. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/empathic-narrator/` folder.

## Configuration

1. Open Obsidian Settings.
2. Navigate to "Community plugins" → "Empathic Narrator".
3. Enter your **Hume API Key**. You can obtain this from your [Hume AI Dashboard](https://platform.hume.ai/).

## Usage

### Read Selection with Emotion
1. Select some text in your note.
2. Open the command palette (Ctrl/Cmd + P).
3. Search for "Read Selection with Emotion" and execute the command.
4. The selected text will be synthesized and played with empathic voice characteristics.

### Voice Brainstorm
1. Click the microphone icon in the ribbon (left sidebar), or
2. Open the command palette and search for "Open Voice Brainstorm".
3. Click "Start Listening" to begin voice interaction.
4. Speak your thoughts and the AI will respond both with text and voice.

## Technical Notes

This plugin is designed to be **mobile-safe**:
- Uses the `buffer` polyfill instead of Node.js `Buffer` for base64 decoding.
- Uses HTML5 `Audio` API with `Blob` objects instead of filesystem operations.
- Uses `navigator.mediaDevices.getUserMedia` for microphone access.
- Avoids all Node.js-specific modules like `fs`, `path`, etc.

## Dependencies

- [Hume AI SDK](https://github.com/humeai/hume-typescript-sdk) - For AI-powered TTS and voice interaction.
- [buffer](https://www.npmjs.com/package/buffer) - Buffer polyfill for mobile compatibility.

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

## License

MIT
