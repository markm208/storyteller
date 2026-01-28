# Storyteller Playback Data Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-26

## Overview

This document defines the data format for Storyteller 'code playbacks'. A code playback is a recorded history of code changes that can be replayed and mainpulated in different ways to show how it has evolved over time. They can be annotated by a developer to include 'comments' so that a viewer can get inside the head of the developer in the evolution of their code.

This specification enables:
- Third-party editor extensions
- Alternative playback viewers
- Playback data interchange between tools
- Portability of code playbacks

**Related Documents:**
- [`PLAYBACK_RECORDING_SPEC.md`](./PLAYBACK_RECORDING_SPEC.md) - How to create playback data (for editor extension implementers).
- [`PLAYBACK_VIEWER_SPEC.md`](./PLAYBACK_VIEWER_SPEC.md) - The browser-based playback viewer used for viewing and editing a playback.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-26 | Initial specification |

## Playback Data Object

The root object containing all data needed to render a playback. Playback viewers will use this data to reconstruct the code at any point in time and provide the author supplied narrative to the viewer.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `specVersion` | string | Specification version (e.g., `"1.0.0"`). Implementations should check this for compatibility. |
| `events` | Event[] | Ordered array of all coding events (code changes, file operations). These must stored in the array in chronological/sequence order. |
| `comments` | Comment[] | Array of narrative comments attached to specific points in the playback. |
| `developers` | Developer[] | Array of all developers who contributed to the playback. Storyteller supports single, pair, and mob programming over multiple different sessions. |
| `developerGroups` | DeveloperGroup[] | Array of developer groups. A developer group is a collection of developers who work together. Events are attributed to groups, not individual developers (individual developers are placed in a special one-person group automatically). |
| `playbackTitle` | string | Title of the playback. |
| `anonymousDeveloperId` | string | ID of the anonymous developer (for unattributed changes). |
| `anonymousDeveloperGroupId` | string | ID of the anonymous developer group. |
| `systemDeveloperId` | string | ID of the system developer (for auto-generated changes). |
| `systemDeveloperGroupId` | string | ID of the system developer group. |
| `branchId` | string | Identifier for the branch this playback represents. |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `numEvents` | integer | Total count of events. If provided, it must equal `events.length`. This is useful for integrity checks or streaming scenarios where events are loaded in chunks. |
| `estimatedReadTime` | integer | Estimated time to view the playback in seconds. |
| `isEditable` | boolean | Whether the playback UI should allow editing. Default: `false`. |
| `aiEnabled` | boolean | Whether AI features are available. Default: `false`. |

### Example

```json
{
  "specVersion": "1.0.0",
  "playbackTitle": "Implementing User Authentication",
  "branchId": "feature-auth",
  "estimatedReadTime": 300,
  "events": [...],
  "comments": [...],
  "developers": [...],
  "developerGroups": [...],
  "anonymousDeveloperId": "uuid-anon-dev",
  "anonymousDeveloperGroupId": "uuid-anon-group",
  "systemDeveloperId": "uuid-system-dev",
  "systemDeveloperGroupId": "uuid-system-group"
}
```

---

## Event Objects

Events represent atomic operations in the codebase like inserting a character in a file, deleting a character, creating a file, etc. All events share a common set of core fields, with additional fields specific to each event type.

### Core Event Fields (All Events)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) for this event. |
| `type` | string | Event type. See Event Types below. |
| `timestamp` | integer | Unix timestamp (milliseconds) when the event occurred. |
| `createdByDevGroupId` | string | ID of the developer group that created this event. |
| `branchId` | string | ID of the branch where this event occurred. |
| `permanentRelevance` | string | (Optional) If set to `"never relevant"`, this event should be excluded from being animated during playback. |

### Event Types

#### Text Events

These events represent individual character insertions and deletions.

##### INSERT

