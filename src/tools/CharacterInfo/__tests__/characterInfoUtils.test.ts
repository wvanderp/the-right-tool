import { describe, it, expect } from 'vitest';
import { getCharacterInfoArray } from '../characterInfoUtils';

describe('getCharacterInfoArray', () => {
    it('should handle basic Latin characters', () => {
        const result = getCharacterInfoArray('ABC');
        expect(result).toHaveLength(3);
        
        expect(result[0]).toEqual({
            char: 'A',
            displayChar: 'A',
            code: 65,
            name: 'A',
            category: 'Basic Latin',
            block: 'Basic Latin',
            script: 'Latin'
        });
    });

    it('should handle special characters', () => {
        const result = getCharacterInfoArray('©®');
        expect(result).toHaveLength(2);
        
        expect(result[0]).toEqual({
            char: '©',
            displayChar: '©',
            code: 169,
            name: '©',
            category: 'Latin-1 Supplement',
            block: 'Latin-1',
            script: 'Latin'
        });
    });

    it('should handle control characters', () => {
        const result = getCharacterInfoArray('\n\t');
        expect(result).toHaveLength(2);
        
        expect(result[0]).toEqual({
            char: '\n',
            displayChar: '␊',
            code: 10,
            name: '\n',
            category: 'Control',
            block: 'Basic Latin',
            script: 'Latin'
        });

        expect(result[1]).toEqual({
            char: '\t',
            displayChar: '␉',
            code: 9,
            name: '\t',
            category: 'Control',
            block: 'Basic Latin',
            script: 'Latin'
        });
    });

    it('should handle whitespace characters', () => {
        const result = getCharacterInfoArray(' \u00A0'); // regular space and no-break space
        expect(result).toHaveLength(2);

        expect(result[0]).toEqual({
            char: ' ',
            displayChar: '␠',
            code: 32,
            name: ' ',
            category: 'Basic Latin',
            block: 'Basic Latin',
            script: 'Latin'
        });

        expect(result[1]).toEqual({
            char: '\u00A0',
            displayChar: '␠',
            code: 160,
            name: '\u00A0',
            category: 'Latin-1 Supplement',
            block: 'Latin-1',
            script: 'Latin'
        });
    });

    it('should handle non-Latin scripts', () => {
        // Test Hebrew
        const hebrewResult = getCharacterInfoArray('א');
        expect(hebrewResult[0].script).toBe('Hebrew');
        expect(hebrewResult[0].displayChar).toBe('א');

        // Test Arabic
        const arabicResult = getCharacterInfoArray('ا');
        expect(arabicResult[0].script).toBe('Arabic');
        expect(arabicResult[0].displayChar).toBe('ا');

        // Test Cyrillic
        const cyrillicResult = getCharacterInfoArray('Я');
        expect(cyrillicResult[0].script).toBe('Cyrillic');
        expect(cyrillicResult[0].displayChar).toBe('Я');

        // Test Japanese scripts
        const japaneseResult = getCharacterInfoArray('あア漢');
        expect(japaneseResult[0].script).toBe('Hiragana');
        expect(japaneseResult[0].displayChar).toBe('あ');
        expect(japaneseResult[1].script).toBe('Katakana');
        expect(japaneseResult[1].displayChar).toBe('ア');
        expect(japaneseResult[2].script).toBe('Han');
        expect(japaneseResult[2].displayChar).toBe('漢');
    });

    it('should handle empty string', () => {
        const result = getCharacterInfoArray('');
        expect(result).toHaveLength(0);
        expect(result).toEqual([]);
    });

    it('should handle multi-character string with mixed scripts and spaces', () => {
        const result = getCharacterInfoArray('Hello 世界');
        expect(result).toHaveLength(8);
        
        // Test Latin characters
        expect(result.slice(0, 5).every(info => info.script === 'Latin')).toBe(true);
        
        // Test space
        expect(result[5].displayChar).toBe('␠');
        
        // Test Han characters
        expect(result.slice(6).every(info => info.script === 'Han')).toBe(true);
    });

    it('should handle complex emoji sequences with modifiers', () => {
        const result = getCharacterInfoArray('👨🏿‍🚒');  // firefighter with dark skin tone
        expect(result).toHaveLength(4);
        
        expect(result).toEqual([
            {
                char: '👨',
                displayChar: '👨',
                code: 0x1F468,
                name: 'MAN',
                category: 'Other',
                block: 'Other',
                script: 'Unknown'
            },
            {
                char: '🏿',
                displayChar: '🏿',
                code: 0x1F3FF,
                name: 'EMOJI MODIFIER FITZPATRICK TYPE-6',
                category: 'Other',
                block: 'Other',
                script: 'Unknown'
            },
            {
                char: '‍',
                displayChar: '⁞',  // Use special symbol for ZWJ
                code: 0x200D,
                name: 'ZERO WIDTH JOINER',
                category: 'Other',
                block: 'Other',
                script: 'Unknown'
            },
            {
                char: '🚒',
                displayChar: '🚒',
                code: 0x1F692,
                name: 'FIRE ENGINE',
                category: 'Other',
                block: 'Other',
                script: 'Unknown'
            }
        ]);
    });
});