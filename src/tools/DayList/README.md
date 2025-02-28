# Day List Generator

Sometimes you need a list of specific days matching certain patterns. This tool helps you generate that list by filtering dates within a range based on criteria like day of the week or day of the month.

For example, you can generate:
- All Saturdays in a year
- Every 15th of the month in a year
- All Sundays that fall on the 1st of a month

## Features

- Select any date range
- Filter by day of week (Sunday, Monday, etc.)
- Filter by specific days of the month (1st, 15th, last day, etc.)
- Multiple output formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
- Custom separators (newline, comma, etc.)
- Multiple language support for formatted dates
- Copy to clipboard functionality

## History

I needed a list of all the Saturdays in a year for a project, and creating it manually was tedious. This tool automates the process and makes it flexible for various date patterns.

## Decisions

The implementation focuses on:

- Simple, intuitive interface for everyday users
- Flexible filtering options combining multiple criteria
- Client-side processing for speed and privacy
- Output customization for different needs
- Persistent settings using localStorage

## Future Improvements

Future enhancements could include:

### Additional Filters
- Day numbers of the year (e.g., 1st day, 100th day)
- Week numbers of the year
- Week numbers of the month
- Specific months
- Working days vs. weekends
- Holidays (would require holiday calendar integration)

### Output Enhancements
- More date format options
- Save output as file (CSV, TXT)
- Calendar visualization
- Support for custom repeating patterns
- Date range templates (next month, this quarter, etc.)

### Technical Improvements
- More comprehensive test coverage
- Performance optimizations for very large date ranges