Represents a single character (or newline) being inserted into a file.

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"INSERT"` |
| `fileId` | string | ID of the file being modified. |
| `character` | string | The character being inserted into a file. Special values: `"NEWLINE"` for `\n`, `"CR-LF"` for `\r\n`, `"TAB"` for `\t`. |
| `previousNeighborId` | string \| null | ID of the `INSERT` event immediately before this character in the file, or `null` if it is the first character in a file. |
| `lineNumber` | integer | 1-based line number where the insert occurred. |
| `column` | integer | 1-based column number where the insert occurred. |
| `pastedEventId` | string | (Optional) If this character was pasted, the ID of the original INSERT event it was copied from. Omit if not pasted. |

##### DELETE

Represents a single character being deleted from a file.

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"DELETE"` |
| `fileId` | string | ID of the file being modified. |
| `character` | string | The character being deleted (same encoding as `INSERT`). |
| `previousNeighborId` | string | ID of the `INSERT` event being deleted. |
| `lineNumber` | integer | 1-based line number where the delete occurred. |
| `column` | integer | 1-based column number where the delete occurred. |

#### File Events

##### CREATE FILE

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"CREATE FILE"` |
| `fileId` | string | Unique ID assigned to the new file. |
| `filePath` | string | Path of the file relative to project root. |
| `parentDirectoryId` | string | ID of the parent directory. |

##### DELETE FILE

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"DELETE FILE"` |
| `fileId` | string | ID of the file being deleted. |
| `filePath` | string | Path of the file at time of deletion. |
| `parentDirectoryId` | string | ID of the parent directory. |

##### MOVE FILE

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"MOVE FILE"` |
| `fileId` | string | ID of the file being moved. |
| `oldFilePath` | string | Original file path. |
| `newFilePath` | string | New file path after move. |
| `oldParentDirectoryId` | string | ID of the original parent directory. |
| `newParentDirectoryId` | string | ID of the new parent directory. |

##### RENAME FILE

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"RENAME FILE"` |
| `fileId` | string | ID of the file being renamed. |
| `oldFilePath` | string | Original file path. |
| `newFilePath` | string | New file path after rename. |
| `parentDirectoryId` | string | ID of the parent directory (unchanged). |

#### Directory Events

##### CREATE DIRECTORY

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"CREATE DIRECTORY"` |
| `directoryId` | string | Unique ID assigned to the new directory. |
| `directoryPath` | string | Path of the directory relative to project root. |
| `parentDirectoryId` | string | ID of the parent directory. |

##### DELETE DIRECTORY

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"DELETE DIRECTORY"` |
| `directoryId` | string | ID of the directory being deleted. |
| `directoryPath` | string | Path of the directory at time of deletion. |
| `parentDirectoryId` | string | ID of the parent directory. |

