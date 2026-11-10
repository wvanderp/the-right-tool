import { describe, expect, it } from 'vitest';
import {
    clampWordCount,
    findPreviousWordRange,
    getPredictionContext,
    normalizeSuggestion,
    normalizeProvenanceRanges,
    provenanceChunksToDocument,
    rangesToProvenanceChunks,
    splitSuggestionIntoWords,
    updateSuggestionForChanges,
    updateProvenanceRanges,
} from '../predictiveTextLogic';

describe('predictiveTextLogic', () => {
    it('builds bounded context without splitting surrogate pairs', () => {
        const text = `1234😀6789`;
        const context = getPredictionContext(text, 6, 5, 3);

        expect(context.before).toBe('234😀');
        expect(context.after).toBe('678');
        expect(context.beforeTruncated).toBe(true);
        expect(context.afterTruncated).toBe(true);
    });

    it('splits suggestions into word-sized insertions with punctuation', () => {
        expect(splitSuggestionIntoWords(' wonderful, bright world.')).toEqual([
            ' wonderful, ',
            'bright ',
            'world.',
        ]);
        expect(splitSuggestionIntoWords(' can’t stop')).toEqual([' can’t ', 'stop']);
        expect(splitSuggestionIntoWords('...')).toEqual(['...']);
    });

    it('normalizes spacing, fences, line breaks, and the requested word limit', () => {
        expect(normalizeSuggestion('small green tree grows quickly', 'A', 3)).toBe(
            ' small green tree',
        );
        expect(normalizeSuggestion('  next word', 'Already ', 2)).toBe('next word');
        expect(normalizeSuggestion('```\nnext\nline\n```', 'The ', 10)).toBe('next line');
    });

    it('finds the previous word and its surrounding separators', () => {
        expect(findPreviousWordRange('Hello, world!', { from: 13, to: 13 })).toEqual({
            from: 6,
            to: 13,
        });
        expect(findPreviousWordRange('Hello world', { from: 9, to: 9 })).toEqual({
            from: 5,
            to: 9,
        });
        expect(findPreviousWordRange('Selected text', { from: 0, to: 8 })).toEqual({
            from: 0,
            to: 8,
        });
        expect(findPreviousWordRange('Hello', { from: 0, to: 0 })).toBeNull();
    });

    it('clamps prediction lengths', () => {
        expect(clampWordCount(0)).toBe(1);
        expect(clampWordCount(12.6)).toBe(13);
        expect(clampWordCount(100)).toBe(50);
        expect(clampWordCount(Number.NaN)).toBe(10);
    });

    it('keeps and remaps a prediction when edits do not replace it', () => {
        const suggestion = { position: 6, text: 'world' };

        expect(updateSuggestionForChanges(suggestion, [])).toEqual(suggestion);
        expect(
            updateSuggestionForChanges(suggestion, [{ from: 0, to: 0, insert: 'Say ' }]),
        ).toEqual({
            position: 10,
            text: 'world',
        });
        expect(updateSuggestionForChanges(suggestion, [{ from: 6, to: 6, insert: 'wor' }])).toEqual(
            {
                position: 9,
                text: 'ld',
            },
        );
        expect(
            updateSuggestionForChanges(suggestion, [{ from: 8, to: 8, insert: ' elsewhere' }]),
        ).toEqual(suggestion);
    });

    it('invalidates a prediction only when an edit conflicts with it', () => {
        const suggestion = { position: 6, text: 'world' };

        expect(
            updateSuggestionForChanges(suggestion, [{ from: 6, to: 6, insert: 'wonder' }]),
        ).toBeNull();
        expect(
            updateSuggestionForChanges(suggestion, [{ from: 6, to: 7, insert: 'W' }]),
        ).toBeNull();
        expect(updateSuggestionForChanges(suggestion, [{ from: 4, to: 8, insert: '' }])).toBeNull();
    });

    it('tracks AI insertions and later human edits', () => {
        const initialRanges = normalizeProvenanceRanges([], 5);
        const afterAiInsertion = updateProvenanceRanges(
            initialRanges,
            5,
            11,
            [{ fromA: 5, toA: 5, fromB: 5, toB: 11 }],
            'ai',
        );

        expect(afterAiInsertion).toEqual([
            { from: 0, to: 5, origin: 'human' },
            { from: 5, to: 11, origin: 'ai' },
        ]);

        const afterHumanInsertion = updateProvenanceRanges(
            afterAiInsertion,
            11,
            12,
            [{ fromA: 11, toA: 11, fromB: 11, toB: 12 }],
            'human',
        );

        expect(afterHumanInsertion).toEqual([
            { from: 0, to: 5, origin: 'human' },
            { from: 5, to: 11, origin: 'ai' },
            { from: 11, to: 12, origin: 'human' },
        ]);

        expect(
            updateProvenanceRanges(
                afterHumanInsertion,
                12,
                12,
                [{ fromA: 7, toA: 9, fromB: 7, toB: 9 }],
                'human',
            ),
        ).toEqual([
            { from: 0, to: 5, origin: 'human' },
            { from: 5, to: 7, origin: 'ai' },
            { from: 7, to: 9, origin: 'human' },
            { from: 9, to: 11, origin: 'ai' },
            { from: 11, to: 12, origin: 'human' },
        ]);
    });

    it('remaps provenance when text is deleted', () => {
        expect(
            updateProvenanceRanges(
                [
                    { from: 0, to: 5, origin: 'human' },
                    { from: 5, to: 11, origin: 'ai' },
                    { from: 11, to: 12, origin: 'human' },
                ],
                12,
                8,
                [{ fromA: 4, toA: 8, fromB: 4, toB: 4 }],
                'human',
            ),
        ).toEqual([
            { from: 0, to: 4, origin: 'human' },
            { from: 4, to: 7, origin: 'ai' },
            { from: 7, to: 8, origin: 'human' },
        ]);
    });

    it('round-trips the document through provenance chunks', () => {
        const chunks = rangesToProvenanceChunks('Hello world!', [
            { from: 0, to: 6, origin: 'human' },
            { from: 6, to: 11, origin: 'ai' },
            { from: 11, to: 12, origin: 'human' },
        ]);

        expect(chunks).toEqual([
            { origin: 'human', text: 'Hello ' },
            { origin: 'ai', text: 'world' },
            { origin: 'human', text: '!' },
        ]);
        expect(provenanceChunksToDocument(chunks)).toEqual({
            text: 'Hello world!',
            ranges: [
                { from: 0, to: 6, origin: 'human' },
                { from: 6, to: 11, origin: 'ai' },
                { from: 11, to: 12, origin: 'human' },
            ],
        });
    });
});
