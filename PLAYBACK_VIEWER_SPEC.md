# Storyteller Playback Viewer Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-26

## Overview

This document describes the browser-based playback viewer for Storyteller. The viewer renders code playbacks, allowing users to watch code evolve over time while reading developer commentary.

**Audience:** Developers building alternative playback viewers or extending the existing viewer.

**Related Documents:**
- [`PLAYBACK_DATA_SPEC.md`](./PLAYBACK_DATA_SPEC.md) - The playback data format
- [`PLAYBACK_RECORDING_SPEC.md`](./PLAYBACK_RECORDING_SPEC.md) - How playbacks are created

---

## Display Modes

The viewer supports two display modes optimized for different use cases.

### Code View 

The default mode for desktop screens (width > 800px).

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Title                                         Search   │
├───────────────────────┬─────────────────────────────────┤
│                       │                                 │
│   Comment Navigator   │      Code Editor (Ace)          │
│                       │                                 │
│   - Comment List      │      - Syntax Highlighting      │
│   - Current Position  │      - Line Numbers             │
│                       │      - File Tabs                │
│                       ├─────────────────────────────────┤
│                       │   Playback Controls             │
│                       │   [◀][▶] ───●─────── [⏭] 👤    │
└───────────────────────┴─────────────────────────────────┘
```

**Features:**
- Resizable split pane (drag divider to adjust)
- Double-click divider to reset to 50/50 split
- Comment list on left with navigation
- Full code editor on right with syntax highlighting
- Playback controls below editor

### Blog View

The default mode for mobile screens (width < 800px). Can be forced with URL parameter `?mode=blog`.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│              Playback Title (centered)                  │
│                                                         │
│         👤 Developer 1    👤 Developer 2                │
│─────────────────────────────────────────────────────────│
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │  Comment Title                              🔊  │   │
│   │                                                 │   │
│   │  Comment text with markdown rendering...       │   │
│   │                                                 │   │
│   │  ┌─────────────────────────────────────────┐   │   │
│   │  │  Code Snippet                           │   │   │
│   │  │  (syntax highlighted)                   │   │   │
│   │  └─────────────────────────────────────────┘   │   │
│   │                                                 │   │
│   │  [image] [video]                               │   │
│   │                                                 │   │
│   │  Tags: [tag1] [tag2]                           │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │  Next Comment...                                │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Article-style reading experience
- Comments displayed as sequential blog posts
- Code snippets embedded within comments
- Smooth scrolling between comments
- Developer info displayed at top

### Mode Switching

- **Automatic:** Switches based on viewport width (800px threshold)
- **Manual:** Click mode toggle buttons in title bar
- **URL Override:** Add `?mode=blog` or `?mode=code` to URL

---

## Playback Controls

### Navigation Buttons

| Control | Icon | Action |
|---------|------|--------|
| Previous Event | ◀ | Step back one event |
| Next Event | ▶ | Step forward one event |
| Skip to Next Comment | ⏭ | Jump to next comment position |
| Play/Pause | ▶/⏸ | Toggle automatic playback |

### Playback Slider

- Range slider showing playback progress (0-100%)
- **Comment Markers:** Vertical lines indicate comment positions
- **Click Marker:** Jump directly to that comment
- **Drag Thumb:** Navigate to any position in playback

### Automatic Playback

- **Default Speed:** 35ms per event
- **Adjustable:** Via Options menu (Faster/Slower buttons)
- **Toggle:** Spacebar or Play/Pause button
- Pauses automatically at comment points

### Developer Group Display

- Shows avatar of current developer group
- Updates as playback progresses through events
- Click to view developer details

---

## Keyboard Shortcuts

### Playback Navigation

| Shortcut | Action |
|----------|--------|
| `→` (Right Arrow) | Next event |
| `←` (Left Arrow) | Previous event |
| `Shift + →` | Next comment |
| `Shift + ←` | Previous comment |
| `Ctrl + Shift + →` | End of playback |
| `Ctrl + Shift + ←` | Start of playback |
| `Spacebar` | Toggle play/pause |

### General

| Shortcut | Action |
|----------|--------|
| `/` | Focus search bar |
| `Shift + /` | Open media picker |
| `P` | Play/pause comment audio (TTS) |

### Editor & Comments

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + ↑` | Increase font size |
| `Ctrl + Shift + ↓` | Decrease font size |
| `Ctrl + Shift + S` | Filter comments in selection |
| `Ctrl + Shift + Enter` | Add new comment (editable mode) |

