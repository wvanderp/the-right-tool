import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    requestPrediction,
    validateOpenRouterKey
} from '../openRouterClient';

const context = {
    before: 'The quick brown',
    after: 'over the dog.',
    beforeTruncated: false,
    afterTruncated: false
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('openRouterClient', () => {
    it('sends a privacy-filtered prediction request and parses usage', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            model: 'resolved/model',
            choices: [{ message: { content: ' fox jumps ' } }],
            usage: { prompt_tokens: 42, completion_tokens: 3 }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await requestPrediction({
            apiKey: 'test-key',
            modelId: 'example/model',
            wordCount: 10,
            context
        });

        expect(result).toEqual({
            text: ' fox jumps ',
            model: 'resolved/model',
            promptTokens: 42,
            completionTokens: 3
        });

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(String(init.body));

        expect(url).toContain('/chat/completions');
        expect(init.headers).toMatchObject({
            Authorization: 'Bearer test-key',
            'HTTP-Referer': 'https://therighttool.dev'
        });
        expect(body.model).toBe('example/model');
        expect(body.provider).toEqual({ data_collection: 'deny' });
        expect(body.messages[1].content).toContain('The quick brown');
        expect(body.messages[1].content).toContain('over the dog.');
    });

    it('reports status and retry information from API errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            error: { message: 'Slow down.' }
        }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '12'
            }
        })));

        await expect(requestPrediction({
            apiKey: 'test-key',
            modelId: 'example/model',
            wordCount: 10,
            context
        })).rejects.toMatchObject({
            message: 'Slow down.',
            status: 429,
            retryAfterSeconds: 12
        });
    });

    it('validates an API key', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            data: {
                label: 'sk-or-v1-abc...xyz',
                limit_remaining: 4.25
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })));

        await expect(validateOpenRouterKey('test-key')).resolves.toEqual({
            label: 'sk-or-v1-abc...xyz',
            limitRemaining: 4.25
        });
    });
});
