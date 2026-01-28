# Storyteller Recording Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-26

## Overview

This document describes how Storyteller records code playbacks from a text editor or IDE. It covers the project structure, event recording, developer management, and various features for editing and exporting playback history.

**Audience:** Developers building editor extensions or recording tools that create Storyteller playbacks.

**Related Documents:**
- [`PLAYBACK_DATA_SPEC.md`](./PLAYBACK_DATA_SPEC.md) - The playback data format 
- [`PLAYBACK_VIEWER_SPEC.md`](./PLAYBACK_VIEWER_SPEC.md) - The browser-based playback viewer

## Project Structure

### The `.storyteller/` Directory

When Storyteller initializes a project, it creates a `.storyteller/` directory in the project root containing:

```
.storyteller/
├── comments/
│   ├── comments.json       # All comments, keyed by event ID
│   └── media/
│       ├── audios/         # Audio files (including TTS)
│       ├── images/         # Images referenced by comments
│       └── videos/         # Videos referenced by comments
├── devs/
│   └── devs.json           # Developers, groups, and active state
├── events/
│   └── events.txt          # All events (newline-delimited JSON)
├── fs/
│   └── filesAndDirs.json   # File system state and file contents
└── project/
    └── project.json        # Project metadata
```

### Data Files Overview

#### `project/project.json`

Project metadata:

```json
{
  "project": {
    "id": "uuid",
    "title": "Playback Title",
    "description": "Playback Description",
    "version": "1.2.6",
    "branchId": "branchId"
  }
}
```

#### `events/events.txt`

All events stored as newline-delimited JSON (one JSON object per line):

```
{"id":"uuid","timestamp":1234567890,"type":"CREATE FILE","fileId":"uuid",...}
{"id":"uuid","timestamp":1234567891,"type":"INSERT","character":"h",...}
{"id":"uuid","timestamp":1234567892,"type":"INSERT","character":"i",...}
```

This format allows efficient appending of new events without rewriting the entire file.

#### `devs/devs.json`

Developer and group information:

```json
{
  "allDevelopers": {
    "uuid": { "id": "uuid", "userName": "Name", "email": null, ... }
  },
  "allDeveloperGroups": {
    "uuid": { "id": "uuid", "memberIds": ["dev-uuid-1", "dev-uuid-2"] }
  },
  "activeDeveloperGroupId": "uuid",
  "anonymousDeveloperId": "uuid",
  "anonymousDeveloperGroupId": "uuid",
  "systemDeveloperId": "uuid",
  "systemDeveloperGroupId": "uuid"
}
```

#### `comments/comments.json`

Comments keyed by the event ID they're attached to. An array of comments is stored for each event ID to support multiple comments on the same event:

```json
{
  "comments": {
    "event-uuid": [
      {
        "id": "comment-uuid",
        "displayCommentEventId": "event-uuid",
        "displayCommentEventSequenceNumber": 42,
        "commentText": "Comment content...",
        ...
      }
    ]
  }
}
```

#### `fs/filesAndDirs.json`

Current file system state including file contents as event references:

```json
{
  "allFiles": {
    "file-uuid": {
      "id": "file-uuid",
      "parentDirectoryId": "dir-uuid",
      "currentPath": "/src/main.js",
      "textFileInsertEvents": [
        [
          { "eventId": "uuid", "character": "c" },
          { "eventId": "uuid", "character": "o" },
          ...
        ],
        ...
      ]
    }
  },
  "allDirectories": {
    "dir-uuid": { ... }
  }
}
```

The `textFileInsertEvents` array is a 2D array representing the file contents: each inner array is a line, each element is a character with its originating event ID.

### The `st-ignore.json` File

Located in the project root, this file specifies what Storyteller should NOT track.

#### Format

```json
{
  "ignoredFileExtensions": [".log", ".tmp", ".cache"],
  "ignoredFiles": ["secrets.env", "large-data.json"],
  "ignoredDirectories": ["node_modules", "dist", "build"]
}
```

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `ignoredFileExtensions` | string[] | File extensions to ignore (e.g., `".log"`, `".tmp"`) |
| `ignoredFiles` | string[] | Specific filenames or relative paths to ignore |
| `ignoredDirectories` | string[] | Directory names or relative paths to ignore |

