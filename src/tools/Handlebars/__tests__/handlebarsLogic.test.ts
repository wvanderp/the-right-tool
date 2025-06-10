import { describe, it, expect } from 'vitest';
import Handlebars from 'handlebars';

describe('Handlebars Template Logic', () => {
    it('should compile and render a simple template', () => {
        const template = 'Hello {{name}}!';
        const data = { name: 'World' };

        const templateFunction = Handlebars.compile(template);
        const result = templateFunction(data);

        expect(result).toBe('Hello World!');
    });

    it('should handle empty template', () => {
        const template = '';
        const data = { name: 'World' };

        const templateFunction = Handlebars.compile(template);
        const result = templateFunction(data);

        expect(result).toBe('');
    });

    it('should handle missing data properties gracefully', () => {
        const template = 'Hello {{name}}!';
        const data = {};

        const templateFunction = Handlebars.compile(template);
        const result = templateFunction(data);

        expect(result).toBe('Hello !');
    });

    it('should handle complex nested data', () => {
        const template = 'Hello {{user.name}}, you have {{messages.length}} messages.';
        const data = {
            user: { name: 'John' },
            messages: ['msg1', 'msg2', 'msg3']
        };

        const templateFunction = Handlebars.compile(template);
        const result = templateFunction(data);

        expect(result).toBe('Hello John, you have 3 messages.');
    });

    it('should handle invalid JSON gracefully', () => {
        const invalidJson = '{ invalid json }';

        expect(() => {
            JSON.parse(invalidJson);
        }).toThrow();
    });
});
