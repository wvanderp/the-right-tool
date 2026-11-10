import { describe, expect, it, vi } from 'vitest';
import { createPredictiveEditorKeymap } from '../PredictiveEditor';

describe('createPredictiveEditorKeymap', () => {
    it('accepts the complete suggestion when Tab is pressed', () => {
        const onAcceptFullSuggestion = vi.fn(() => true);
        const bindings = createPredictiveEditorKeymap({
            onAcceptSuggestion: () => false,
            onAcceptFullSuggestion,
            onDeletePreviousWord: () => false,
            onDismissSuggestion: () => false,
            onRequestPrediction: () => false,
        });
        const tabBinding = bindings.find(binding => binding.key === 'Tab');

        expect(tabBinding).toBeDefined();
        expect(tabBinding?.run?.({} as never)).toBe(true);
        expect(onAcceptFullSuggestion).toHaveBeenCalledOnce();
    });
});
