import {
    Annotation,
    EditorState,
    Prec,
    StateEffect,
    StateField
} from '@codemirror/state';
import {
    Decoration,
    DecorationSet,
    EditorView,
    KeyBinding,
    keymap,
    placeholder,
    ViewUpdate,
    WidgetType
} from '@codemirror/view';
import {
    defaultKeymap,
    history,
    historyKeymap,
    invertedEffects
} from '@codemirror/commands';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef
} from 'react';
import {
    normalizeProvenanceRanges,
    PredictionSuggestion,
    ProvenanceRange,
    SuggestionTextChange,
    TextOrigin,
    updateProvenanceRanges
} from './predictiveTextLogic';

export interface EditorSnapshot {
    text: string;
    provenance: ProvenanceRange[];
    selection: {
        from: number;
        to: number;
    };
    changes: SuggestionTextChange[];
}

export type GhostSuggestion = PredictionSuggestion;

export interface PredictiveEditorHandle {
    focus: () => void;
    replaceRange: (from: number, to: number, insert: string, origin?: TextOrigin) => void;
    setText: (text: string) => void;
}

interface PredictiveEditorProps {
    initialValue: string;
    initialProvenance: ProvenanceRange[];
    debugView: boolean;
    suggestion: GhostSuggestion | null;
    onStateChange: (snapshot: EditorSnapshot) => void;
    onAcceptSuggestion: () => boolean;
    onAcceptFullSuggestion: () => boolean;
    onDeletePreviousWord: () => boolean;
    onDismissSuggestion: () => boolean;
    onRequestPrediction: () => boolean;
}

type PredictiveEditorKeymapCallbacks = Pick<
    PredictiveEditorProps,
    | 'onAcceptSuggestion'
    | 'onAcceptFullSuggestion'
    | 'onDeletePreviousWord'
    | 'onDismissSuggestion'
    | 'onRequestPrediction'
>;

export function createPredictiveEditorKeymap(
    callbacks: PredictiveEditorKeymapCallbacks
): KeyBinding[] {
    return [
        {
            key: 'Tab',
            run: () => callbacks.onAcceptFullSuggestion()
        },
        {
            key: 'Ctrl-ArrowRight',
            run: () => callbacks.onAcceptSuggestion()
        },
        {
            key: 'Ctrl-ArrowLeft',
            run: () => callbacks.onDeletePreviousWord()
        },
        {
            key: 'Escape',
            run: () => callbacks.onDismissSuggestion()
        },
        {
            key: 'Ctrl-Space',
            run: () => callbacks.onRequestPrediction()
        }
    ];
}

class GhostTextWidget extends WidgetType {
    constructor(private readonly suggestion: string) {
        super();
    }

    eq(other: GhostTextWidget): boolean {
        return this.suggestion === other.suggestion;
    }

    toDOM(): HTMLElement {
        const element = document.createElement('span');
        element.className = 'cm-predictive-ghost';
        element.textContent = this.suggestion;
        element.setAttribute('aria-label', `Suggested text: ${this.suggestion}`);
        element.setAttribute('role', 'note');
        return element;
    }

    ignoreEvent(): boolean {
        return true;
    }
}

const setGhostSuggestion = StateEffect.define<GhostSuggestion | null>();
const setProvenance = StateEffect.define<ProvenanceRange[]>();
const setDebugView = StateEffect.define<boolean>();
const textOrigin = Annotation.define<TextOrigin>();

const provenanceField = StateField.define<ProvenanceRange[]>({
    create: (state) => normalizeProvenanceRanges([], state.doc.length),
    update: (ranges, transaction) => {
        for (const effect of transaction.effects) {
            if (effect.is(setProvenance)) {
                return normalizeProvenanceRanges(effect.value, transaction.state.doc.length);
            }
        }

        if (!transaction.docChanged) {
            return ranges;
        }

        const changes: Array<{
            fromA: number;
            toA: number;
            fromB: number;
            toB: number;
        }> = [];

        transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
            changes.push({ fromA, toA, fromB, toB });
        });

        return updateProvenanceRanges(
            ranges,
            transaction.startState.doc.length,
            transaction.state.doc.length,
            changes,
            transaction.annotation(textOrigin) ?? 'human'
        );
    }
});