#### Auto-Ignored Paths

The following are always ignored regardless of `st-ignore.json`:

- `/.storyteller/*` - The Storyteller data directory
- `/st-ignore.json` - The ignore configuration itself
- `/.git/*` - Git internals
- `.DS_Store` - macOS metadata files
- `*.zip` - Zip archives

#### Creating st-ignore.json

The extension provides a command to create a default `st-ignore.json` file with common ignore patterns. Changes to `st-ignore.json` require restarting Storyteller to take effect.

---

## Event Recording

### Event Types

Storyteller records these event types:

#### Text Events

| Type | Description |
|------|-------------|
| `INSERT` | A single character inserted into a file |
| `DELETE` | A single character deleted from a file |

#### File Operations

| Type | Description |
|------|-------------|
| `CREATE FILE` | A new file was created |
| `DELETE FILE` | A file was deleted |
| `MOVE FILE` | A file was moved to a different directory |
| `RENAME FILE` | A file was renamed (same directory) |

#### Directory Operations

| Type | Description |
|------|-------------|
| `CREATE DIRECTORY` | A new directory was created |
| `DELETE DIRECTORY` | A directory was deleted |
| `MOVE DIRECTORY` | A directory was moved |
| `RENAME DIRECTORY` | A directory was renamed |

### Initial State Recording

When Storyteller is initialized in a directory that already contains files, it generates events to represent the existing state. This includes:

- `CREATE DIRECTORY` events for all existing directories
- `CREATE FILE` events for all existing files
- `INSERT` events for every character in every existing file

These initial events are marked with `permanentRelevance: "never relevant"` so they are excluded from the animated playback. This allows the viewer to start from a meaningful point rather than watching pre-existing code being "typed out."

```json
{
  "id": "uuid",
  "type": "CREATE FILE",
  "permanentRelevance": "never relevant",
  ...
}
```

The initial state events are attributed to the **System Developer** since they represent code that wasn't typed during a Storyteller session.

### The `previousNeighborId` Chain

Each `INSERT` event has a `previousNeighborId` field referring to the `INSERT` event that generated the characterimmediately before it in the file.

```
File content: "Hi"

Event 1: id: 123 INSERT 'H', previousNeighborId: null (first character)
Event 2: id: 124 INSERT 'i', previousNeighborId: 123 (after 'H')
```

This chain enables:
- Accurate reconstruction of file state at any point
- Tracking text lineage through edits
- Selected text playback (tracing history backwards)

### Clipboard/Paste Tracking

When text is pasted, Storyteller can track that the pasted characters originated from previously typed text. Each INSERT event may include a `pastedEventId` field linking back to the original INSERT event it was copied from.

This enables features like showing where code was copied from during playback.

### Timestamp and Attribution

Every event includes:

| Field | Description |
|-------|-------------|
| `timestamp` | Unix timestamp (milliseconds) when the event occurred |
| `createdByDevGroupId` | ID of the developer group that created the event |
| `branchId` | ID of the branch where the event occurred |

### Persistence Model

Events are buffered in memory and written to the database periodically:

- **Batch interval:** Events are persisted every 5 seconds
- **Immediate write:** When tracking stops, all buffered events are immediately written
- **Crash recovery:** Unbuffered events (up to 5 seconds) may be lost on crash

---

## Developer Management

### Developer Records

Each developer has:

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (UUID) |
| `userName` | Display name |
| `email` | Email address (optional) |
| `platform` | Source platform: `"github"`, `"gitlab"`, etc. (optional) |
| `platformUsername` | Username on the platform (optional) |
| `avatarURL` | URL to avatar image (optional) |

### Creating Developers

Developers can be created with various input formats:

| Input Format | Example | Result |
|--------------|---------|--------|
| Name only | `"Alice"` | Developer with name "Alice" |
| Name + email | `"Alice alice@example.com"` | Adds email, fetches Gravatar |
| Name + GitHub | `"Alice @octocat"` | Fetches GitHub avatar |
| Name + platform | `"Alice @gitlab:username"` | Fetches GitLab avatar |

### Avatar Resolution

Avatars are resolved in this priority:

