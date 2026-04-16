/**
 * Prompt templates for AI narrative generation
 *
 * New approach:
 * 1. Score transitions to find pedagogically significant moments
 * 2. Generate comments for high-scoring points
 */

const { NARRATIVE_CONFIG } = require('./config');

/**
 * Build prompt to score a batch of transitions
 * AI will rate each transition's pedagogical significance
 */
function buildScoringPrompt({ transitions, existingComments, authorGuidance, audienceLevel }) {
    const audienceDescription = getAudienceDescription(audienceLevel);

    const authorSection = authorGuidance
        ? `## Author's Description\nThe author described this code as: "${authorGuidance}"\n\n`
        : '';

    // Format existing comments section
    const existingCommentsSection = existingComments && existingComments.length > 0
        ? `## Existing Comments (Already in Playback)
The following comments already exist in this playback. Consider these when scoring - you may still give high scores to transitions near existing comments if additional explanation would be valuable.

${existingComments.map(c => `- **Event ${c.eventIndex}**${c.title ? ` "${c.title}"` : ''}: ${c.text.slice(0, 150)}${c.text.length > 150 ? '...' : ''}`).join('\n')}

`
        : '';

    // Format transitions for the AI
    const transitionsText = transitions.map((t, idx) => {
        // Check if this transition has an existing comment
        const hasExisting = existingComments && existingComments.some(c => c.eventIndex === t.toEventIndex);
        const existingNote = hasExisting ? '\n**Note: This event already has a comment.**' : '';

        return `### Transition ${idx + 1} (events ${t.fromEventIndex} → ${t.toEventIndex})
Reason: ${t.reason}${existingNote}

**Code After This Transition:**
${formatSnapshotForScoring(t.toSnapshot)}

**What Changed:**
${t.diffText}
`;
    }).join('\n---\n\n');

    return `# Task: Identify Pedagogically Significant Moments

You are analyzing a recorded coding session to find the best places to add educational comments.
Your job is to score each transition point based on how valuable it would be to pause and explain.

${authorSection}${existingCommentsSection}## Target Audience
${audienceDescription}

## What Makes a Good Comment Point?

A high-scoring transition (8-10) is where:
- A complete logical unit is finished (function, class, block, statement)
- A new concept or pattern is introduced that's worth explaining
- The code reaches a state where it would compile/run (even partially)
- There's a natural "chapter break" in the story of building this code
- Something was deleted and replaced with a different approach

A medium-scoring transition (5-7) is where:
- Some progress was made but the thought isn't complete
- Related to a high-scoring point but not the best place to pause

A low-scoring transition (1-4) is where:
- Just continuing to type within the same logical unit
- Minor edits, typo fixes, or formatting changes
- Incomplete statements or expressions

## Transitions to Score

${transitionsText}

## Required Response Format

Respond with a JSON object (no markdown, no code fences):
{
  "scores": [
    {
      "transitionIndex": <0-based index>,
      "score": <1-10>,
      "relatedToPrevious": <true if this continues the same topic as the previous transition, false if it's a new topic>,
      "reasoning": "Brief explanation (1 sentence)",
      "suggestedTitle": "Short title ONLY if this starts a major new section, otherwise null"
    }
  ]
}

Important:
- Score EVERY transition in the list
- **relatedToPrevious**: Set to true if this transition continues the same logical topic/feature as the previous one. Set to false if it's starting something new. Related transitions will be grouped at a single pause point with multiple stacked comments.
- Be selective with high scores (8+) - these are prime comment locations
- The final transition often deserves a high score (wrapping up)
- suggestedTitle should only be provided when starting a genuinely new section (like chapter headings)
- Transitions with existing comments can still score high if additional explanation would complement the existing comment
`;
}

/**
 * Build prompt to generate comments for selected transitions
 */