const debugViewField = StateField.define<boolean>({
    create: () => false,
    update: (enabled, transaction) => {
        for (const effect of transaction.effects) {
            if (effect.is(setDebugView)) {
                return effect.value;
            }
        }

        return enabled;
    }
});

const debugProvenanceDecorations = EditorView.decorations.compute(
    [provenanceField, debugViewField],
    (state) => {
        if (!state.field(debugViewField)) {
            return Decoration.none;
        }

        return Decoration.set(state.field(provenanceField).map((range) => Decoration.mark({
            class: range.origin === 'ai' ? 'cm-debug-ai' : 'cm-debug-human',
            attributes: {
                'data-text-origin': range.origin
            }
        }).range(range.from, range.to)));
    }
);

const provenanceHistory = invertedEffects.of((transaction) => {
    if (!transaction.docChanged) {
        return [];
    }

    return [
        setProvenance.of(transaction.startState.field(provenanceField))
    ];
});

const ghostSuggestionField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decorations, transaction) => {
        let nextDecorations = decorations.map(transaction.changes);

        for (const effect of transaction.effects) {
            if (effect.is(setGhostSuggestion)) {
                const suggestion = effect.value;

                if (!suggestion?.text) {
                    nextDecorations = Decoration.none;
                    continue;
                }

                const position = Math.min(transaction.state.doc.length, Math.max(0, suggestion.position));
                nextDecorations = Decoration.set([
                    Decoration.widget({
                        widget: new GhostTextWidget(suggestion.text),
                        side: 1
                    }).range(position)
                ]);
            }
        }

        return nextDecorations;
    },
    provide: (field) => EditorView.decorations.from(field)
});

const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        minHeight: '28rem',
        backgroundColor: 'white',
        color: '#111827',
        fontSize: '16px'
    },
    '&.cm-focused': {
        outline: 'none'
    },
    '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: '1.7',
        overflow: 'auto'
    },
    '.cm-content': {
        minHeight: '28rem',
        padding: '16px',
        caretColor: '#111827'
    },
    '.cm-line': {
        padding: '0'
    },
    '.cm-cursor': {
        borderLeftColor: '#111827'
    },
    '.cm-selectionBackground, ::selection': {
        backgroundColor: '#fde68a !important'
    },
    '.cm-gutters': {
        display: 'none'
    },
    '.cm-placeholder': {
        color: '#9ca3af'
    },
    '.cm-predictive-ghost': {
        color: '#6b7280',
        backgroundColor: '#fffbeb',
        borderBottom: '1px solid #f59e0b',
        borderRadius: '2px',
        whiteSpace: 'pre-wrap'
    },
    '.cm-debug-human': {
        backgroundColor: '#eff6ff',
        borderBottom: '2px solid #3b82f6',
        borderRadius: '2px'
    },
    '.cm-debug-ai': {
        backgroundColor: '#fef3c7',
        borderBottom: '2px solid #f59e0b',
        borderRadius: '2px'
    }
});