1. **Platform API** - If GitHub/GitLab username provided, fetch from their API
2. **Gravatar** - If email provided, generate Gravatar URL
3. **UI Avatars** - Generate avatar from initials with random background color

### Developer Groups

Events are attributed to **developer groups**, not individual developers. This supports:

- **Solo development:** Group contains one developer
- **Pair programming:** Group contains two developers
- **Mob programming:** Group contains multiple developers

The active developer group changes when developers join or leave the session.

### Special Developers

| Developer | Purpose |
|-----------|---------|
| **Anonymous Developer** | For changes when no developer is identified |
| **System Developer** | For auto-generated changes (reconciliation, imports) |

---

## Reconciliation

### Purpose

Reconciliation detects and resolves discrepancies between the filesystem and Storyteller's tracked state. This handles changes made while Storyteller wasn't running (e.g., `git pull`, external editors).

### When It Runs

Reconciliation runs when:
- Storyteller starts tracking a project
- User explicitly triggers reconciliation

### Discrepancy Types

| Type | Description | Resolution |
|------|-------------|------------|
| **New file** | File exists on disk but isn't tracked | Prompt to add or ignore |
| **New directory** | Directory exists but isn't tracked | Prompt to add or ignore |
| **Deleted file** | File is tracked but missing from disk | Prompt to remove from history or restore |
| **Deleted directory** | Directory is tracked but missing | Prompt to remove or restore |
| **Modified file** | File content differs from tracked state | Compute diff and create INSERT/DELETE events |

### Modified File Handling

When a tracked file's content differs from Storyteller's state:

1. Compute a diff between tracked content and filesystem content
2. Generate appropriate `INSERT` and `DELETE` events to transform tracked state to filesystem state
3. Attribute these events to the **System Developer**

This preserves the file's history while incorporating external changes.

---

## History Editing Features

### Delete File History

Completely removes a file from Storyteller's history. Use when a file was accidentally tracked (e.g., build artifacts, large generated files).

**What happens:**
1. All events for the file are deleted
2. All comments attached to those events are deleted
3. Remaining event indices are updated
4. Comment positions are recalculated
5. File is marked as deleted in the file manager
6. File path is added to `st-ignore.json` to prevent re-tracking

### Perfect Programmer Mode

Removes "mistakes" from the playback - code that was added and then deleted between comment points. This creates a cleaner narrative where the developer appears to write code perfectly.

#### Two Variants

**1. Perfect Programmer Reordering**

Events are reordered by type for each segment between comments:
1. File/directory operations first
2. DELETE events (right-to-left, bottom-to-top)
3. INSERT events (left-to-right, top-to-bottom)

This shows the "end result" being typed in reading order.

**2. Original Order**

Events keep their original sequence, but add-then-delete pairs are filtered out. This preserves the natural flow while hiding mistakes.

#### Preview vs. Permanent

- **Preview mode:** Filters events during playback without modifying the database. Original history is preserved.
- **Replace mode:** Permanently modifies the database, removing filtered events. This cannot be undone.

---

## Playback Constraints

Playback constraints filter which events are shown without modifying the underlying history.

### Selected Text Playback

Shows the history of specific selected text in the editor.

**How it works:**
1. User selects text in the editor
2. Storyteller identifies all INSERT events within the selection
3. The `previousNeighborId` chain is traced backwards to find all related events
4. Playback shows only events in this filtered set
5. Other events are marked with `relevance: 'filtered out'`

**Use cases:**
- Understanding how a specific function evolved
- Tracing the history of a bug
- Seeing who wrote specific code

### Filtered Playback

Events can be marked with `permanentRelevance: 'never relevant'` to exclude them from standard playback. This is used for:
- Boilerplate/setup code
- Auto-generated content
- Events that shouldn't be part of the narrative

---

## Export Formats

### Viewable Playback Export

Creates a self-contained zip file that can be extracted and viewed in any web browser without Storyteller installed.

**Contents:**
```
playback-export/
├── index.html           # Entry point
├── css/                 # Stylesheets
├── js/
│   ├── loadPlayback.js  # Generated file with all playback data
│   └── ...              # Playback engine and UI code
└── media/
    ├── images/          # Comment images
    ├── videos/          # Comment videos
    └── audios/          # Comment audio/TTS files
```