function buildCommentGenerationPrompt({ selectedTransitions, existingComments, previouslyGeneratedComments, authorGuidance, audienceLevel, verbosity }) {
    const audienceDescription = getAudienceDescription(audienceLevel);

    const authorSection = authorGuidance
        ? `## Author's Description\nThe author described this code as: "${authorGuidance}"\n\n`
        : '';

    // Format existing comments section (comments that existed before generation started)
    const existingCommentsSection = existingComments && existingComments.length > 0
        ? `## Existing Comments (Preserve Narrative Flow)
The following comments already exist in this playback. Your NEW comments should complement these - don't repeat what's already covered, but do ensure smooth narrative flow.

${existingComments.map(c => `- **Event ${c.eventIndex}**${c.title ? ` "${c.title}"` : ''}: ${c.text.slice(0, 200)}${c.text.length > 200 ? '...' : ''}`).join('\n')}

`
        : '';

    // Format previously generated comments section (comments we've generated so far in this session)
    const previousCommentsSection = previouslyGeneratedComments && previouslyGeneratedComments.length > 0
        ? `## Previously Generated Comments (Maintain Continuity)
You have already generated the following comments in this session. Build on these - avoid repeating explanations, reference earlier concepts when relevant, and maintain a coherent narrative flow.

${previouslyGeneratedComments.map(c => `- **Event ${c.eventIndex}**${c.title ? ` "${c.title}"` : ''}: ${c.comment.slice(0, 200)}${c.comment.length > 200 ? '...' : ''}`).join('\n')}

`
        : '';

    // Format selected transitions with file change context
    const transitionsText = selectedTransitions.map((t, idx) => {
        // Identify files involved
        const filesInSnapshot = Object.keys(t.toSnapshot || {});

        // Check for existing comments at this event
        const existingAtEvent = existingComments
            ? existingComments.filter(c => c.eventIndex === t.toEventIndex)
            : [];
        const existingNote = existingAtEvent.length > 0
            ? `\n**Existing comments at this event:** ${existingAtEvent.map(c => `"${c.text.slice(0, 80)}${c.text.length > 80 ? '...' : ''}"`).join(', ')}\n**Your comment should ADD to these, not duplicate them.**`
            : '';

        // Format grouped transitions (multiple related changes at this pause point)
        const groupedChanges = (t.groupedTransitions || [t]).map((gt, gtIdx) => {
            const filesChanged = [];
            if (gt.diff) {
                if (gt.diff.added) filesChanged.push(...gt.diff.added.map(f => `NEW: ${f.path}`));
                if (gt.diff.modified) filesChanged.push(...gt.diff.modified.map(f => `MODIFIED: ${f.path}`));
            }
            return `**Change ${gtIdx + 1}/${t.groupSize || 1}** (Score: ${gt.score || 'N/A'})
Files changed: ${filesChanged.length > 0 ? filesChanged.join(', ') : 'continuation'}
${gt.diffText || 'No diff available'}`;
        }).join('\n\n');

        const numChanges = t.groupSize || 1;
        const groupInstruction = numChanges > 1
            ? `\n**IMPORTANT: This pause point contains ${numChanges} related changes. Generate ${numChanges} separate comments (all with eventIndex ${t.toEventIndex}) - one for each change above.**`
            : '';

        return `### Comment Point ${idx + 1}
Event Index: ${t.toEventIndex}
Suggested Title: ${t.suggestedTitle || 'None'}
Number of grouped changes: ${numChanges}
Files in project: ${filesInSnapshot.join(', ')}${existingNote}
${groupInstruction}

**Changes at this pause point:**
${groupedChanges}

**Complete Code State (with line numbers):**
${formatSnapshotForGeneration(t.toSnapshot)}

**Previous Context:** ${t.previousContext || 'Start of playback'}
`;
    }).join('\n---\n\n');

    // Verbosity-specific guidance for comments per pause point
    const isHighLevel = verbosity === NARRATIVE_CONFIG.VERBOSITY_LEVELS.HIGH_LEVEL.value;
    const commentsPerPointGuidance = isHighLevel
        ? `1. **ONE comment per pause point**: Generate exactly ONE concise comment per pause point. This comment should summarize the key concept or change - don't break it into multiple separate comments. Keep explanations high-level and focused on the most important takeaway.`
        : `1. **Multiple comments per pause point when needed**: You may generate 2-4 comments per pause point when there are multiple concepts to cover. For example, at one pause point you might have:
   - One comment explaining includes/imports
   - Another comment explaining a function signature
   - Another comment explaining the function body

   This lets the viewer stay focused on one code state while learning several related things.`;

    return `# Task: Generate Educational Comments with Code Highlights

You are creating comments for a code playback - an animated recording that shows code being written character by character.
For each comment point, write educational comments AND identify which lines of code should be highlighted.

${authorSection}${existingCommentsSection}${previousCommentsSection}## Target Audience
${audienceDescription}

## Guidelines for Good Comments

${commentsPerPointGuidance}

2. **Code highlights when referencing code**: If a comment directly refers to specific code, include code highlights pointing to those lines. Readers will see your comment alongside the highlighted code.
   - NOT required for introductory comments, environment setup, or conceptual explanations before code exists
   - DO include highlights when explaining what specific code does
   - Highlights can reference ANY file in the project, not just the file that changed
   - **Highlight ONLY the specific code being discussed** - not the entire function or file
   - Example: If explaining a loop condition, highlight just the loop header (1-2 lines), not the whole loop body
   - Example: If explaining a function call, highlight just that line
   - The line numbers in highlights must match the line numbers shown in the code snapshot above
   - **Context lines (linesAbove/linesBelow)**: Specify how many lines of surrounding context the viewer needs:
     - linesAbove: Lines above the highest highlight to show as secondary context
     - linesBelow: Lines below the lowest highlight to show as secondary context
     - Use small values (0-2) for self-contained code like includes or simple statements
     - Use larger values (3-5) when the viewer needs to see surrounding structure (e.g., the function a line is inside)

3. **Cross-file references**: A change in one file may require explaining code in another file. Create separate stacked comments:
   - One comment highlighting code in fileA.cpp
   - Another comment highlighting related code in fileB.cpp
   Both comments share the same eventIndex and will appear together.

4. **File transitions**: When work switches between files, explain HOW the files relate (e.g., "The header file declares the interface, now let's implement it...")

5. **Flow as a narrative**: Comments should read like chapters in a story
6. **Explain the 'why'**: Not just what the code does, but why
7. **Be concise**: 2-4 sentences per comment
8. **Use markdown formatting**: You can use markdown in comment text, including inline code (e.g., "The \`int x\` variable stores...") and other formatting like **bold** or *italic*

9. **Suggest hand-drawn images when helpful**: Some concepts are much easier to understand with a visual diagram. When a concept would benefit from a whiteboard-style drawing, add an "Author Note" at the end of your comment suggesting what image would help. Good candidates for images include:
   - Data structures (arrays, linked lists, trees, stacks, queues)
   - Memory layouts (variables in memory, pointers, references)
   - Algorithm steps (sorting, searching, swapping elements)
   - Control flow (loops, recursion, function calls)
   - Object relationships (inheritance, composition)

   Format the suggestion as: "\\n\\nAuthor Note: [description of suggested image]"
   Example: "...your comment text...\\n\\nAuthor Note: an image showing an array with index values 0-4 and the current element values would help illustrate this swap operation."

10. **Suggest program output screenshots when helpful**: Sometimes the best way to show what code does is to run it and capture the output. When the code has reached a runnable state with meaningful output, suggest a screenshot. Good candidates include:
   - After completing a function that produces visible output
   - When demonstrating error handling or edge cases
   - After implementing a feature that changes program behavior
   - When console output, GUI changes, or test results would clarify the explanation

   Format the suggestion as: "\\n\\nAuthor Note: [description of suggested screenshot]"
   Example: "...your comment text...\\n\\nAuthor Note: a screenshot of the program output showing the sorted array would demonstrate that the algorithm works correctly."

Only suggest images or screenshots when they would genuinely add value - not every comment needs one. You can include both types in the same Author Note if appropriate.

## Comment Points

${transitionsText}

## Required Response Format

Respond with a JSON object (no markdown, no code fences):
{
  "comments": [
    {
      "eventIndex": <the event index for this comment>,
      "title": "<title ONLY for major direction changes, otherwise empty string>",
      "comment": "The educational comment text (2-4 sentences)",
      "codeHighlights": [
        {
          "filePath": "<exact file path from the snapshot>",
          "startLine": <1-based line number>,
          "endLine": <1-based line number, inclusive>
        }
      ],
      "linesAbove": <number of context lines above the highlights (0-10)>,
      "linesBelow": <number of context lines below the highlights (0-10)>
    }
  ]
}

CRITICAL REQUIREMENTS:
- **Titles are rare**: Only use title for MAJOR direction changes (like starting a new file, switching from setup to implementation, or introducing a completely new concept). Most comments should have title: "" (empty string). Think of titles as chapter headings - you only need a few.
${isHighLevel
    ? `- **ONE comment per pause point**: Generate exactly ONE comment object per pause point, even if there are multiple grouped changes. Summarize all changes in a single concise comment.`
    : `- **Multiple comments per pause point**: When a pause point has multiple grouped changes, generate ONE comment for EACH change, all with the SAME eventIndex. For example, if a pause point shows "3 grouped changes", generate 3 separate comment objects, each explaining one of those changes.
- **Order matters**: Generate comments in the same order as the grouped changes are listed - the first comment should explain Change 1, the second should explain Change 2, etc.`}
- **Complement existing comments**: If a pause point already has comments, your new comments should ADD value, not duplicate. Explain different aspects, provide deeper detail, or cover related concepts the existing comment missed.
- Include codeHighlights when the comment refers to specific code; omit or use empty array for conceptual/introductory comments
- Code highlights can reference ANY file in the project, not just the file that changed
- Line numbers are 1-based (matching the line numbers shown in the code)
- filePath must EXACTLY match a file path from the snapshot
- Comments at the same eventIndex will be "stacked" and shown together
- linesAbove/linesBelow define secondary context - use small values (0-2) for isolated code, larger (3-5) when surrounding structure matters
- **Author Notes for media**: When a concept would benefit from a hand-drawn diagram or a screenshot of program output, append "\\n\\nAuthor Note: [description]" to the comment text describing what image or screenshot would help
`;
}

