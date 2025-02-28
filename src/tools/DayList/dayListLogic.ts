export type FilterType = 'dayOfWeek' | 'dayOfMonth';
export type OutputFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD-MMM-YYYY' | 'full' | 'long' | 'medium' | 'short';

export interface DayListOptions {
    startDate: string;
    endDate: string;
    filters: FilterType[];
    dayOfWeekFilter: number[];
    dayOfMonthFilter: number[];
    outputFormat: OutputFormat;
    separator: string;
    locale: string;
}

/**
 * Generates a list of days between the start and end dates,
 * filtered by the specified criteria.
 * @param options Configuration options for generating the day list
 * @returns A string containing the formatted list of days
 */
export function generateDayList(options: DayListOptions): string {
    const {
        startDate,
        endDate,
        filters,
        dayOfWeekFilter,
        dayOfMonthFilter,
        outputFormat,
        separator,
        locale
    } = options;

    // Parse the start and end dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return "Invalid date range";
    }

    // Generate all dates in the range
    const dates: Date[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Apply filters
    const filteredDates = dates.filter(date => {
        // No filters, include all dates
        if (filters.length === 0) {
            return true;
        }

        let include = true;

        // Day of week filter
        if (filters.includes('dayOfWeek')) {
            // If filter is empty, include all days
            if (dayOfWeekFilter.length === 0) {
                include = true;
            } else {
                // Check if the day of the week is in the filter
                include = include && dayOfWeekFilter.includes(date.getDay());
            }
        }

        // Day of month filter
        if (filters.includes('dayOfMonth')) {
            // If filter is empty, include all days
            if (dayOfMonthFilter.length === 0) {
                include = true;
            } else {
                // Check if the day of the month is in the filter
                include = include && dayOfMonthFilter.includes(date.getDate());
            }
        }

        return include;
    });

    // Format the dates
    const formattedDates = filteredDates.map(date => formatDate(date, outputFormat, locale));

    // Join with the specified separator
    return formattedDates.join(separator);
}

/**
 * Formats a date according to the specified format and locale
 * @param date The date to format
 * @param format The desired output format
 * @param locale The locale to use for formatting
 * @returns A formatted date string
 */
function formatDate(date: Date, format: OutputFormat, locale: string): string {
    switch (format) {
        case 'YYYY-MM-DD': {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        case 'MM/DD/YYYY': {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${month}/${day}/${year}`;
        }
        case 'DD/MM/YYYY': {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${day}/${month}/${year}`;
        }
        case 'DD-MMM-YYYY': {
            const year = date.getFullYear();
            const month = date.toLocaleDateString(locale, { month: 'short' });
            const day = String(date.getDate()).padStart(2, '0');
            return `${day}-${month}-${year}`;
        }
        case 'full':
            return date.toLocaleDateString(locale, { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        case 'long':
            return date.toLocaleDateString(locale, { 
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        case 'medium':
            return date.toLocaleDateString(locale, { 
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        case 'short':
            return date.toLocaleDateString(locale, { 
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
        default:
            return date.toISOString().split('T')[0];
    }
}