**Note:** Shortcuts are disabled when typing in input fields.

---

## Search Functionality

### Search Bar

Located in the title bar. Expands from 90px to 300px on focus.

### Search Types

| Prefix | Searches | Example |
|--------|----------|---------|
| (none) | All fields | `Concurrency` |
| `comment:` | Comment text and titles | `comment:bug fix` |
| `code:` | Selected code blocks | `code:function` |
| `tag:` | Comment tags | `tag:important` |
| `question:` | Question text and answers | `question:return value` |
| `selected-text:` | Events by text range | |

### Search Behavior

- **Real-time:** Results update as you type
- **Case-insensitive:** Searches ignore case
- **HTML Stripping:** HTML tags removed before matching
- **Markdown Conversion:** Markdown converted to HTML then stripped for search

### Search Results

- Non-matching comments are hidden
- Matching comments remain visible
- Result count displayed in search bar
- Clear search to show all comments

---

## Comment Display

### Comment Structure

Each comment displays:

1. **Title** (optional) - Heading text
2. **Text Content** - Markdown or HTML rendered
3. **Audio Control** - Text-to-speech playback button
4. **Media** - Images, videos, audio files
5. **Code Snippets** - Highlighted code blocks
6. **Tags** - Clickable tag buttons
7. **Questions** - Interactive multiple-choice questions

### Comment Navigation

**In Code View:**
- Comment list shows all comments
- Current comment highlighted with blue background
- Click any comment to jump to it
- Shows position counter (e.g., "3/10")

**In Blog View:**
- Comments displayed sequentially
- Smooth scroll to current comment
- Visual separator between comments

### Comment Grouping

Comments at the same event position are grouped together. Navigation moves between groups, not individual comments within a group.

---

## Comment Editing (Editable Mode)

When `isEditable` is true, comments can be created and edited. AI features (like comment suggestions and TTS generation) additionally require `aiEnabled` to be true.

### Add New Comment

**Trigger:** `Ctrl + Shift + Enter` or UI button

**Form Fields:**

| Field | Description |
|-------|-------------|
| Comment Title | Optional heading (single line) |
| Comment Text | Main content (multiline, markdown/HTML) |
| AI Suggestion | Button to get AI-generated comment |
| Secondary Highlights | Lines above/below to include |
| Media | Image, video, audio attachments |
| Audio Transcription | Text-to-speech generation |
| Multiple Choice Question | Interactive quiz question |
| Tags | Categorization labels |

### Edit Existing Comment

- Click pencil icon on active comment
- Same form populated with existing data
- Delete button available (except for first comment)

### Comment Validation

A valid comment must have at least one of:
- Text content (title or body)
- Media attachment
- Valid multiple-choice question

---

## Tags System

### Tag Display

- Shown below comment content
- Prefixed with "tags:" label
- Each tag is a clickable button
- Click tag to search for all comments with that tag

### Tag Creation

In comment editor:
- Text input for new tag name
- Dropdown showing existing tags from playback
- Enter key or "Add tag" button to add
- Tags auto-formatted: lowercase, spaces → hyphens

### Automatic Tags

These tags are added automatically:

| Tag | Condition |
|-----|-----------|
| `image` | Comment has image attachment |
| `video` | Comment has video attachment |
| `audio` | Comment has audio attachment |
| `question` | Comment has multiple-choice question |

### System Tags

Reserved tags for special purposes:
- `all-tests-pass`
- `successful-run`
- `version-control-commit`

---

## Multiple Choice Questions

### Question Display

```
┌─────────────────────────────────────────────────────────┐
│  What does this function return when x is negative?     │
│                                                         │
│  ○ null                                                 │
│  ○ undefined                                            │
│  ○ 0                                                    │
│  ○ -1                                                   │
│                                                         │
│  [Check Answer]                        [Clear]          │
└─────────────────────────────────────────────────────────┘
```

