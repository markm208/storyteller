# Project: VS Code Storyteller Extension

## Overview
This extension records every keystroke and change in the editor to create "Code Playbacks." Users can replay their coding sessions, add annotations (text/media), and export these stories as standalone web pages. The extension is also a mini-web server that serves pages in the browser for playback editing and viewing. There is an option to export the entire project as a zip file containing all necessary assets for offline viewing or static hosting.

## Tech Stack
- **Language:** JavaScript 
- **APIs:** VS Code Extension API (`vscode`), Webview API for playback UI.
- **Frontend:** Editor uses VS Code API's, the web server generated playbacks with HTML, CSS, and Vanilla JS.

## Core Concepts & Data Structures
- **Events:** Every change in the editor or the file system is an object. These events are stored sequentially and are used to recreate the coding session. One can add comments/annotations to specific events that include text or media.

## Coding Standards
- **Comments:** Use JSDoc style comments for all functions and classes. For single line comments do not add a space to start and do not start the comment with a capital letter. I generally like comments to help explain the "why" behind code, not the "what" (which should be clear from good naming).

## Guidelines for Claude
- **Event Integrity:** When suggesting modifications to recording logic, ensure the chronological order and "undo/redo" parity of the event stream is preserved.
- **Web Server:** Keep it simple and efficient.
- **Constraints:** Avoid introducing external dependencies (npm packages) unless absolutely necessary. Lean on the built-in Node.js and VS Code modules.
- **Update the docs:** Ensure all changes to recording logic or data structures are reflected in the documentation files (`PLAYBACK_RECORDING_SPEC.md`, `PLAYBACK_RECORDING_SPEC.md`, and `PLAYBACK_VIEWER_SPEC.md`).
