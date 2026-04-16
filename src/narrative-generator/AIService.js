/**
 * AIService - Handles communication with OpenAI for narrative generation
 *
 * New approach:
 * 1. scoreTransitions() - Rate pedagogical significance of each transition
 * 2. generateComments() - Create educational comments for selected points
 */

const https = require('https');
const { NARRATIVE_CONFIG } = require('./config');
const { buildScoringPrompt, buildCommentGenerationPrompt, buildIntroductionPrompt, buildConclusionPrompt } = require('./prompts');

class AIService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = NARRATIVE_CONFIG.AI_MODEL;
        this.maxTokens = NARRATIVE_CONFIG.AI_MAX_TOKENS;
    }

    /**
     * Check if API key is configured
     */
    hasApiKey() {
        return Boolean(this.apiKey && this.apiKey.trim());
    }

    /**
     * Score a batch of transitions for pedagogical significance
     *
     * @param {Object} options
     * @param {Array} options.transitions - Array of transition objects with diffText
     * @param {Array} options.existingComments - Array of existing comments for context
     * @param {string} options.audienceLevel - Target audience
     * @param {string|null} options.authorGuidance - Optional author context
     * @returns {Promise<Array>} Array of { transitionIndex, score, reasoning, suggestedTitle }
     */
    async scoreTransitions(options) {
        const { transitions, existingComments, audienceLevel, authorGuidance } = options;

        if (transitions.length === 0) {
            return [];
        }

        const prompt = buildScoringPrompt({
            transitions,
            existingComments: existingComments || [],
            audienceLevel,
            authorGuidance
        });

        const responseText = await this._callOpenAI(prompt);

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Failed to parse scoring response as JSON: ${e.message}`);
        }

        return parsed.scores || [];
    }

    /**
     * Generate educational comments for selected transitions
     *
     * @param {Object} options
     * @param {Array} options.selectedTransitions - High-scoring transitions
     * @param {Array} options.existingComments - Array of existing comments for context
     * @param {string} options.audienceLevel - Target audience
     * @param {string|null} options.authorGuidance - Optional author context
     * @returns {Promise<Array>} Array of { eventIndex, title, comment }
     */
    async generateComments(options) {
        const { selectedTransitions, existingComments, previouslyGeneratedComments, audienceLevel, verbosity, authorGuidance } = options;

        if (selectedTransitions.length === 0) {
            return [];
        }

        const prompt = buildCommentGenerationPrompt({
            selectedTransitions,
            existingComments: existingComments || [],
            previouslyGeneratedComments: previouslyGeneratedComments || [],
            audienceLevel,
            verbosity,
            authorGuidance
        });

        const responseText = await this._callOpenAI(prompt);

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            // Try to repair truncated JSON
            const repaired = this._repairTruncatedCommentsJson(responseText);
            if (repaired) {
                console.warn('Comment generation response was truncated, recovered partial results');
                parsed = repaired;
            } else {
                throw new Error(`Failed to parse comment generation response as JSON: ${e.message}`);
            }
        }

        return parsed.comments || [];
    }

    /**
     * Generate the introductory description for the playback
     *
     * @param {Object} options
     * @param {Object} options.finalSnapshot - The final code state
     * @param {Array} options.commentSummaries - Array of { title, comment } from generated comments
     * @param {string} options.audienceLevel - Target audience
     * @param {string|null} options.authorGuidance - Optional author context
     * @returns {Promise<{ title: string, description: string }>}
     */
    async generateIntroduction(options) {
        const { finalSnapshot, commentSummaries, audienceLevel, authorGuidance } = options;

        const prompt = buildIntroductionPrompt({
            finalSnapshot,
            commentSummaries,
            audienceLevel,
            authorGuidance
        });

        const responseText = await this._callOpenAI(prompt);

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Failed to parse introduction response as JSON: ${e.message}`);
        }

        return {
            title: parsed.title || 'Code Playback',
            description: parsed.description || ''
        };
    }

    /**
     * Generate the conclusion/summary for the playback
     *
     * @param {Object} options
     * @param {Object} options.finalSnapshot - The final code state
     * @param {Array} options.commentSummaries - Array of { title, comment } from generated comments
     * @param {string} options.audienceLevel - Target audience
     * @param {string|null} options.authorGuidance - Optional author context
     * @returns {Promise<{ title: string, conclusion: string }>}
     */
    async generateConclusion(options) {
        const { finalSnapshot, commentSummaries, audienceLevel, authorGuidance } = options;

        const prompt = buildConclusionPrompt({
            finalSnapshot,
            commentSummaries,
            audienceLevel,
            authorGuidance
        });

        const responseText = await this._callOpenAI(prompt);

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Failed to parse conclusion response as JSON: ${e.message}`);
        }

        return {
            title: parsed.title || 'Summary',
            conclusion: parsed.conclusion || ''
        };
    }

    /**
     * Call OpenAI API
     */
    async _callOpenAI(prompt) {
        const requestBody = JSON.stringify({
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `You are an expert programming educator who creates clear, engaging narratives to explain code evolution. You identify pedagogically significant moments and explain them in a way that helps learners understand not just what changed, but why it matters.

You must respond with valid JSON only. No markdown, no code fences, just the JSON object.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: this.maxTokens,
            temperature: 0.7,
            response_format: { type: 'json_object' }
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);

                        if (res.statusCode !== 200) {
                            const errorMessage = parsed.error?.message || `HTTP ${res.statusCode}`;
                            reject(new Error(`OpenAI API error: ${errorMessage}`));
                            return;
                        }

                        resolve(parsed.choices[0].message.content);
                    } catch (e) {
                        reject(new Error(`Failed to parse OpenAI response: ${e.message}`));
                    }
                });
            });

            req.on('error', (e) => {
                reject(new Error(`OpenAI request failed: ${e.message}`));
            });

            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Attempt to repair truncated JSON for comment generation responses.
     * The expected format is {"comments": [{...}, {...}, ...]}.
     * If truncated mid-array, try to recover the complete comments.
     * @param {string} text - The truncated JSON text
     * @returns {Object|null} Parsed object with comments array, or null if repair failed
     */
    _repairTruncatedCommentsJson(text) {
        try {
            // Find the start of the comments array
            const commentsStart = text.indexOf('"comments"');
            if (commentsStart === -1) return null;

            const arrayStart = text.indexOf('[', commentsStart);
            if (arrayStart === -1) return null;

            // Find all complete comment objects by looking for },{ or }] patterns
            // We'll work backwards from the end to find the last complete object
            let lastCompleteIndex = -1;
            let braceDepth = 0;
            let bracketDepth = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = arrayStart; i < text.length; i++) {
                const char = text[i];

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (char === '\\' && inString) {
                    escapeNext = true;
                    continue;
                }

                if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                }

                if (inString) continue;

                if (char === '{') braceDepth++;
                if (char === '}') {
                    braceDepth--;
                    // If we just closed an object at array level (bracketDepth === 1, braceDepth === 0)
                    // this is a complete comment object
                    if (bracketDepth === 1 && braceDepth === 0) {
                        lastCompleteIndex = i;
                    }
                }
                if (char === '[') bracketDepth++;
                if (char === ']') bracketDepth--;
            }

            if (lastCompleteIndex === -1) return null;

            // Extract from start to last complete object, then close the array and object
            const repairedJson = text.substring(0, lastCompleteIndex + 1) + ']}';

            const parsed = JSON.parse(repairedJson);
            return parsed;
        } catch (e) {
            return null;
        }
    }
}

module.exports = AIService;
