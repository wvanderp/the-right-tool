import React, { useMemo, useState } from 'react';
import { FiCheck, FiEye, FiEyeOff, FiExternalLink, FiTrash2, FiX } from 'react-icons/fi';
import { OpenRouterError, validateOpenRouterKey } from './openRouterClient';
import {
    clampWordCount,
    defaultSettings,
    PredictiveTextSettings,
    recommendedModels,
} from './predictiveTextLogic';

interface PredictiveTextSettingsDialogProps {
    settings: PredictiveTextSettings;
    onClose: () => void;
    onSave: (settings: PredictiveTextSettings) => void;
    onClearAll: () => void;
}

type TestState
    = | { kind: 'idle'; message: string }
        | { kind: 'loading'; message: string }
        | { kind: 'success'; message: string }
        | { kind: 'error'; message: string };

export default function PredictiveTextSettingsDialog({
    settings,
    onClose,
    onSave,
    onClearAll,
}: PredictiveTextSettingsDialogProps): React.ReactElement {
    const [draftSettings, setDraftSettings] = useState(settings);
    const [showKey, setShowKey] = useState(false);
    const [testState, setTestState] = useState<TestState>({
        kind: 'idle',
        message: '',
    });
    const recommendedModelIds = useMemo(
        () => new Set<string>(recommendedModels.map(model => model.id)),
        [],
    );
    const usesCustomModel = !recommendedModelIds.has(draftSettings.modelId);
    const canSave = Boolean(draftSettings.apiKey.trim() && draftSettings.modelId.trim());

    const testConnection = async () => {
        const apiKey = draftSettings.apiKey.trim();

        if (!apiKey) {
            setTestState({
                kind: 'error',
                message: 'Enter an OpenRouter API key before testing the connection.',
            });
            return;
        }

        setTestState({
            kind: 'loading',
            message: 'Testing the OpenRouter connection.',
        });

        try {
            const keyInformation = await validateOpenRouterKey(apiKey);
            const remaining
                = keyInformation.limitRemaining === undefined
                    ? ''
                    : ` The key has $${keyInformation.limitRemaining.toFixed(2)} remaining.`;

            setTestState({
                kind: 'success',
                message: `${keyInformation.label}.${remaining}`,
            });
        }
        catch (error) {
            setTestState({
                kind: 'error',
                message:
                    error instanceof OpenRouterError
                        ? error.message
                        : 'The OpenRouter connection could not be tested.',
            });
        }
    };

    const clearAllData = () => {
        const shouldClear = window.confirm(
            'Clear the saved API key, settings, and provenance document from this browser?',
        );

        if (!shouldClear) {
            return;
        }

        setDraftSettings(defaultSettings);
        setTestState({
            kind: 'idle',
            message: '',
        });
        onClearAll();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="predictive-settings-title"
                className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-300 bg-white p-6"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2
                            id="predictive-settings-title"
                            className="text-2xl font-bold text-gray-900"
                        >
                            Predictive Text Editor settings
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Configure the OpenRouter connection and prediction length.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn-secondary p-2"
                        onClick={onClose}
                        aria-label="Close settings."
                    >
                        <FiX className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-6 space-y-6">
                    <section className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <label
                                htmlFor="openrouter-api-key"
                                className="font-medium text-gray-900"
                            >
                                OpenRouter API key
                            </label>
                            <a
                                href="https://openrouter.ai/settings/keys"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-yellow-700 hover:underline"
                            >
                                Create a key
                                <FiExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    id="openrouter-api-key"
                                    type={showKey ? 'text' : 'password'}
                                    value={draftSettings.apiKey}
                                    onChange={(event) => {
                                        setDraftSettings(current => ({
                                            ...current,
                                            apiKey: event.target.value,
                                        }));
                                        setTestState({ kind: 'idle', message: '' });
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-11 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                    autoComplete="off"
                                    placeholder="sk-or-v1-…"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500 hover:text-gray-900"
                                    onClick={() => setShowKey(current => !current)}
                                    aria-label={showKey ? 'Hide API key.' : 'Show API key.'}
                                >
                                    {showKey
                                        ? (
                                                <FiEyeOff className="h-4 w-4" />
                                            )
                                        : (
                                                <FiEye className="h-4 w-4" />
                                            )}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn-secondary whitespace-nowrap"
                                onClick={() => void testConnection()}
                                disabled={testState.kind === 'loading'}
                            >
                                Test connection
                            </button>
                        </div>
                        <p className="text-sm text-orange-700">
                            The key is stored unencrypted in this browser. Use this option only on a
                            trusted device.
                        </p>
                        {testState.message && (
                            <p
                                className={`rounded-md p-3 text-sm ${
                                    testState.kind === 'success'
                                        ? 'bg-green-50 text-green-800'
                                        : testState.kind === 'error'
                                            ? 'bg-red-50 text-red-800'
                                            : 'bg-blue-50 text-blue-800'
                                }`}
                                role="status"
                            >
                                {testState.message}
                            </p>
                        )}
                    </section>

                    <fieldset className="space-y-3">
                        <legend className="font-medium text-gray-900">Prediction model</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {recommendedModels.map(model => (
                                <label
                                    key={model.id}
                                    className={`cursor-pointer rounded-lg border p-3 transition-colors duration-200 ${
                                        draftSettings.modelId === model.id
                                            ? 'border-yellow-600 bg-yellow-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="flex items-start gap-3">
                                        <input
                                            type="radio"
                                            name="prediction-model"
                                            value={model.id}
                                            checked={draftSettings.modelId === model.id}
                                            onChange={() =>
                                                setDraftSettings(current => ({
                                                    ...current,
                                                    modelId: model.id,
                                                }))}
                                            className="mt-1 accent-yellow-600"
                                        />
                                        <span>
                                            <span className="block text-sm font-medium text-gray-900">
                                                {model.name}
                                            </span>
                                            <span className="mt-1 block text-xs text-gray-600">
                                                {model.description}
                                            </span>
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>

                        <label
                            className={`block rounded-lg border p-3 ${
                                usesCustomModel
                                    ? 'border-yellow-600 bg-yellow-50'
                                    : 'border-gray-200'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <input
                                    type="radio"
                                    name="prediction-model"
                                    checked={usesCustomModel}
                                    onChange={() =>
                                        setDraftSettings(current => ({
                                            ...current,
                                            modelId: '',
                                        }))}
                                    className="accent-yellow-600"
                                />
                                <span className="text-sm font-medium text-gray-900">
                                    Custom model ID
                                </span>
                            </span>
                            <input
                                type="text"
                                value={usesCustomModel ? draftSettings.modelId : ''}
                                onFocus={() => {
                                    if (!usesCustomModel) {
                                        setDraftSettings(current => ({
                                            ...current,
                                            modelId: '',
                                        }));
                                    }
                                }}
                                onChange={event =>
                                    setDraftSettings(current => ({
                                        ...current,
                                        modelId: event.target.value,
                                    }))}
                                className="mt-3 w-full"
                                placeholder="provider/model-id"
                                aria-label="Custom OpenRouter model ID."
                            />
                        </label>
                    </fieldset>

                    <label className="block">
                        <span className="block font-medium text-gray-900">
                            Prediction length:
                            {' '}
                            {clampWordCount(draftSettings.wordCount)}
                            {' '}
                            words
                        </span>
                        <input
                            type="range"
                            min="1"
                            max="50"
                            step="1"
                            value={clampWordCount(draftSettings.wordCount)}
                            onChange={event =>
                                setDraftSettings(current => ({
                                    ...current,
                                    wordCount: Number(event.target.value),
                                }))}
                            className="mt-3 w-full accent-yellow-600"
                        />
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                        <input
                            type="checkbox"
                            checked={draftSettings.debugView}
                            onChange={event =>
                                setDraftSettings(current => ({
                                    ...current,
                                    debugView: event.target.checked,
                                }))}
                            className="mt-1 h-4 w-4 accent-yellow-600"
                        />
                        <span>
                            <span className="block font-medium text-gray-900">
                                Enable Debug view
                            </span>
                            <span className="mt-1 block text-sm text-gray-600">
                                Highlight human and AI-generated text and show the complete prompt
                                body sent to OpenRouter.
                            </span>
                        </span>
                    </label>

                    <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                        Each prediction sends up to 8,000 characters before and 4,000 characters
                        after the caret to OpenRouter and the selected provider. Requests exclude
                        providers marked as collecting prompt data.
                    </div>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        onClick={clearAllData}
                    >
                        <FiTrash2 className="h-4 w-4" />
                        Clear all saved data
                    </button>
                    <div className="flex gap-3">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!canSave}
                            onClick={() =>
                                onSave({
                                    apiKey: draftSettings.apiKey.trim(),
                                    modelId: draftSettings.modelId.trim(),
                                    wordCount: clampWordCount(draftSettings.wordCount),
                                    debugView: draftSettings.debugView,
                                })}
                        >
                            <FiCheck className="h-4 w-4" />
                            Save settings
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
