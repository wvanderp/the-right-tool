export const DEFAULT_MODEL_ID = '~openai/gpt-mini-latest';
export const DEFAULT_WORD_COUNT = 10;
export const MIN_WORD_COUNT = 1;
export const MAX_WORD_COUNT = 50;
export const CONTEXT_BEFORE_LIMIT = 8_000;
export const CONTEXT_AFTER_LIMIT = 4_000;

export interface PredictiveTextSettings {
    apiKey: string;
    modelId: string;
    wordCount: number;
    debugView: boolean;
}

export type TextOrigin = 'human' | 'ai';

export interface ProvenanceRange {
    from: number;
    to: number;
    origin: TextOrigin;
}

export interface ProvenanceChunk {
    origin: TextOrigin;
    text: string;
}

export interface TextChange {
    fromA: number;
    toA: number;
    fromB: number;
    toB: number;
}

export interface TextSelection {
    from: number;
    to: number;
}

export interface PredictionSuggestion {
    position: number;
    text: string;
}

export interface SuggestionTextChange {
    from: number;
    to: number;
    insert: string;
}

export interface PredictionContext {
    before: string;
    after: string;
    beforeTruncated: boolean;
    afterTruncated: boolean;
}

export const recommendedModels = [
    {
        id: DEFAULT_MODEL_ID,
        name: 'OpenAI GPT Mini Latest',
        description: 'Fast and capable for frequent short completions.'
    },
    {
        id: '~anthropic/claude-haiku-latest',
        name: 'Anthropic Claude Haiku Latest',
        description: 'A fast model with strong prose completion.'
    },
    {
        id: '~google/gemini-flash-latest',
        name: 'Google Gemini Flash Latest',
        description: 'A fast model with a large context window.'
    },
    {
        id: 'openrouter/free',
        name: 'OpenRouter Free Models Router',
        description: 'Uses a currently available free model with variable results.'
    }
] as const;

export const defaultSettings: PredictiveTextSettings = {
    apiKey: '',
    modelId: DEFAULT_MODEL_ID,
    wordCount: DEFAULT_WORD_COUNT,
    debugView: false
};