/**
 * Get audience-specific description
 */
function getAudienceDescription(level) {
    const descriptions = {
        [NARRATIVE_CONFIG.AUDIENCE_LEVELS.BEGINNER]: `Beginner programmers who may be new to the language or programming concepts.
- Explain fundamental concepts when they appear
- Avoid jargon or define it when first used
- Focus on the "why" behind common patterns
- Use analogies where helpful`,

        [NARRATIVE_CONFIG.AUDIENCE_LEVELS.INTERMEDIATE]: `Intermediate programmers who understand basics but are learning new patterns.
- Assume knowledge of basic syntax and control flow
- Focus on design patterns and best practices
- Explain architectural decisions and trade-offs`,

        [NARRATIVE_CONFIG.AUDIENCE_LEVELS.ADVANCED]: `Advanced programmers learning a new codebase or technique.
- Assume strong programming fundamentals
- Focus on sophisticated patterns and edge cases
- Discuss performance and scalability considerations`
    };

    return descriptions[level] || descriptions[NARRATIVE_CONFIG.AUDIENCE_LEVELS.INTERMEDIATE];
}

/**
 * Format snapshot for scoring prompt (abbreviated)
 */
function formatSnapshotForScoring(snapshot) {
    if (!snapshot || Object.keys(snapshot).length === 0) {
        return '(empty)';
    }

    const parts = [];
    for (const [filePath, content] of Object.entries(snapshot)) {
        const lines = content.split('\n');
        const preview = lines.slice(0, 30).join('\n');
        const truncated = lines.length > 30 ? `\n... (${lines.length - 30} more lines)` : '';
        parts.push(`**${filePath}:**\n\`\`\`\n${preview}${truncated}\n\`\`\``);
    }
    return parts.join('\n\n');
}

