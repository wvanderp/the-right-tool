import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import generateCalendarLinks from '../GoogleLinkCreator';
import type Event from '../types/Event';

describe('GoogleLinkCreator', () => {
    beforeEach(() => {
        // Mock the Intl.DateTimeFormat to return a consistent timezone
        vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
            resolvedOptions: () => ({ timeZone: 'Europe/Amsterdam' })
        } as Intl.DateTimeFormat));
    });

    afterEach(() => {
        // Restore all mocks
        vi.restoreAllMocks();
    });
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

        const expectedLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Test+Event&dates=20231225T100000Z/20231225T110000Z&ctz=Europe/Amsterdam';

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

        const expectedLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Meeting&dates=20231226T143000Z/20231226T153000Z&details=Team+sync&location=Conference+Room+A&ctz=Europe/Amsterdam';

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

    test('should handle event with timezone', () => {
        const event: Event = {
            summary: 'New York Meeting',
            startTime: '2023-12-30T09:00:00.000Z',
            endTime: '2023-12-30T10:00:00.000Z',
            timezone: 'America/New_York'
        };

        const result = generateCalendarLinks([event])[0];

        expect(result).toContain('text=New+York+Meeting');
        expect(result).toContain('dates=20231230T090000Z/20231230T100000Z');
        expect(result).toContain('ctz=America/New_York');
    });

    test('should handle local time without Z suffix (bug reproduction)', () => {
        // This test reproduces the bug where local times (without Z) are incorrectly converted to UTC
        const event: Event = {
            summary: 'Local Time Event',
            startTime: '2025-07-14T12:40:00', // No Z suffix - should be treated as local time
            endTime: '2025-07-14T13:00:00',   // No Z suffix - should be treated as local time
        };

        const result = generateCalendarLinks([event])[0];

        // The dates parameter should NOT have Z suffix when original time doesn't have Z
        expect(result).toContain('dates=20250714T124000/20250714T130000');
        expect(result).not.toContain('dates=20250714T124000Z/20250714T130000Z');
    });

    test('should handle different timezone formats', () => {
        const events: Event[] = [
            {
                summary: 'London Meeting',
                startTime: '2023-12-31T14:00:00.000Z',
                endTime: '2023-12-31T15:00:00.000Z',
                timezone: 'Europe/London'
            },
            {
                summary: 'Tokyo Meeting',
                startTime: '2024-01-01T01:00:00.000Z',
                endTime: '2024-01-01T02:00:00.000Z',
                timezone: 'Asia/Tokyo'
            },
            {
                summary: 'Sydney Meeting',
                startTime: '2024-01-02T03:00:00.000Z',
                endTime: '2024-01-02T04:00:00.000Z',
                timezone: 'Australia/Sydney'
            }
        ];

        const links = generateCalendarLinks(events);

        expect(links[0]).toContain('ctz=Europe/London');
        expect(links[1]).toContain('ctz=Asia/Tokyo');
        expect(links[2]).toContain('ctz=Australia/Sydney');
    });

    test('should handle event with timezone and all other properties', () => {
        const event: Event = {
            summary: 'International Conference',
            startTime: '2024-01-15T13:30:00.000Z',
            endTime: '2024-01-15T17:00:00.000Z',
            description: 'Annual tech conference & networking',
            location: 'Convention Center, Room #203',
            timezone: 'America/Los_Angeles'
        };

        const result = generateCalendarLinks([event])[0];

        expect(result).toContain('text=International+Conference');
        expect(result).toContain('dates=20240115T133000Z/20240115T170000Z');
        expect(result).toContain('details=Annual+tech+conference+%26+networking');
        expect(result).toContain('location=Convention+Center%2C+Room+%23203');
        expect(result).toContain('ctz=America/Los_Angeles');
    });

    test('should include browser timezone when event timezone is not provided', () => {
        const event: Event = {
            summary: 'No Timezone Event',
            startTime: '2024-01-20T10:00:00.000Z',
            endTime: '2024-01-20T11:00:00.000Z'
        };

        const result = generateCalendarLinks([event])[0];

        expect(result).toContain('text=No+Timezone+Event');
        expect(result).toContain('ctz=Europe/Amsterdam'); // Mocked timezone
    });

    test('should handle timezone with special characters in timezone names', () => {
        const events: Event[] = [
            {
                summary: 'UTC Event',
                startTime: '2024-02-01T12:00:00.000Z',
                endTime: '2024-02-01T13:00:00.000Z',
                timezone: 'UTC'
            },
            {
                summary: 'GMT Event',
                startTime: '2024-02-01T12:00:00.000Z',
                endTime: '2024-02-01T13:00:00.000Z',
                timezone: 'GMT'
            },
            {
                summary: 'Complex Timezone',
                startTime: '2024-02-01T12:00:00.000Z',
                endTime: '2024-02-01T13:00:00.000Z',
                timezone: 'America/Argentina/Buenos_Aires'
            }
        ];

        const links = generateCalendarLinks(events);

        expect(links[0]).toContain('ctz=UTC');
        expect(links[1]).toContain('ctz=GMT');
        expect(links[2]).toContain('ctz=America/Argentina/Buenos_Aires');
    });
});