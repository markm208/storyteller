/**
 * Narrative Generation Configuration
 * All config for AI-powered narrative generation in one place
 */
const NARRATIVE_CONFIG = {
    // AI settings
    AI_MODEL: 'gpt-4o-mini',
    AI_MAX_TOKENS: 4000,

    // Comment tagging
    AI_GENERATED_TAG: 'ai-generated',

    // Scoring and batching
    BATCH_SIZE: 15,              // Transitions per scoring batch
    COMMENT_BATCH_SIZE: 1,       // Transitions per comment generation batch (1 = most reliable, avoids token limits)
    MIN_SCORE_THRESHOLD: 7,      // Minimum score to be selected as comment point

    // Audience levels
    AUDIENCE_LEVELS: {
        BEGINNER: 'beginner',
        INTERMEDIATE: 'intermediate',
        ADVANCED: 'advanced'
    },

    // Verbosity levels with score thresholds
    VERBOSITY_LEVELS: {
        VERBOSE: {
            value: 'verbose',
            threshold: 5  // Lower threshold = more comments
        },
        HIGH_LEVEL: {
            value: 'high-level',
            threshold: 8  // Higher threshold = fewer comments
        }
    }
};

module.exports = { NARRATIVE_CONFIG };