### Question Interaction

1. User selects an answer (radio button)
2. Clicks "Check Answer"
3. Results displayed:
   - Correct: Green border with ✓
   - Incorrect: Red border with ✕, correct answer shown
4. Explanation revealed (if provided)
5. "Clear" button resets for retry

### Question Creation

In comment editor:
- Question text field (multiline)
- Minimum 2 answer options
- "Add Answer" button for more options
- Radio button to mark correct answer
- Optional explanation field
- AI generation button (if enabled)

### Question Data Format

```json
{
  "question": "What does this function return?",
  "questionTextFormat": "html",
  "allAnswers": ["null", "undefined", "0", "-1"],
  "correctAnswer": "0",
  "explanation": "The function returns 0 for negative inputs...",
  "explanationTextFormat": "html"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | The question text |
| `questionTextFormat` | string | No | Format of question text: `"markdown"` or `"html"` |
| `allAnswers` | string[] | Yes | Array of answer options (minimum 2) |
| `correctAnswer` | string | Yes | The correct answer text (must match an entry in `allAnswers`) |
| `explanation` | string | No | Explanation shown after the question is answered |
| `explanationTextFormat` | string | No | Format of explanation text: `"markdown"` or `"html"` |

---

## Media Support

### Media Picker

**Trigger:** `Shift + /` or Enter in empty search bar

**Features:**
- Modal grid display of all media in playback
- 3-column responsive layout
- Thumbnails for images
- Placeholder for videos/audio
- Click to jump to comment containing that media

### Supported Media Types

| Type | Formats | Display |
|------|---------|---------|
| Images | PNG, JPG, GIF, etc. | Inline display, click to enlarge |
| Videos | MP4, WebM, etc. | HTML5 video player |
| Audio | MP3, WAV, etc. | Audio player control |

### Media in Comments

**Adding Media:**
- URL input fields in comment editor
- Multiple URLs supported per type
- Stored in `imageURLs`, `videoURLs`, `audioURLs` arrays

**Display:**
- Images shown inline with comment
- Videos show player controls
- Audio shows playback button

---

## Text-to-Speech

### Audio Playback Control

Button states:
- **Play** (▶): Ready to play audio
- **Pause** (⏸): Currently playing
- **Converting** (⟳): Generating TTS
- **Error** (⚠): Playback failed

### TTS Generation

In editable mode with AI enabled:
- "Generate with AI" button in comment editor
- Converts comment text to speech via OpenAI API
- Preview before saving
- Stored as audio file in `.storyteller/media/audios/`

### Playback Speed

Adjustable in Options menu:
- 1x (normal)
- 1.25x
- 1.5x

**Keyboard:** `P` to play/pause audio

---

## AI Features

AI features are available when `playbackData.aiEnabled` is true.

### AI Assistant Panel

Collapsible panel with three tabs:

#### 1. Ask a Question

Ask custom questions about the current code or choose defaults:
- "Summarize this code and explain key concepts"
- "What could go wrong here?"
- "Let the AI suggest a question"

**Options:**
- Skill level: Beginner / Intermediate / Expert
- Context: "Since last comment only" or all code

#### 2. Test Your Knowledge

Generate practice multiple-choice questions:
- Configurable quantity
- Based on current code context
- Auto-graded with explanations

#### 3. Write Your Own Code

Get project suggestions based on code concepts:
- Analyzes highlighted code
- Suggests related projects
- Tailored to skill level

### AI-Assisted Commenting

In comment editor:
- "Get an AI Comment Suggestion" section
- Sends code context to AI
- Response populates comment text field

### AI Question Generation

- Button to auto-generate multiple-choice questions
- Creates question, answers, and explanation
- Integrates with question creation UI

---

## Developer Display

### Avatar Display

- Circular profile images (40px default)
- Sources in priority order:
  1. Platform avatar (GitHub, GitLab)
  2. Gravatar (from email)
  3. UI Avatars (generated from initials)

### Developer Information

Double-click avatar to expand:
- Developer name
- Platform username (clickable link to profile)
- Email address

**Platform Links:**
- GitHub: `https://github.com/{username}`
- GitLab: `https://gitlab.com/{username}`
- Bitbucket: `https://bitbucket.org/{username}`

