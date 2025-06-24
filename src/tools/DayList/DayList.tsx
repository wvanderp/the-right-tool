import React, { useState, useEffect } from 'react';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import { generateDayList, DayListOptions, OutputFormat, FilterType } from './dayListLogic';
import { FiCopy, FiCheck } from 'react-icons/fi';

export default function DayList(): React.ReactElement {
    // Date range selection
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(() => {
        const nextYear = new Date();
        nextYear.setMonth(nextYear.getMonth() + 1);
        return nextYear.toISOString().split('T')[0];
    });

    // Filters
    const [filters, setFilters] = useState<FilterType[]>([]);
    const [dayOfWeekFilter, setDayOfWeekFilter] = useState<number[]>([]);
    const [dayOfMonthFilter, setDayOfMonthFilter] = useState<number[]>([]);

    // Output formatting
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('YYYY-MM-DD');
    const [separator, setSeparator] = useState<string>('\n');
    const [locale, setLocale] = useState<string>('en-US');

    // Generated output
    const [result, setResult] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState<boolean>(false);

    // Load from localStorage if available
    useEffect(() => {
        const savedState = localStorage.getItem('dayListState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                setStartDate(state.startDate);
                setEndDate(state.endDate);
                setFilters(state.filters || []);
                setDayOfWeekFilter(state.dayOfWeekFilter || []);
                setDayOfMonthFilter(state.dayOfMonthFilter || []);
                setOutputFormat(state.outputFormat || 'YYYY-MM-DD');
                setSeparator(state.separator || '\n');
                setLocale(state.locale || 'en-US');
            } catch (e) {
                console.error('Failed to load saved state:', e);
            }
        }
    }, []);

    // Save to localStorage when state changes
    useEffect(() => {
        localStorage.setItem('dayListState', JSON.stringify({
            startDate,
            endDate,
            filters,
            dayOfWeekFilter,
            dayOfMonthFilter,
            outputFormat,
            separator,
            locale
        }));
    }, [startDate, endDate, filters, dayOfWeekFilter, dayOfMonthFilter, outputFormat, separator, locale]);

    // Generate the day list
    const generateList = () => {
        const options: DayListOptions = {
            startDate,
            endDate,
            filters,
            dayOfWeekFilter,
            dayOfMonthFilter,
            outputFormat,
            separator: separator.replace(/\\n/g, '\n'),
            locale
        };

        const list = generateDayList(options);
        setResult(list);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result)
            .then(() => {
                setCopySuccess(true);
                setTimeout(() => {
                    setCopySuccess(false);
                }, 2000);
            })
            .catch(() => {
                setCopySuccess(false);
            });
    };

    // Handle filter changes
    const toggleFilter = (filter: FilterType) => {
        if (filters.includes(filter)) {
            setFilters(filters.filter(f => f !== filter));
        } else {
            setFilters([...filters, filter]);
        }
    };

    // Toggle day of week selection
    const toggleDayOfWeek = (day: number) => {
        if (dayOfWeekFilter.includes(day)) {
            setDayOfWeekFilter(dayOfWeekFilter.filter(d => d !== day));
        } else {
            setDayOfWeekFilter([...dayOfWeekFilter, day]);
        }
    };

    // Handle day of month selection
    const handleDayOfMonthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const days = value.split(',')
            .map(day => parseInt(day.trim(), 10))
            .filter(day => !isNaN(day) && day >= 1 && day <= 31);

        setDayOfMonthFilter(days);
    };

    // Get day name for the day of week selection
    const getDayName = (dayIndex: number): string => {
        const date = new Date(2023, 0, 1 + dayIndex);
        return date.toLocaleDateString(locale, { weekday: 'long' });
    };

    // Helper function to check if a date range is valid
    const isDateRangeValid = (): boolean => {
        return new Date(startDate) <= new Date(endDate);
    };

    return (
        <ToolPage title="Day List Generator">
            <ToolDescription>
                Generate a list of dates based on specific criteria. Need all Saturdays in a year?
                Every 15th of the month? This tool helps you create custom date lists with flexible filtering
                and formatting options. Perfect for planning, scheduling, or any task requiring specific date patterns.
            </ToolDescription>

            <div className="w-full max-w-4xl space-y-8">
                {/* Date Range Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                            focus:ring-yellow-600/20 focus:border-yellow-600 outline-none transition-custom"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                            focus:ring-yellow-600/20 focus:border-yellow-600 outline-none transition-custom"
                        />
                    </div>
                </div>

                {!isDateRangeValid() && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-200">
                        End date must be on or after start date.
                    </div>
                )}

                {/* Filters */}
                <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">Filters</h3>

                    <div className="flex flex-wrap gap-3">
                        <button
                            className={`px-4 py-2 rounded-lg transition-custom
                            ${filters.includes('dayOfWeek')
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                            onClick={() => toggleFilter('dayOfWeek')}
                        >
                            Day of Week
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg transition-custom
                            ${filters.includes('dayOfMonth')
                                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                            onClick={() => toggleFilter('dayOfMonth')}
                        >
                            Day of Month
                        </button>
                    </div>

                    {/* Day of Week Selection */}
                    {filters.includes('dayOfWeek') && (
                        <div className="p-4 border border-gray-200 rounded-lg bg-white">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Select days of the week:</h4>
                            <div className="flex flex-wrap gap-2">
                                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                    <button
                                        key={day}
                                        onClick={() => toggleDayOfWeek(day)}
                                        className={`px-3 py-2 rounded-lg transition-custom
                                        ${dayOfWeekFilter.includes(day)
                                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                    >
                                        {getDayName(day)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Day of Month Selection */}
                    {filters.includes('dayOfMonth') && (
                        <div className="p-4 border border-gray-200 rounded-lg bg-white">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                                Enter day(s) of the month (comma separated, e.g., 1,15,30):
                            </h4>
                            <input
                                type="text"
                                value={dayOfMonthFilter.join(', ')}
                                onChange={handleDayOfMonthChange}
                                placeholder="e.g., 1, 15, 30"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                                focus:ring-yellow-600/20 focus:border-yellow-600 outline-none transition-custom"
                            />
                        </div>
                    )}
                </div>

                {/* Output Format */}
                <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">Output Format</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date Format
                            </label>
                            <select
                                value={outputFormat}
                                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                                focus:ring-yellow-600/20 focus:border-yellow-600 outline-none transition-custom"
                            >
                                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2023-01-01)</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 01/01/2023)</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 01/01/2023)</option>
                                <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g., 01-Jan-2023)</option>
                                <option value="full">Full (e.g., Sunday, January 1, 2023)</option>
                                <option value="long">Long (e.g., January 1, 2023)</option>
                                <option value="medium">Medium (e.g., Jan 1, 2023)</option>
                                <option value="short">Short (e.g., 1/1/2023)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Separator
                            </label>
                            <select
                                value={separator}
                                onChange={(e) => setSeparator(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                                focus:ring-yellow-600/20 focus:border-yellow-600 outline-none transition-custom"
                            >
                                <option value="\n">New Line</option>
                                <option value=", ">Comma</option>
                                <option value="; ">Semicolon</option>
                                <option value=" | ">Pipe</option>
                                <option value="\t">Tab</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Locale (for day and month names)
                        </label>
                        <select
                            value={locale}
                            onChange={(e) => setLocale(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 
                            focus:ring-yellow-600/20 focus:border-yellow-600 outline-none transition-custom"
                        >
                            <option value="en-US">English (US)</option>
                            <option value="en-GB">English (UK)</option>
                            <option value="es-ES">Spanish (Spain)</option>
                            <option value="fr-FR">French (France)</option>
                            <option value="de-DE">German (Germany)</option>
                            <option value="it-IT">Italian (Italy)</option>
                            <option value="nl-NL">Dutch (Netherlands)</option>
                            <option value="ja-JP">Japanese (Japan)</option>
                            <option value="zh-CN">Chinese (China)</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={generateList}
                    disabled={!isDateRangeValid()}
                    className={`px-6 py-3 rounded-lg font-medium transition-custom
                    ${isDateRangeValid()
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700 active:scale-[0.98]'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                    Generate Date List →
                </button>

                {/* Results */}
                {result && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-700">Generated Date List:</h3>
                            <button
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 
                                text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
                                onClick={copyToClipboard}
                                title="Copy to clipboard"
                            >
                                {copySuccess ? (
                                    <>
                                        <span>Copied!</span>
                                        <FiCheck className="h-4 w-4" />
                                    </>
                                ) : (
                                    <>
                                        <span>Copy</span>
                                        <FiCopy className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className="p-4 bg-gray-50 border border-gray-200 rounded-lg overflow-auto 
                        max-h-[400px] font-mono text-sm">
                            {result}
                        </pre>
                    </div>
                )}
            </div>
        </ToolPage>
    );
}