/**
 * Format snapshot for generation prompt (full content)
 */
function formatSnapshotForGeneration(snapshot) {
    if (!snapshot || Object.keys(snapshot).length === 0) {
        return '(empty)';
    }

    const parts = [];
    for (const [filePath, content] of Object.entries(snapshot)) {
        // Add line numbers for reference
        const lines = content.split('\n');
        const numbered = lines.map((line, i) => `${String(i + 1).padStart(4)} | ${line}`).join('\n');
        parts.push(`**${filePath}:**\n\`\`\`\n${numbered}\n\`\`\``);
    }
    return parts.join('\n\n');
}

/**
 * Build prompt to generate the introductory description comment
 * This summarizes the entire playback and sets the stage for viewers
 */
function buildIntroductionPrompt({ finalSnapshot, commentSummaries, authorGuidance, audienceLevel }) {
    const audienceDescription = getAudienceDescription(audienceLevel);

    const authorSection = authorGuidance
        ? "## Author's Description\nThe author described this code as: \"" + authorGuidance + "\"\n\n"
        : '';

    // Format the final code state
    const codeState = formatSnapshotForGeneration(finalSnapshot);

    // Format the comment summaries
    const commentList = commentSummaries.map((c, i) =>
        (i + 1) + ". " + c.title + ": " + c.comment.slice(0, 100) + (c.comment.length > 100 ? "..." : "")
    ).join("\n");

    return "# Task: Write the Playback Introduction\n\n" +
        "You are writing the FIRST comment of a code playback - this sets the stage for everything that follows.\n" +
        "This comment appears BEFORE any code is shown, so there are no code highlights.\n\n" +
        authorSection +
        "## Target Audience\n" + audienceDescription + "\n\n" +
        "## What Was Built (Final Code State)\n" + codeState + "\n\n" +
        "## Topics Covered in the Playback\n" + commentList + "\n\n" +
        "## Guidelines\n\n" +
        "1. **Set the stage**: Explain what the viewer is about to learn\n" +
        "2. **Describe the goal**: What will be built by the end?\n" +
        "3. **Preview key concepts**: Briefly mention the main topics they'll encounter\n" +
        "4. **Keep it concise**: 3-5 sentences is ideal\n" +
        "5. **Be engaging**: Make the viewer excited to continue\n" +
        "6. **No code references**: This comment appears before any code exists\n\n" +
        "## Required Response Format\n\n" +
        "Respond with a JSON object (no markdown, no code fences):\n" +
        "{\n" +
        '  "title": "Short title for the playback (3-6 words)",\n' +
        '  "description": "The introductory description (3-5 sentences)"\n' +
        "}\n";
}

