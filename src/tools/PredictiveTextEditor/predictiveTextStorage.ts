import {
    clampWordCount,
    defaultSettings,
    normalizeProvenanceRanges,
    PredictionSuggestion,
    provenanceChunksToDocument,
    ProvenanceChunk,
    ProvenanceRange,
    PredictiveTextSettings,
    rangesToProvenanceChunks,
} from './predictiveTextLogic';

export const SETTINGS_STORAGE_KEY = 'predictiveTextEditor.settings.v1';
export const DRAFT_STORAGE_KEY = 'predictiveTextEditor.draft.v1';
export const PROVENANCE_STORAGE_KEY = 'predictiveTextEditor.provenance.v1';
export const DOCUMENT_STORAGE_KEY = 'predictiveTextEditor.document.v2';

export interface StoredDocument {
    text: string;
    provenance: ProvenanceRange[];
    suggestion: PredictionSuggestion | null;
}

interface StoredEditorState {
    chunks: ProvenanceChunk[];
    suggestion: PredictionSuggestion | null;
}

function getBrowserStorage(): Storage | null {
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
}

export function loadSettings(storage = getBrowserStorage()): PredictiveTextSettings {
    if (!storage) {
        return defaultSettings;
    }

    try {
        const savedValue = storage.getItem(SETTINGS_STORAGE_KEY);

        if (!savedValue) {
            return defaultSettings;
        }

        const parsedValue = JSON.parse(savedValue) as Partial<PredictiveTextSettings>;

        return {
            apiKey: typeof parsedValue.apiKey === 'string' ? parsedValue.apiKey : '',
            modelId:
                typeof parsedValue.modelId === 'string' && parsedValue.modelId.trim()
                    ? parsedValue.modelId.trim()
                    : defaultSettings.modelId,
            wordCount: clampWordCount(Number(parsedValue.wordCount)),
            debugView: parsedValue.debugView === true,
        };
    }
    catch {
        return defaultSettings;
    }
}

export function saveSettings(
    settings: PredictiveTextSettings,
    storage = getBrowserStorage(),
): void {
    try {
        storage?.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify({
                apiKey: settings.apiKey.trim(),
                modelId: settings.modelId.trim(),
                wordCount: clampWordCount(settings.wordCount),
                debugView: settings.debugView,
            }),
        );
    }
    catch {
        // The editor remains usable when storage is unavailable or full.
    }
}

function loadLegacyDocument(storage: Storage): StoredDocument {
    try {
        const text = storage.getItem(DRAFT_STORAGE_KEY) ?? '';
        const savedProvenance = storage.getItem(PROVENANCE_STORAGE_KEY);
        const parsedProvenance = savedProvenance
            ? (JSON.parse(savedProvenance) as ProvenanceRange[])
            : [];
        const provenance = normalizeProvenanceRanges(
            Array.isArray(parsedProvenance) ? parsedProvenance : [],
            text.length,
        );

        return { text, provenance, suggestion: null };
    }
    catch {
        const text = storage.getItem(DRAFT_STORAGE_KEY) ?? '';
        return {
            text,
            provenance: normalizeProvenanceRanges([], text.length),
            suggestion: null,
        };
    }
}

function normalizeStoredSuggestion(
    suggestion: unknown,
    textLength: number,
): PredictionSuggestion | null {
    if (
        !suggestion
        || typeof suggestion !== 'object'
        || !('position' in suggestion)
        || !('text' in suggestion)
    ) {
        return null;
    }

    const { position, text } = suggestion as Partial<PredictionSuggestion>;

    if (
        !Number.isInteger(position)
        || typeof position !== 'number'
        || position < 0
        || position > textLength
        || typeof text !== 'string'
        || !text
    ) {
        return null;
    }

    return { position, text };
}

export function loadDocument(storage = getBrowserStorage()): StoredDocument {
    if (!storage) {
        return { text: '', provenance: [], suggestion: null };
    }

    try {
        const savedValue = storage.getItem(DOCUMENT_STORAGE_KEY);

        if (savedValue) {
            const parsedValue = JSON.parse(savedValue) as StoredEditorState | ProvenanceChunk[];
            const chunks = Array.isArray(parsedValue) ? parsedValue : parsedValue.chunks;
            const document = provenanceChunksToDocument(Array.isArray(chunks) ? chunks : []);
            return {
                text: document.text,
                provenance: document.ranges,
                suggestion: Array.isArray(parsedValue)
                    ? null
                    : normalizeStoredSuggestion(parsedValue.suggestion, document.text.length),
            };
        }
    }
    catch {
        // Fall through to the legacy draft migration.
    }

    const legacyDocument = loadLegacyDocument(storage);
    saveDocument(legacyDocument.text, legacyDocument.provenance, null, storage);
    return legacyDocument;
}

export function saveDocument(
    text: string,
    ranges: ProvenanceRange[],
    suggestion: PredictionSuggestion | null = null,
    storage = getBrowserStorage(),
): void {
    try {
        storage?.setItem(
            DOCUMENT_STORAGE_KEY,
            JSON.stringify({
                chunks: rangesToProvenanceChunks(text, ranges),
                suggestion: normalizeStoredSuggestion(suggestion, text.length),
            } satisfies StoredEditorState),
        );
        storage?.removeItem(DRAFT_STORAGE_KEY);
        storage?.removeItem(PROVENANCE_STORAGE_KEY);
    }
    catch {
        // The reconstructed document remains available for the current session.
    }
}

export function clearPredictiveTextData(storage = getBrowserStorage()): void {
    try {
        storage?.removeItem(SETTINGS_STORAGE_KEY);
        storage?.removeItem(DRAFT_STORAGE_KEY);
        storage?.removeItem(PROVENANCE_STORAGE_KEY);
        storage?.removeItem(DOCUMENT_STORAGE_KEY);
    }
    catch {
        // There is nothing else to clear when browser storage is unavailable.
    }
}