**Usage:**
1. Extract the zip file
2. Open `index.html` in a web browser
3. View the complete playback

**Note:** The exported playback is read-only. Comments cannot be edited.

### Full Project Export

Creates a zip file of the entire project including source code and Storyteller history.

**Contents:**
- All project source files
- `.storyteller/` directory with all data files
- `st-ignore.json` (if present)

**Usage:**
1. Share the zip file with a collaborator
2. They extract it and open in VS Code with Storyteller installed
3. Full playback history is available, including editing capabilities

---

## Comment Authoring

### Attaching Comments to Events

Comments are attached to specific events in the playback timeline. The attachment point is defined by:

| Field | Description |
|-------|-------------|
| `displayCommentEventId` | ID of the event where comment appears |
| `displayCommentEventSequenceNumber` | Index in the events array (for quick lookup) |

### Comment Content

| Field | Description |
|-------|-------------|
| `commentText` | The comment content |
| `textFormat` | Format: `"markdown"` or `"html"` |
| `commentTitle` | Optional title/heading |

### Media Attachments

Comments can include:

| Field | Description |
|-------|-------------|
| `imageURLs` | Array of image URLs |
| `videoURLs` | Array of video URLs |
| `audioURLs` | Array of audio URLs |
| `ttsFilePath` | Path to text-to-speech audio file |

Media files are stored in `.storyteller/comments/media/` subdirectories.

### Code Block Selection

Comments can highlight specific code regions:

```json
{
  "selectedCodeBlocks": [
    {
      "fileId": "uuid-of-file",
      "selectedText": "function example() { ... }",
      "selectedTextEventIds": ["event-uuid-1", "event-uuid-2", "..."],
      "startRow": 9,
      "startColumn": 0,
      "endRow": 14,
      "endColumn": 1
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `fileId` | ID of the file containing the code block |
| `selectedText` | The actual text that was selected |
| `selectedTextEventIds` | Array of INSERT event IDs for each character in the selection |
| `startRow` | 0-based starting line number |
| `startColumn` | 0-based starting column |
| `endRow` | 0-based ending line number |
| `endColumn` | 0-based ending column |

The `viewableBlogText` field on the comment stores a snapshot of surrounding code (including `linesAbove` and `linesBelow`) for display in blog view.

### Question Comments

Comments can include interactive multiple-choice questions:

```json
{
  "questionCommentData": {
    "question": "What does this function return?",
    "questionTextFormat": "markdown",
    "allAnswers": ["null", "undefined", "0", "false"],
    "correctAnswer": "undefined",
    "explanation": "The function returns undefined when...",
    "explanationTextFormat": "markdown"
  }
}
```

| Field | Description |
|-------|-------------|
| `question` | The question text |
| `questionTextFormat` | Format: `"markdown"` or `"html"` |
| `allAnswers` | Array of all answer options |
| `correctAnswer` | The text of the correct answer (must match one entry in `allAnswers`) |
| `explanation` | (Optional) Explanation shown after answering |
| `explanationTextFormat` | (Optional) Format of the explanation |

### Comment Tags

Comments can be tagged for organization and filtering:

```json
{
  "commentTags": ["important", "bug-fix", "refactor"]
}
```

---

## HTTP Server

When viewing a playback, Storyteller runs a local HTTP server.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Serves the playback viewer UI |
| `GET /playback` | Returns playback data as JavaScript |
| `GET /event/start/:start/numEvents/:num` | Paginated event retrieval |
| `GET /media/*` | Serves media files |
| `POST /comment` | Create/update comments (editable mode only) |
| `DELETE /comment/:id` | Delete a comment (editable mode only) |

### Editable vs. Read-Only Mode

| Mode | Condition | Capabilities |
|------|-----------|--------------|
| **Editable** | Live playback from HTTP server | Add, edit, delete comments |
| **Editable + AI** | Live playback AND OpenAI API key configured | All editing plus AI features (comment suggestions, TTS generation, question generation) |
| **Read-Only** | Exported playback (zip file) | View only; no modifications allowed |

---

## Changelog

### 1.0.0 (2026-01-26)
- Initial specification
