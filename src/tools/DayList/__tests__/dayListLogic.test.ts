import { describe, expect, it } from 'vitest';
import { generateDayList, DayListOptions } from '../dayListLogic';

describe('dayListLogic', () => {
    describe('generateDayList', () => {
        it('should generate a list of days within date range', () => {
            const options: DayListOptions = {
                startDate: '2023-01-01',
                endDate: '2023-01-03',
                filters: [],
                dayOfWeekFilter: [],
                dayOfMonthFilter: [],
                outputFormat: 'YYYY-MM-DD',
                separator: '\n',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            expect(result).toBe('2023-01-01\n2023-01-02\n2023-01-03');
        });

        it('should filter by day of week', () => {
            // Sunday is 0, Saturday is 6
            // Jan 1, 2023 is Sunday (0)
            // Jan 2, 2023 is Monday (1)
            // Jan 3, 2023 is Tuesday (2)
            // Jan 4, 2023 is Wednesday (3)
            // Jan 5, 2023 is Thursday (4)
            // Jan 6, 2023 is Friday (5)
            // Jan 7, 2023 is Saturday (6)
            const options: DayListOptions = {
                startDate: '2023-01-01',
                endDate: '2023-01-07',
                filters: ['dayOfWeek'],
                dayOfWeekFilter: [0, 6], // Sunday and Saturday
                dayOfMonthFilter: [],
                outputFormat: 'YYYY-MM-DD',
                separator: '\n',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            expect(result).toBe('2023-01-01\n2023-01-07');
        });

        it('should filter by day of month', () => {
            const options: DayListOptions = {
                startDate: '2023-01-01',
                endDate: '2023-01-31',
                filters: ['dayOfMonth'],
                dayOfWeekFilter: [],
                dayOfMonthFilter: [1, 15, 30],
                outputFormat: 'YYYY-MM-DD',
                separator: '\n',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            expect(result).toBe('2023-01-01\n2023-01-15\n2023-01-30');
        });

        it('should format dates in MM/DD/YYYY format', () => {
            const options: DayListOptions = {
                startDate: '2023-01-01',
                endDate: '2023-01-03',
                filters: [],
                dayOfWeekFilter: [],
                dayOfMonthFilter: [],
                outputFormat: 'MM/DD/YYYY',
                separator: '\n',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            expect(result).toBe('01/01/2023\n01/02/2023\n01/03/2023');
        });

        it('should use specified separator', () => {
            const options: DayListOptions = {
                startDate: '2023-01-01',
                endDate: '2023-01-03',
                filters: [],
                dayOfWeekFilter: [],
                dayOfMonthFilter: [],
                outputFormat: 'YYYY-MM-DD',
                separator: ', ',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            expect(result).toBe('2023-01-01, 2023-01-02, 2023-01-03');
        });

        it('should combine multiple filters', () => {
            // January 2023:
            // Sundays: 1, 8, 15, 22, 29
            // Day 15: Sunday, January 15, 2023
            const options: DayListOptions = {
                startDate: '2023-01-01',
                endDate: '2023-01-31',
                filters: ['dayOfWeek', 'dayOfMonth'],
                dayOfWeekFilter: [0], // Sunday
                dayOfMonthFilter: [15],
                outputFormat: 'YYYY-MM-DD',
                separator: '\n',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            expect(result).toBe('2023-01-15');
        });

        it('should format dates in locale-specific formats', () => {
            const options: DayListOptions = {
                startDate: '2023-01-01',
                endDate: '2023-01-01',
                filters: [],
                dayOfWeekFilter: [],
                dayOfMonthFilter: [],
                outputFormat: 'full',
                separator: '\n',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            // The exact format depends on the locale implementation, so we just check if it contains the expected elements
            expect(result).toContain('Sunday');
            expect(result).toContain('January');
            expect(result).toContain('2023');
        });

        it('should return error message for invalid date range', () => {
            const options: DayListOptions = {
                startDate: '2023-01-10',
                endDate: '2023-01-01', // End date is before start date
                filters: [],
                dayOfWeekFilter: [],
                dayOfMonthFilter: [],
                outputFormat: 'YYYY-MM-DD',
                separator: '\n',
                locale: 'en-US'
            };

            const result = generateDayList(options);
            expect(result).toBe('Invalid date range');
        });
    });
});