const wordPattern = /[\p{L}\p{N}\p{M}_]+(?:[-'’][\p{L}\p{N}\p{M}_]+)*/gu;

function avoidSplitSurrogate(value: string, position: number, moveForward: boolean): number {
    if (position <= 0 || position >= value.length) {
        return position;
    }

    const previousCodeUnit = value.charCodeAt(position - 1);
    const nextCodeUnit = value.charCodeAt(position);
    const splitsPair = previousCodeUnit >= 0xD800
        && previousCodeUnit <= 0xDBFF
        && nextCodeUnit >= 0xDC00
        && nextCodeUnit <= 0xDFFF;

    if (!splitsPair) {
        return position;
    }

    return moveForward ? position + 1 : position - 1;
}

export function clampWordCount(value: number): number {
    if (!Number.isFinite(value)) {
        return DEFAULT_WORD_COUNT;
    }

    return Math.min(MAX_WORD_COUNT, Math.max(MIN_WORD_COUNT, Math.round(value)));
}

export function getPredictionContext(
    text: string,
    caret: number,
    beforeLimit = CONTEXT_BEFORE_LIMIT,
    afterLimit = CONTEXT_AFTER_LIMIT
): PredictionContext {
    const safeCaret = Math.min(text.length, Math.max(0, caret));
    const requestedStart = Math.max(0, safeCaret - beforeLimit);
    const requestedEnd = Math.min(text.length, safeCaret + afterLimit);
    const start = avoidSplitSurrogate(text, requestedStart, true);
    const end = avoidSplitSurrogate(text, requestedEnd, false);

    return {
        before: text.slice(start, safeCaret),
        after: text.slice(safeCaret, end),
        beforeTruncated: start > 0,
        afterTruncated: end < text.length
    };
}

export function splitSuggestionIntoWords(suggestion: string): string[] {
    const matches = Array.from(suggestion.matchAll(wordPattern));

    if (matches.length === 0) {
        return suggestion ? [suggestion] : [];
    }

    return matches.map((match, index) => {
        const start = index === 0 ? 0 : match.index;
        const nextMatch = matches[index + 1];
        const end = nextMatch?.index ?? suggestion.length;
        return suggestion.slice(start, end);
    });
}

export function normalizeSuggestion(
    rawSuggestion: string,
    contextBefore: string,
    wordCount: number
): string {
    let suggestion = rawSuggestion.replace(/\r\n?/g, '\n').trimEnd();

    if (suggestion.startsWith('```') && suggestion.endsWith('```')) {
        suggestion = suggestion
            .replace(/^```[^\n]*\n?/, '')
            .replace(/\n?```$/, '')
            .trimEnd();
    }

    suggestion = suggestion.replace(/\s*\n+\s*/g, ' ');

    if (/\s$/.test(contextBefore)) {
        suggestion = suggestion.replace(/^\s+/, '');
    } else if (
        contextBefore
        && /[\p{L}\p{N}\p{M}_]$/u.test(contextBefore)
        && /^[\p{L}\p{N}\p{M}_]/u.test(suggestion)
    ) {
        suggestion = ` ${suggestion}`;
    }

    return splitSuggestionIntoWords(suggestion)
        .slice(0, clampWordCount(wordCount))
        .join('')
        .trimEnd();
}

export function findPreviousWordRange(
    text: string,
    selection: TextSelection
): TextSelection | null {
    if (selection.from !== selection.to) {
        return selection;
    }

    if (selection.from === 0) {
        return null;
    }

    const textBeforeCaret = text.slice(0, selection.from);
    const matches = Array.from(textBeforeCaret.matchAll(wordPattern));
    const lastMatch = matches[matches.length - 1];

    if (!lastMatch || lastMatch.index === undefined) {
        return {
            from: 0,
            to: selection.from
        };
    }

    let from = lastMatch.index;

    while (from > 0 && /\s/u.test(text[from - 1])) {
        from -= 1;
    }

    return {
        from,
        to: selection.from
    };
}

export function updateSuggestionForChanges(
    suggestion: PredictionSuggestion,
    changes: SuggestionTextChange[]
): PredictionSuggestion | null {
    let offsetBeforeSuggestion = 0;
    let consumedText = '';

    for (const change of [...changes].sort((left, right) => left.from - right.from)) {
        if (change.from === suggestion.position && change.to === suggestion.position) {
            consumedText += change.insert;

            if (!suggestion.text.startsWith(consumedText)) {
                return null;
            }

            continue;
        }

        if (change.to <= suggestion.position) {
            offsetBeforeSuggestion += change.insert.length - (change.to - change.from);
            continue;
        }

        if (change.from <= suggestion.position) {
            return null;
        }
    }

    const remainingText = suggestion.text.slice(consumedText.length);

    if (!remainingText) {
        return null;
    }

    return {
        position: suggestion.position + offsetBeforeSuggestion + consumedText.length,
        text: remainingText
    };
}

function mergeAdjacentProvenance(ranges: ProvenanceRange[]): ProvenanceRange[] {
    const mergedRanges: ProvenanceRange[] = [];

    for (const range of ranges) {
        if (range.from >= range.to) {
            continue;
        }

        const previousRange = mergedRanges[mergedRanges.length - 1];

        if (previousRange?.origin === range.origin && previousRange.to === range.from) {
            previousRange.to = range.to;
        } else {
            mergedRanges.push({ ...range });
        }
    }

    return mergedRanges;
}

export function normalizeProvenanceRanges(
    ranges: ProvenanceRange[],
    textLength: number
): ProvenanceRange[] {
    if (textLength <= 0) {
        return [];
    }

    const normalizedRanges: ProvenanceRange[] = [];
    let cursor = 0;

    for (const range of [...ranges].sort((left, right) => left.from - right.from)) {
        const from = Math.min(textLength, Math.max(cursor, range.from));
        const to = Math.min(textLength, Math.max(from, range.to));

        if (from > cursor) {
            normalizedRanges.push({
                from: cursor,
                to: from,
                origin: 'human'
            });
        }

        if (to > from) {
            normalizedRanges.push({
                from,
                to,
                origin: range.origin === 'ai' ? 'ai' : 'human'
            });
            cursor = to;
        }
    }

    if (cursor < textLength) {
        normalizedRanges.push({
            from: cursor,
            to: textLength,
            origin: 'human'
        });
    }

    return mergeAdjacentProvenance(normalizedRanges);
}

export function updateProvenanceRanges(
    ranges: ProvenanceRange[],
    oldTextLength: number,
    newTextLength: number,
    changes: TextChange[],
    insertedOrigin: TextOrigin
): ProvenanceRange[] {
    const currentRanges = normalizeProvenanceRanges(ranges, oldTextLength);
    const nextRanges: ProvenanceRange[] = [];
    let oldCursor = 0;
    let newCursor = 0;

    const copyUnchangedRange = (from: number, to: number, offset: number) => {
        for (const range of currentRanges) {
            const intersectionFrom = Math.max(from, range.from);
            const intersectionTo = Math.min(to, range.to);

            if (intersectionFrom < intersectionTo) {
                nextRanges.push({
                    from: intersectionFrom + offset,
                    to: intersectionTo + offset,
                    origin: range.origin
                });
            }
        }
    };

    for (const change of changes) {
        copyUnchangedRange(oldCursor, change.fromA, newCursor - oldCursor);

        if (change.toB > change.fromB) {
            nextRanges.push({
                from: change.fromB,
                to: change.toB,
                origin: insertedOrigin
            });
        }

        oldCursor = change.toA;
        newCursor = change.toB;
    }

    copyUnchangedRange(oldCursor, oldTextLength, newCursor - oldCursor);

    return normalizeProvenanceRanges(
        mergeAdjacentProvenance(nextRanges.sort((left, right) => left.from - right.from)),
        newTextLength
    );
}

export function rangesToProvenanceChunks(
    text: string,
    ranges: ProvenanceRange[]
): ProvenanceChunk[] {
    return normalizeProvenanceRanges(ranges, text.length)
        .map((range) => ({
            origin: range.origin,
            text: text.slice(range.from, range.to)
        }))
        .filter((chunk) => chunk.text.length > 0);
}

export function provenanceChunksToDocument(chunks: ProvenanceChunk[]): {
    text: string;
    ranges: ProvenanceRange[];
} {
    const validChunks = chunks.filter((chunk) => (
        (chunk.origin === 'human' || chunk.origin === 'ai')
        && typeof chunk.text === 'string'
        && chunk.text.length > 0
    ));
    const text = validChunks.map((chunk) => chunk.text).join('');
    const ranges: ProvenanceRange[] = [];
    let position = 0;

    for (const chunk of validChunks) {
        const previousRange = ranges[ranges.length - 1];
        const nextPosition = position + chunk.text.length;

        if (previousRange?.origin === chunk.origin && previousRange.to === position) {
            previousRange.to = nextPosition;
        } else {
            ranges.push({
                from: position,
                to: nextPosition,
                origin: chunk.origin
            });
        }

        position = nextPosition;
    }

    return { text, ranges };
}