/**
 * Build prompt to generate the conclusion/summary comment
 * This reinforces what was learned and appears at the end of the playback
 */
function buildConclusionPrompt({ finalSnapshot, commentSummaries, authorGuidance, audienceLevel }) {
    const audienceDescription = getAudienceDescription(audienceLevel);

    const authorSection = authorGuidance
        ? "## Author's Description\nThe author described this code as: \"" + authorGuidance + "\"\n\n"
        : '';

    // Format the final code state
    const codeState = formatSnapshotForGeneration(finalSnapshot);

    // Format the comment summaries
    const commentList = commentSummaries.map((c, i) =>
        (i + 1) + ". " + (c.title ? c.title + ": " : "") + c.comment.slice(0, 100) + (c.comment.length > 100 ? "..." : "")
    ).join("\n");

    return "# Task: Write the Playback Conclusion\n\n" +
        "You are writing the FINAL comment of a code playback - this summarizes what the viewer has learned and reinforces key concepts.\n" +
        "This comment appears AFTER all the code has been written, so you can reference the complete final state.\n\n" +
        authorSection +
        "## Target Audience\n" + audienceDescription + "\n\n" +
        "## Final Code State\n" + codeState + "\n\n" +
        "## Topics That Were Covered\n" + commentList + "\n\n" +
        "## Guidelines\n\n" +
        "1. **Summarize what was built**: Briefly describe the complete program/feature\n" +
        "2. **Reinforce key concepts**: Highlight the most important things the viewer learned\n" +
        "3. **Connect the pieces**: Show how the different parts work together\n" +
        "4. **Encourage next steps**: Optionally suggest what to explore next or how to extend the code\n" +
        "5. **Keep it concise**: 3-5 sentences is ideal\n" +
        "6. **Be encouraging**: Leave the viewer feeling accomplished\n\n" +
        "## Required Response Format\n\n" +
        "Respond with a JSON object (no markdown, no code fences):\n" +
        "{\n" +
        '  "title": "Short title like \\"Summary\\" or \\"Wrapping Up\\" (2-4 words)",\n' +
        '  "conclusion": "The concluding summary (3-5 sentences)"\n' +
        "}\n";
}

module.exports = {
    buildScoringPrompt,
    buildCommentGenerationPrompt,
    buildIntroductionPrompt,
    buildConclusionPrompt,
    getAudienceDescription,
    formatSnapshotForScoring,
    formatSnapshotForGeneration
};
