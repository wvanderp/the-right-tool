import { describe, expect, test } from 'vitest';
import generateCalendarLinks from '../GoogleLinkCreator';
import type Event from '../types/Event';

describe('GoogleLinkCreator', () => {
    test('should return empty array for empty input', () => {
        expect(generateCalendarLinks([])).toEqual([]);
    });

    test('should return empty array for null/undefined input', () => {
        // @ts-expect-error testing null input
        expect(generateCalendarLinks(null)).toEqual([]);
        // @ts-expect-error testing undefined input
        expect(generateCalendarLinks(undefined)).toEqual([]);
    });

    test('should generate correct link for basic event', () => {
        const event: Event = {
            summary: 'Test Event',
            startTime: '2023-12-25T10:00:00.000Z',
            endTime: '2023-12-25T11:00:00.000Z',
        };

        const expectedLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Test+Event&dates=20231225T100000Z/20231225T110000Z';
        
        expect(generateCalendarLinks([event])[0]).toBe(expectedLink);
    });

    test('should handle events with description and location', () => {
        const event: Event = {
            summary: 'Meeting',
            startTime: '2023-12-26T14:30:00.000Z',
            endTime: '2023-12-26T15:30:00.000Z',
            description: 'Team sync',
            location: 'Conference Room A'
        };

        const expectedLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting&dates=20231226T143000Z/20231226T153000Z&details=Team+sync&location=Conference+Room+A';
        
        expect(generateCalendarLinks([event])[0]).toBe(expectedLink);
    });

    test('should handle special characters in event details', () => {
        const event: Event = {
            summary: 'Test & Demo',
            startTime: '2023-12-27T09:00:00.000Z',
            endTime: '2023-12-27T10:00:00.000Z',
            description: 'Testing & debugging session',
            location: '123 Main St., Suite #100'
        };

        const result = generateCalendarLinks([event])[0];
        
        expect(result).toContain('text=Test+%26+Demo');
        expect(result).toContain('details=Testing+%26+debugging+session');
        expect(result).toContain('location=123+Main+St.%2C+Suite+%23100');
    });

    test('should generate multiple links for multiple events', () => {
        const events: Event[] = [
            {
                summary: 'Event 1',
                startTime: '2023-12-28T10:00:00.000Z',
                endTime: '2023-12-28T11:00:00.000Z',
            },
            {
                summary: 'Event 2',
                startTime: '2023-12-29T14:00:00.000Z',
                endTime: '2023-12-29T15:00:00.000Z',
            }
        ];

        const links = generateCalendarLinks(events);
        
        expect(links).toHaveLength(2);
        expect(links[0]).toContain('text=Event+1');
        expect(links[1]).toContain('text=Event+2');
    });
});