##### MOVE DIRECTORY

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"MOVE DIRECTORY"` |
| `directoryId` | string | ID of the directory being moved. |
| `oldDirectoryPath` | string | Original directory path. |
| `newDirectoryPath` | string | New directory path after move. |
| `oldParentDirectoryId` | string | ID of the original parent directory. |
| `newParentDirectoryId` | string | ID of the new parent directory. |

##### RENAME DIRECTORY

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `"RENAME DIRECTORY"` |
| `directoryId` | string | ID of the directory being renamed. |
| `oldDirectoryPath` | string | Original directory path. |
| `newDirectoryPath` | string | New directory path after rename. |
| `parentDirectoryId` | string | ID of the parent directory (unchanged). |

---

## Comment Object

Comments are narrative annotations attached to specific points in the playback. They allow authors to explain what's happening in the code. An author can add text, images, videos, audio, searchable tags, and code highlights to a comment.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID) for this comment. |
| `displayCommentEventId` | string | Yes | ID of the event where this comment should be displayed. |
| `displayCommentEventSequenceNumber` | integer | Yes | Sequence number of the event in `events` for quick lookup. |
| `developerGroupId` | string | Yes | ID of the developer group that authored this comment. |
| `timestamp` | integer | Yes | Unix timestamp (milliseconds) when the comment was created. |
| `commentText` | string | Yes | The text content of the comment. |
| `textFormat` | string | Yes | Format of commentText: `"markdown"` or `"html"`. |
| `commentTitle` | string | No | Optional title/heading for the comment. |
| `position` | integer | Yes | Display order when multiple comments exist at the same event. |
| `currentFilePath` | string | No | Path of the file that should be displayed with this comment. |
| `linesAbove` | integer | No | Number of lines to show above the current position. |
| `linesBelow` | integer | No | Number of lines to show below the current position. |
| `selectedCodeBlocks` | SelectedCodeBlock[] | No | Array of code regions to highlight. |
| `imageURLs` | string[] | No | Array of image URLs to display with the comment. |
| `videoURLs` | string[] | No | Array of video URLs to display with the comment. |
| `audioURLs` | string[] | No | Array of audio URLs to play with the comment. |
| `ttsFilePath` | string | No | Path to text-to-speech audio file for this comment. |
| `viewableBlogText` | string | No | Snapshot of the surrounding code (including `linesAbove` and `linesBelow`) captured when the comment was created. Used to display code snippets in blog view without replaying events. |
| `commentTags` | string[] | No | Array of tags for filtering comments. |
| `questionCommentData` | QuestionCommentData | No | Data for interactive question comments. |

### Selected Code Block Object

Defines a region of code to highlight when displaying a comment.

| Field | Type | Description |
|-------|------|-------------|
| `fileId` | string | ID of the file containing the code block. |
| `selectedText` | string | The text selected in this code block (for display purposes). |
| `selectedTextEventIds` | string[] | Array of event IDs corresponding to the selected text. |
| `startRow` | integer | 0-based starting line number. |
| `endRow` | integer | 0-based ending line number. |
| `startColumn` | integer | 0-based starting column. |
| `endColumn` | integer | 0-based ending column. |

### Question Comment Data Object

For interactive comments that quiz the reader.

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | The question text. |
| `questionTextFormat` | string | Format of the question text: `"markdown"` or `"html"`. |
| `allAnswers` | string[] | Array of all answer options (non-empty strings). |
| `correctAnswer` | string | The text of the correct answer (must match one entry in `allAnswers`). |
| `explanation` | string | (Optional) Explanation of the correct answer, shown after grading. |
| `explanationTextFormat` | string | (Optional) Format of the explanation text: `"markdown"` or `"html"`. |
---

## Developer Object

Represents an individual who contributed to the code.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID) for this developer. |
| `userName` | string | Yes | Display name of the developer. "Grace", "Grace Hopper", etc. |
| `email` | string | No | Email address. |
| `platform` | string | No | Source platform: `"github"`, `"gitlab"`, etc. |
| `platformUsername` | string | No | Username on the source platform. |
| `avatarURL` | string | No | URL to the developer's avatar image. |

---

## Developer Group Object

Events are attributed to developer groups rather than individuals. This supports pair programming and collaborative editing scenarios.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID) for this group. |
| `memberIds` | string[] | Yes | Array of Developer IDs who are members of this group. |

### Notes

- A solo developer has a group containing only their own ID.
- Pair programming creates a group with both developers' IDs.
- The `createdByDevGroupId` on events references these groups.

---

## Character Encoding

Special characters in `INSERT` and `DELETE` events are encoded as follows:

| Character | Encoded Value |
|-----------|---------------|
| Newline (`\n`) | `"NEWLINE"` |
| Windows newline (`\r\n`) | `"CR-LF"` |
| Tab (`\t`) | `"TAB"` |
| All other characters | Literal character |

---

## Playback Reconstruction Algorithm

To reconstruct the code state at any point in the playback:

1. Start with an empty file system state.
2. Process events in order (index 0 to N).
3. For each event:
   - `CREATE FILE` / `CREATE DIRECTORY`: Add to file system state.
   - `DELETE FILE` / `DELETE DIRECTORY`: Remove from file system state.
   - `MOVE *` / `RENAME *`: Update paths in file system state.
   - `INSERT`: Add character to file at position determined by `previousNeighborId` or by the `lineNumber` and `column` attributes.
   - `DELETE`: Remove the character referenced by `previousNeighborId` or by the `lineNumber` and `column` attributes.

### The previousNeighborId Chain

- Each `INSERT` has a `previousNeighborId` pointing to the `INSERT` event that generates the character that comes immediately before it in the file.
- `previousNeighborId: null` means this is the first character in the file.
- `DELETE` events reference the `INSERT` event being deleted.
- This chain allows efficient reconstruction of file contents without storing full snapshots.
---

## Compatibility Notes

### Forward Compatibility

Implementations should:
- Ignore unknown fields (allows adding optional fields in future versions).
- Check `specVersion` and warn if it's newer than supported.

### Backward Compatibility

Future versions of this spec will:
- Not remove required fields.
- Not change the semantics of existing fields.
- Document migration paths for breaking changes.

---

## Changelog

### 1.0.0 (2026-01-26)
- Initial specification based on Storyteller VS Code extension implementation.
