export interface CharacterInfo {
    char: string;
    displayChar: string;
    code: number;
    name: string;
    category: string;
    block: string;
    script: string;
}

const getVisibleRepresentation = (char: string): string => {
    // For emoji and other complex characters, show them as-is
    if (char.length > 2) {
        return char;
    }

    const code = char.codePointAt(0) || 0;

    // Handle Zero Width Joiner specially
    if (code === 0x200D) {
        return '⁞';
    }

    // Common control characters
    const controlChars: Record<number, string> = {
        0: '␀', // Null
        1: '␁', // Start of Heading
        2: '␂', // Start of Text
        3: '␃', // End of Text
        4: '␄', // End of Transmission
        5: '␅', // Enquiry
        6: '␆', // Acknowledge
        7: '␇', // Bell
        8: '␈', // Backspace
        9: '␉', // Horizontal Tab
        10: '␊', // Line Feed
        11: '␋', // Vertical Tab
        12: '␌', // Form Feed
        13: '␍', // Carriage Return
        14: '␎', // Shift Out
        15: '␏', // Shift In
        16: '␐', // Data Link Escape
        17: '␑', // Device Control 1
        18: '␒', // Device Control 2
        19: '␓', // Device Control 3
        20: '␔', // Device Control 4
        21: '␕', // Negative Acknowledge
        22: '␖', // Synchronous Idle
        23: '␗', // End of Transmission Block
        24: '␘', // Cancel
        25: '␙', // End of Medium
        26: '␚', // Substitute
        27: '␛', // Escape
        28: '␜', // File Separator
        29: '␝', // Group Separator
        30: '␞', // Record Separator
        31: '␟', // Unit Separator
        32: '␠', // Space
        127: '␡', // Delete
    };

    // Special whitespace characters
    const whitespaceChars: Record<number, string> = {
        160: '␠', // No-Break Space
        5760: '⌴', // Ogham Space Mark
        8192: '␣', // En Quad
        8193: '␣', // Em Quad
        8194: '␣', // En Space
        8195: '␣', // Em Space
        8196: '␣', // Three-Per-Em Space
        8197: '␣', // Four-Per-Em Space
        8198: '␣', // Six-Per-Em Space
        8199: '␣', // Figure Space
        8200: '␣', // Punctuation Space
        8201: '␣', // Thin Space
        8202: '␣', // Hair Space
        8203: '⁞', // Zero Width Space
        8204: '⁞', // Zero Width Non-Joiner
        8205: '⁞', // Zero Width Joiner
        8239: '␠', // Narrow No-Break Space
        8287: '␣', // Medium Mathematical Space
        12288: '␣', // Ideographic Space
    };

    if (code in controlChars) {
        return controlChars[code];
    }
    if (code in whitespaceChars) {
        return whitespaceChars[code];
    }
    if (code < 32 || (code >= 127 && code <= 159)) {
        return `�${String.fromCharCode(code + 64)}`; // Standard control picture representation
    }
    return char;
};

const getCharacterName = (char: string): string => {
    const code = char.codePointAt(0) || 0;
    
    // Special handling for known emoji and modifiers
    const specialNames: Record<number, string> = {
        0x1F468: 'MAN',
        0x1F3FF: 'EMOJI MODIFIER FITZPATRICK TYPE-6',
        0x200D: 'ZERO WIDTH JOINER',
        0x1F692: 'FIRE ENGINE'
    };

    if (code in specialNames) {
        return specialNames[code];
    }

    try {
        return char.normalize('NFD');
    } catch {
        return 'Unknown';
    }
};

const getUnicodeCategory = (code: number): string => {
    if (code >= 0x0000 && code <= 0x001F) return 'Control';
    if (code >= 0x0020 && code <= 0x007F) return 'Basic Latin';
    if (code >= 0x0080 && code <= 0x009F) return 'Control';
    if (code >= 0x00A0 && code <= 0x00FF) return 'Latin-1 Supplement';
    if (code >= 0x0100 && code <= 0x017F) return 'Latin Extended-A';
    if (code >= 0x0180 && code <= 0x024F) return 'Latin Extended-B';
    if (code >= 0x0250 && code <= 0x02AF) return 'IPA Extensions';
    if (code >= 0x02B0 && code <= 0x02FF) return 'Spacing Modifier Letters';
    if (code >= 0x0300 && code <= 0x036F) return 'Combining Diacritical Marks';
    return 'Other';
};

const getUnicodeBlock = (code: number): string => {
    if (code <= 0x007F) return 'Basic Latin';
    if (code <= 0x00FF) return 'Latin-1';
    if (code <= 0x017F) return 'Latin Extended';
    if (code <= 0x024F) return 'Latin Extended Additional';
    if (code <= 0x02AF) return 'Phonetic';
    return 'Other';
};

const getScript = (code: number): string => {
    if (code <= 0x024F) return 'Latin';
    if (code >= 0x0400 && code <= 0x04FF) return 'Cyrillic';
    if (code >= 0x0590 && code <= 0x05FF) return 'Hebrew';
    if (code >= 0x0600 && code <= 0x06FF) return 'Arabic';
    if (code >= 0x3040 && code <= 0x309F) return 'Hiragana';
    if (code >= 0x30A0 && code <= 0x30FF) return 'Katakana';
    if (code >= 0x4E00 && code <= 0x9FFF) return 'Han';
    return 'Unknown';
};

export const getCharacterInfoArray = (text: string): CharacterInfo[] => {
    // Use grapheme clusters to properly handle emoji sequences
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const graphemes = Array.from(segmenter.segment(text));
    
    return graphemes.flatMap(({segment}) => {
        // For complex emoji sequences, split into components
        const components = Array.from(segment);
        return components.map(char => {
            const code = char.codePointAt(0) || 0;
            return {
                char,
                displayChar: getVisibleRepresentation(char),
                code,
                name: getCharacterName(char),
                category: getUnicodeCategory(code),
                block: getUnicodeBlock(code),
                script: getScript(code)
            };
        });
    });
};