### Blog View Display

Top of blog view shows:
- All project developers (excluding system/anonymous)
- Full developer info displayed
- Avatar + name + contact info

---

## Code Editor

### Ace Editor Integration

The viewer uses Ace Editor for code display.

**Features:**
- Syntax highlighting for 200+ languages
- Line numbers
- Theme: Tomorrow Night Eighties (dark)
- Read-only during playback
- Auto-detects language from file extension

### File Tabs

When multiple files are involved:
- Tab bar shows open files
- Click tab to switch files
- Current file highlighted
- Updates as playback progresses

### Font Size

Adjustable via:
- Options menu (Smaller/Bigger buttons)
- Keyboard: `Ctrl + Shift + ↑/↓`
- Default: 20px

### Code Highlighting

**New Code Markers:**
- Recently added code highlighted
- Visual indication of changes

**Selected Code Blocks:**
- Comment can highlight specific lines
- Background color marks selection
- Shows author's focus area

---

## Options Menu

Click gear icon (⚙) in title bar.

### Options Tab

| Setting | Control | Description |
|---------|---------|-------------|
| Font Size | Smaller / Bigger | Adjust editor font |
| Playback Speed | Slower / Faster | Auto-play speed |
| TTS Speed | 1x / 1.25x / 1.5x | Audio playback speed |

### Keyboard Shortcuts Tab

Reference list of all available shortcuts.

### Close Methods

- Click X button
- Click outside modal
- Press Escape key

---

## Title Bar

### Elements

| Element | Description |
|---------|-------------|
| Logo | Storyteller logo (links to home) |
| Title | Playback title (editable in edit mode) |
| Read Time | Estimated viewing time |
| Search Bar | Search input |
| Options | Gear icon for settings |
| Mode Toggle | Switch between Code/Blog view |

### Title Editing

In editable mode:
- Edit button appears on hover
- Double-click to make editable
- Saves automatically on blur
- Updates page title

### Read Time

- Calculated from comment content
- Format: "X min read"
- Updates when comments change

---

## Responsive Design

### Breakpoints

| Width | Behavior |
|-------|----------|
| > 800px | Code view (desktop) |
| < 800px | Blog view (mobile) |

### Touch Support

- Drag bar works with touch events
- Swipe gestures for navigation
- Touch-friendly button sizes

### Scrolling

- Custom scrollbar styling (dark theme)
- Smooth scrolling between comments
- Auto-scroll to keep current comment visible

---

## Theme

The viewer uses a dark theme throughout.

### Colors

| Element | Color |
|---------|-------|
| Background | `rgb(41, 41, 41)` |
| Panel Background | `rgb(51, 51, 51)` - `rgb(60, 60, 60)` |
| Text | `lightgray` |
| Links | `lightblue` |
| Active Highlight | `rgb(59, 76, 98)` (blue tint) |
| Borders | `rgb(80, 80, 80)` |

### No Light Theme

Currently only dark theme is available.

---

## Component Architecture

The viewer is built with Web Components using Shadow DOM.

### Component Hierarchy

```
st-app
├── st-title-bar
│   ├── st-search-bar
│   └── st-options-menu
├── st-code-view (or st-blog-view)
│   ├── st-playback-navigator
│   │   └── st-comment-view (multiple)
│   ├── st-editor-view
│   │   ├── st-ace-editor
│   │   ├── st-editor-file-tabs
│   │   └── st-playback-controls
│   │       ├── st-playback-slider
│   │       └── st-dev-group-avatar
│   └── st-ai-assistant
├── st-media-picker (modal)
└── st-add-edit-comment (modal)
```

### Communication

Components communicate via:
- Custom events (bubbling through Shadow DOM)
- PlaybackEngine as central state manager
- ServerProxy for API calls

---

## Changelog

### 1.0.0 (2026-01-26)
- Initial specification
