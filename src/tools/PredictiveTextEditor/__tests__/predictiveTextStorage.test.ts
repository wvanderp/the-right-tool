import { describe, expect, it } from 'vitest';
import {
    DOCUMENT_STORAGE_KEY,
    DRAFT_STORAGE_KEY,
    loadDocument,
    PROVENANCE_STORAGE_KEY,
    saveDocument,
} from '../predictiveTextStorage';

function createStorage(): Storage {
    const values = new Map<string, string>();

    return {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: key => values.get(key) ?? null,
        key: index => Array.from(values.keys())[index] ?? null,
        removeItem: (key) => {
            values.delete(key);
        },
        setItem: (key, value) => {
            values.set(key, value);
        },
    };
}

describe('predictiveTextStorage', () => {
    it('stores provenance chunks as the only document source of truth', () => {
        const storage = createStorage();

        saveDocument(
            'Hello world!',
            [
                { from: 0, to: 6, origin: 'human' },
                { from: 6, to: 11, origin: 'ai' },
                { from: 11, to: 12, origin: 'human' },
            ],
            { position: 12, text: ' Welcome back.' },
            storage,
        );

        expect(JSON.parse(storage.getItem(DOCUMENT_STORAGE_KEY) ?? '')).toEqual({
            chunks: [
                { origin: 'human', text: 'Hello ' },
                { origin: 'ai', text: 'world' },
                { origin: 'human', text: '!' },
            ],
            suggestion: {
                position: 12,
                text: ' Welcome back.',
            },
        });
        expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
        expect(storage.getItem(PROVENANCE_STORAGE_KEY)).toBeNull();
        expect(loadDocument(storage)).toEqual({
            text: 'Hello world!',
            provenance: [
                { from: 0, to: 6, origin: 'human' },
                { from: 6, to: 11, origin: 'ai' },
                { from: 11, to: 12, origin: 'human' },
            ],
            suggestion: {
                position: 12,
                text: ' Welcome back.',
            },
        });
    });

    it('migrates the legacy draft and positional provenance into chunks', () => {
        const storage = createStorage();
        storage.setItem(DRAFT_STORAGE_KEY, 'Hello AI');
        storage.setItem(
            PROVENANCE_STORAGE_KEY,
            JSON.stringify([
                { from: 0, to: 6, origin: 'human' },
                { from: 6, to: 8, origin: 'ai' },
            ]),
        );

        expect(loadDocument(storage)).toEqual({
            text: 'Hello AI',
            provenance: [
                { from: 0, to: 6, origin: 'human' },
                { from: 6, to: 8, origin: 'ai' },
            ],
            suggestion: null,
        });
        expect(JSON.parse(storage.getItem(DOCUMENT_STORAGE_KEY) ?? '')).toEqual({
            chunks: [
                { origin: 'human', text: 'Hello ' },
                { origin: 'ai', text: 'AI' },
            ],
            suggestion: null,
        });
        expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
        expect(storage.getItem(PROVENANCE_STORAGE_KEY)).toBeNull();
    });
});
