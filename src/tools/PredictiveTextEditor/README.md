# Predictive Text Editor

The Predictive Text Editor generates a short continuation at the current caret position through OpenRouter. The editor displays the pending continuation as inline ghost text without adding it to the document.

## Usage

1. Open Settings and enter an OpenRouter API key.
2. Choose a recommended model or enter a custom OpenRouter model ID.
3. Paste or write plain text in the editor.
4. Press Ctrl+Space to request a prediction at any collapsed caret position.
5. Press Tab to accept the complete suggestion, Ctrl+Right to accept one suggested word, or Ctrl+Left to delete the previous word.
6. Press Escape to dismiss the pending prediction.

The toolbar provides buttons for accepting suggestions and deleting words.

A pending prediction stays at its insertion point when the editor loses focus, the caret moves, text changes elsewhere in the document, or the browser reloads. Typing the predicted text at its insertion point consumes the matching characters and keeps the remaining prediction. Conflicting text at that point, a newer prediction, or the Escape key dismisses it.

## Settings And Storage

- The default model is `~openai/gpt-mini-latest`.
- Prediction length defaults to 10 words and supports values from 1 through 50.
- Debug view can highlight human-written and accepted AI-generated spans and show the exact JSON request body used for the latest prediction.
- The API key, selected model, prediction length, Debug view preference, provenance chunks, and pending prediction are stored in the browser's local storage.
- Clear all saved data from Settings to remove the key, preferences, and provenance document.

The API key is stored unencrypted. Use the persistent key option only on a trusted device.

## Privacy And Requests

Each prediction sends at most 8,000 characters before the caret and 4,000 characters after it to OpenRouter and the selected model provider. Requests set OpenRouter's provider data-collection policy to `deny`, which excludes providers marked as collecting prompt data.

The application does not proxy, collect, or store the API key or editor text on The Right Tool's servers.

## Debug View

Enable Debug view in Settings to inspect how the tool operates:

- Human-written and pasted text uses a blue highlight.
- Text accepted from an AI suggestion uses a yellow highlight.
- Later human edits are tracked separately, even when they occur inside an AI-generated span.
- The latest OpenRouter request body is displayed below the editor, including the model, system prompt, contextual user prompt, token limit, and provider privacy setting.

Authentication headers and the API key are never included in the displayed request body.

The saved editor state contains an ordered list of provenance chunks and the pending prediction. The editor reconstructs the complete text by joining the chunks, so there is no separate saved draft that can drift away from its provenance.

## Development

The tool separates its concerns into:

- `PredictiveTextEditor.tsx` for the page and request lifecycle.
- `PredictiveEditor.tsx` for the CodeMirror editor and inline suggestion decoration.
- `predictiveTextLogic.ts` for context windows, suggestion normalization, and word operations.
- `openRouterClient.ts` for OpenRouter requests and errors.
- `predictiveTextStorage.ts` for local browser persistence.

Run the tests with:

```bash
pnpm test -- src/tools/PredictiveTextEditor
```
