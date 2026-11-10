import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiCopy, FiLoader, FiSettings, FiTrash2 } from 'react-icons/fi';
import ToolDescription from '../../components/ToolDescription';
import ToolPage from '../../components/ToolPage';
import { buildOpenRouterRequestBody, OpenRouterError, requestPrediction } from './openRouterClient';
import PredictiveEditor, {
    EditorSnapshot,
    GhostSuggestion,
    PredictiveEditorHandle,
} from './PredictiveEditor';
import PredictiveTextSettingsDialog from './PredictiveTextSettingsDialog';
import {
    defaultSettings,
    findPreviousWordRange,
    getPredictionContext,
    normalizeSuggestion,
    PredictiveTextSettings,
    splitSuggestionIntoWords,
    updateSuggestionForChanges,
} from './predictiveTextLogic';
import {
    clearPredictiveTextData,
    loadDocument,
    loadSettings,
    saveDocument,
    saveSettings,
} from './predictiveTextStorage';

type EditorStatus = {
    kind: 'idle' | 'loading' | 'success' | 'info' | 'error';
    message: string;
};

export default function PredictiveTextEditor(): React.ReactElement {
    const [settings, setSettings] = useState<PredictiveTextSettings>(() => loadSettings());
    const [savedDocument] = useState(() => loadDocument());
    const [documentState, setDocumentState] = useState(() => ({
        text: savedDocument.text,
        provenance: savedDocument.provenance,
    }));
    const documentText = documentState.text;
    const provenance = documentState.provenance;
    const [selection, setSelection] = useState(() => ({
        from: documentText.length,
        to: documentText.length,
    }));
    const [suggestion, setSuggestion] = useState<GhostSuggestion | null>(
        () => savedDocument.suggestion,
    );
    const [lastPromptBody, setLastPromptBody] = useState<string | null>(null);
    const [status, setStatus] = useState<EditorStatus>(() =>
        settings.apiKey
            ? { kind: 'idle', message: 'Ready to predict.' }
            : {
                    kind: 'info',
                    message: 'Add an OpenRouter API key in settings to start predicting.',
                },
    );
    const [settingsOpen, setSettingsOpen] = useState(!settings.apiKey);
    const editorRef = useRef<PredictiveEditorHandle>(null);
    const requestControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const persistDocument = () => {
            saveDocument(documentText, provenance, suggestion);
        };
        const saveTimer = window.setTimeout(() => {
            persistDocument();
        }, 300);
        window.addEventListener('pagehide', persistDocument);

        return () => {
            window.clearTimeout(saveTimer);
            window.removeEventListener('pagehide', persistDocument);
        };
    }, [documentText, provenance, suggestion]);

    useEffect(
        () => () => {
            requestControllerRef.current?.abort();
        },
        [],
    );

    const handleEditorStateChange = useCallback((snapshot: EditorSnapshot) => {
        if (snapshot.changes.length > 0) {
            requestControllerRef.current?.abort();
            setSuggestion(currentSuggestion =>
                currentSuggestion
                    ? updateSuggestionForChanges(currentSuggestion, snapshot.changes)
                    : null,
            );
        }
        setDocumentState({
            text: snapshot.text,
            provenance: snapshot.provenance,
        });
        setSelection(snapshot.selection);
    }, []);

    const runPrediction = useCallback(async (): Promise<boolean> => {
        if (!settings.apiKey) {
            setStatus({
                kind: 'info',
                message: 'Add an OpenRouter API key before requesting a prediction.',
            });
            setSettingsOpen(true);
            return true;
        }

        if (selection.from !== selection.to) {
            setStatus({
                kind: 'info',
                message: 'Place the caret at one position before requesting a prediction.',
            });
            return true;
        }

        if (!documentText.trim()) {
            setStatus({
                kind: 'info',
                message: 'Paste or write some text before requesting a prediction.',
            });
            return true;
        }

        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        setSuggestion(null);
        setStatus({
            kind: 'loading',
            message: 'Generating a contextual prediction.',
        });

        const context = getPredictionContext(documentText, selection.from);
        const requestBody = buildOpenRouterRequestBody({
            modelId: settings.modelId,
            wordCount: settings.wordCount,
            context,
        });
        setLastPromptBody(JSON.stringify(requestBody, null, 2));

        try {
            const response = await requestPrediction({
                apiKey: settings.apiKey,
                modelId: settings.modelId,
                wordCount: settings.wordCount,
                context,
                signal: controller.signal,
            });

            if (requestControllerRef.current !== controller) {
                return true;
            }

            const normalizedSuggestion = normalizeSuggestion(
                response.text,
                context.before,
                settings.wordCount,
            );

            if (!normalizedSuggestion) {
                setStatus({
                    kind: 'info',
                    message:
                        'The model did not return a usable continuation. Press Ctrl+Space to try again.',
                });
                return true;
            }

            setSuggestion({
                position: selection.from,
                text: normalizedSuggestion,
            });

            const tokenParts = [
                response.promptTokens === undefined
                    ? null
                    : `${response.promptTokens} input tokens`,
                response.completionTokens === undefined
                    ? null
                    : `${response.completionTokens} output tokens`,
            ].filter(Boolean);

            setStatus({
                kind: 'success',
                message: `Prediction ready from ${response.model}.${tokenParts.length ? ` ${tokenParts.join(' and ')}.` : ''}`,
            });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return true;
            }

            const retryMessage
                = error instanceof OpenRouterError && error.retryAfterSeconds
                    ? ` Try again in ${error.retryAfterSeconds} seconds.`
                    : '';

            setStatus({
                kind: 'error',
                message: `${error instanceof Error ? error.message : 'The prediction request failed.'}${retryMessage}`,
            });

            if (error instanceof OpenRouterError && error.status === 401) {
                setSettingsOpen(true);
            }
        }
        finally {
            if (requestControllerRef.current === controller) {
                requestControllerRef.current = null;
            }
        }

        return true;
    }, [documentText, selection, settings]);

    const acceptSuggestion = useCallback((): boolean => {
        if (
            !suggestion
            || selection.from !== selection.to
            || selection.from !== suggestion.position
        ) {
            return false;
        }

        const [nextWord] = splitSuggestionIntoWords(suggestion.text);

        if (!nextWord) {
            setSuggestion(null);
            return false;
        }

        const remainingSuggestion = suggestion.text.slice(nextWord.length);
        editorRef.current?.replaceRange(selection.from, selection.to, nextWord, 'ai');
        setSuggestion(
            remainingSuggestion
                ? {
                        position: selection.from + nextWord.length,
                        text: remainingSuggestion,
                    }
                : null,
        );

        return true;
    }, [selection, suggestion]);

    const acceptFullSuggestion = useCallback((): boolean => {
        if (
            !suggestion
            || selection.from !== selection.to
            || selection.from !== suggestion.position
        ) {
            return false;
        }

        editorRef.current?.replaceRange(selection.from, selection.to, suggestion.text, 'ai');
        setSuggestion(null);
        return true;
    }, [selection, suggestion]);

    const deletePreviousWord = useCallback((): boolean => {
        const range = findPreviousWordRange(documentText, selection);

        if (!range) {
            return false;
        }

        editorRef.current?.replaceRange(range.from, range.to, '');
        return true;
    }, [documentText, selection]);

    const dismissSuggestion = useCallback((): boolean => {
        if (!suggestion) {
            return false;
        }

        setSuggestion(null);
        return true;
    }, [suggestion]);

    const saveUpdatedSettings = (updatedSettings: PredictiveTextSettings) => {
        requestControllerRef.current?.abort();
        saveSettings(updatedSettings);
        setSettings(updatedSettings);
        setSettingsOpen(false);
        setStatus({
            kind: 'idle',
            message: 'Settings saved. Predictions are ready.',
        });
        window.setTimeout(() => editorRef.current?.focus(), 0);
    };

    const clearAllData = () => {
        requestControllerRef.current?.abort();
        clearPredictiveTextData();
        setSettings(defaultSettings);
        setDocumentState({
            text: '',
            provenance: [],
        });
        setSelection({ from: 0, to: 0 });
        setSuggestion(null);
        editorRef.current?.setText('');
        setStatus({
            kind: 'info',
            message:
                'The saved key, settings, and provenance document were cleared from this browser.',
        });
    };

    const copyText = async () => {
        try {
            await navigator.clipboard.writeText(documentText);
            setStatus({
                kind: 'success',
                message: 'The editor text was copied to the clipboard.',
            });
        }
        catch {
            setStatus({
                kind: 'error',
                message: 'The browser did not allow clipboard access.',
            });
        }
    };

    const clearEditor = () => {
        requestControllerRef.current?.abort();
        setSuggestion(null);
        editorRef.current?.setText('');
        setStatus({
            kind: 'info',
            message: 'The editor was cleared. Use undo to restore the text during this session.',
        });
    };

    const statusClasses: Record<EditorStatus['kind'], string> = {
        idle: 'bg-gray-50 text-gray-700',
        loading: 'bg-blue-50 text-blue-800',
        success: 'bg-green-50 text-green-800',
        info: 'bg-blue-50 text-blue-800',
        error: 'bg-red-50 text-red-800',
    };

    return (
        <ToolPage title="Predictive Text Editor">
            <ToolDescription>
                Write or paste plain text and get a contextual continuation from your chosen
                OpenRouter model. Accept the complete suggestion with Tab or take it one word at a
                time while keeping your provenance document and API key on this device.
            </ToolDescription>

            <div className="flex w-full flex-col gap-4">
                <section className="card flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={acceptSuggestion}
                            disabled={!suggestion}
                            title="Accept the next suggested word with Ctrl+Right, or the complete suggestion with Tab."
                        >
                            <FiArrowRight className="h-4 w-4" />
                            Accept word
                        </button>
                        <button
                            type="button"
                            className="btn-secondary inline-flex items-center gap-2"
                            onClick={deletePreviousWord}
                            title="Delete the previous word with Ctrl+Left."
                        >
                            <FiArrowLeft className="h-4 w-4" />
                            Delete word
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="btn-secondary inline-flex items-center gap-2"
                            onClick={() => void copyText()}
                            disabled={!documentText}
                        >
                            <FiCopy className="h-4 w-4" />
                            Copy
                        </button>
                        <button
                            type="button"
                            className="btn-secondary inline-flex items-center gap-2"
                            onClick={clearEditor}
                            disabled={!documentText}
                        >
                            <FiTrash2 className="h-4 w-4" />
                            Clear
                        </button>
                        <button
                            type="button"
                            className="btn-secondary inline-flex items-center gap-2"
                            onClick={() => setSettingsOpen(true)}
                        >
                            <FiSettings className="h-4 w-4" />
                            Settings
                        </button>
                    </div>
                </section>

                <section className="min-h-[28rem] flex-1" aria-label="Predictive text editor.">
                    <PredictiveEditor
                        ref={editorRef}
                        initialValue={documentText}
                        initialProvenance={provenance}
                        debugView={settings.debugView}
                        suggestion={suggestion}
                        onStateChange={handleEditorStateChange}
                        onAcceptSuggestion={acceptSuggestion}
                        onAcceptFullSuggestion={acceptFullSuggestion}
                        onDeletePreviousWord={deletePreviousWord}
                        onDismissSuggestion={dismissSuggestion}
                        onRequestPrediction={() => {
                            void runPrediction();
                            return true;
                        }}
                    />
                </section>

                {settings.debugView && (
                    <section
                        className="rounded-lg border border-gray-300 bg-gray-50 p-4"
                        aria-label="Debug view."
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Debug view</h2>
                                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
                                    <span className="inline-flex items-center gap-2">
                                        <span className="h-4 w-4 rounded-sm border-b-2 border-blue-500 bg-blue-50" />
                                        Human-written text.
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <span className="h-4 w-4 rounded-sm border-b-2 border-yellow-500 bg-yellow-100" />
                                        Accepted AI-generated text.
                                    </span>
                                </div>
                            </div>
                            {lastPromptBody && (
                                <button
                                    type="button"
                                    className="btn-secondary inline-flex items-center gap-2"
                                    onClick={() => {
                                        void navigator.clipboard.writeText(lastPromptBody);
                                    }}
                                >
                                    <FiCopy className="h-4 w-4" />
                                    Copy prompt
                                </button>
                            )}
                        </div>

                        <div className="mt-4">
                            <h3 className="font-medium text-gray-900">
                                Latest OpenRouter request body
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">
                                This is the exact JSON body used for the latest prediction.
                                Authentication headers and the API key are not included.
                            </p>
                            {lastPromptBody
                                ? (
                                        <pre className="mt-3 max-h-96 overflow-auto border border-gray-200 bg-white p-4 text-xs text-gray-800">
                                            <code>{lastPromptBody}</code>
                                        </pre>
                                    )
                                : (
                                        <p className="mt-3 rounded-md bg-white p-4 text-sm text-gray-600">
                                            Press Ctrl+Space to make a prediction and inspect its prompt.
                                        </p>
                                    )}
                        </div>
                    </section>
                )}

                <div
                    className={`flex min-h-12 items-center gap-3 rounded-lg p-3 text-sm ${statusClasses[status.kind]}`}
                    role="status"
                    aria-live="polite"
                >
                    {status.kind === 'loading' && (
                        <FiLoader className="h-4 w-4 shrink-0 animate-spin" />
                    )}
                    <p>{status.message}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2">
                    <p>
                        <strong className="text-gray-800">On demand.</strong>
                        {' '}
                        Press Ctrl+Space to
                        generate text at the current caret using context on both sides.
                    </p>
                    <p>
                        <strong className="text-gray-800">Private by default.</strong>
                        {' '}
                        Requests
                        exclude providers marked as collecting prompt data.
                    </p>
                </div>
            </div>

            {settingsOpen && (
                <PredictiveTextSettingsDialog
                    settings={settings}
                    onClose={() => {
                        setSettingsOpen(false);
                        window.setTimeout(() => editorRef.current?.focus(), 0);
                    }}
                    onSave={saveUpdatedSettings}
                    onClearAll={clearAllData}
                />
            )}
        </ToolPage>
    );
}