const PredictiveEditor = forwardRef<PredictiveEditorHandle, PredictiveEditorProps>(
    function PredictiveEditor(
        {
            initialValue,
            initialProvenance,
            debugView,
            suggestion,
            onStateChange,
            onAcceptSuggestion,
            onAcceptFullSuggestion,
            onDeletePreviousWord,
            onDismissSuggestion,
            onRequestPrediction
        },
        forwardedRef
    ) {
        const containerRef = useRef<HTMLDivElement>(null);
        const viewRef = useRef<EditorView | null>(null);
        const initialValueRef = useRef(initialValue);
        const initialProvenanceRef = useRef(initialProvenance);
        const initialDebugViewRef = useRef(debugView);
        const callbacksRef = useRef({
            onStateChange,
            onAcceptSuggestion,
            onAcceptFullSuggestion,
            onDeletePreviousWord,
            onDismissSuggestion,
            onRequestPrediction
        });

        useEffect(() => {
            callbacksRef.current = {
                onStateChange,
                onAcceptSuggestion,
                onAcceptFullSuggestion,
                onDeletePreviousWord,
                onDismissSuggestion,
                onRequestPrediction
            };
        }, [
            onAcceptFullSuggestion,
            onAcceptSuggestion,
            onDeletePreviousWord,
            onDismissSuggestion,
            onRequestPrediction,
            onStateChange
        ]);

        useLayoutEffect(() => {
            if (!containerRef.current) {
                return;
            }

            const state = EditorState.create({
                doc: initialValueRef.current,
                selection: {
                    anchor: initialValueRef.current.length
                },
                extensions: [
                    history(),
                    ghostSuggestionField,
                    provenanceField,
                    debugViewField,
                    debugProvenanceDecorations,
                    provenanceHistory,
                    EditorView.lineWrapping,
                    placeholder('Paste or write plain text here.'),
                    EditorView.contentAttributes.of({
                        'aria-label': 'Text to autocomplete.',
                        autocapitalize: 'sentences',
                        spellcheck: 'true'
                    }),
                    Prec.high(keymap.of(createPredictiveEditorKeymap({
                        onAcceptSuggestion: () => callbacksRef.current.onAcceptSuggestion(),
                        onAcceptFullSuggestion: () => callbacksRef.current.onAcceptFullSuggestion(),
                        onDeletePreviousWord: () => callbacksRef.current.onDeletePreviousWord(),
                        onDismissSuggestion: () => callbacksRef.current.onDismissSuggestion(),
                        onRequestPrediction: () => callbacksRef.current.onRequestPrediction()
                    }))),
                    keymap.of([...defaultKeymap, ...historyKeymap]),
                    EditorView.updateListener.of((update: ViewUpdate) => {
                        if (!update.docChanged && !update.selectionSet) {
                            return;
                        }

                        const selection = update.state.selection.main;
                        const changes: SuggestionTextChange[] = [];

                        if (update.docChanged) {
                            update.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
                                changes.push({
                                    from: fromA,
                                    to: toA,
                                    insert: update.state.doc.sliceString(fromB, toB)
                                });
                            });
                        }

                        callbacksRef.current.onStateChange({
                            text: update.state.doc.toString(),
                            provenance: update.state.field(provenanceField),
                            selection: {
                                from: selection.from,
                                to: selection.to
                            },
                            changes
                        });
                    }),
                    editorTheme
                ]
            });

            const view = new EditorView({
                state,
                parent: containerRef.current
            });
            viewRef.current = view;
            view.dispatch({
                effects: [
                    setProvenance.of(initialProvenanceRef.current),
                    setDebugView.of(initialDebugViewRef.current)
                ]
            });

            return () => {
                view.destroy();
                viewRef.current = null;
            };
        }, []);

        useLayoutEffect(() => {
            const view = viewRef.current;

            if (!view) {
                return;
            }

            view.dispatch({
                effects: setGhostSuggestion.of(suggestion)
            });
        }, [suggestion]);

        useLayoutEffect(() => {
            viewRef.current?.dispatch({
                effects: setDebugView.of(debugView)
            });
        }, [debugView]);

        useImperativeHandle(forwardedRef, () => ({
            focus: () => {
                viewRef.current?.focus();
            },
            replaceRange: (from, to, insert, origin = 'human') => {
                const view = viewRef.current;

                if (!view) {
                    return;
                }

                view.dispatch({
                    changes: {
                        from,
                        to,
                        insert
                    },
                    selection: {
                        anchor: from + insert.length
                    },
                    annotations: textOrigin.of(origin),
                    scrollIntoView: true
                });
                view.focus();
            },
            setText: (text) => {
                const view = viewRef.current;

                if (!view) {
                    return;
                }

                view.dispatch({
                    changes: {
                        from: 0,
                        to: view.state.doc.length,
                        insert: text
                    },
                    selection: {
                        anchor: text.length
                    },
                    annotations: textOrigin.of('human'),
                    scrollIntoView: true
                });
                view.focus();
            }
        }), []);

        return (
            <div
                ref={containerRef}
                className="h-full min-h-[28rem] overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-yellow-500 focus-within:ring-1 focus-within:ring-yellow-500"
            />
        );
    }
);

export default PredictiveEditor;
