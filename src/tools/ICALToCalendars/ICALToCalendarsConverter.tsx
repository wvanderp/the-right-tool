import React, { useState } from 'react';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import type Event from './types/Event';
import ICALParser from './ICALParser';
import generateCalendarLinks from './GoogleLinkCreator';

export default function ICALToCalendars(): React.ReactElement {
    const [events, setEvents] = useState<Event[]>([]);
    const [error, setError] = useState<string>('');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const parsedEvents = ICALParser(content);
                setEvents(parsedEvents);
            } catch (err) {
                setError('Failed to parse ICS file. Please make sure it\'s a valid calendar file.');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    function formatDateTime(dateTimeStr: string): string {
        try {
            const date = new Date(dateTimeStr);
            return date.toLocaleString();
        } catch {
            return dateTimeStr;
        }
    }

    return (
        <ToolPage title="ICS to Calendar">
            <ToolDescription>
                Upload an ICS file to convert it into clickable Google Calendar links. 
                Each event in the file will be converted to a separate link that you can use to add the event to your calendar.
            </ToolDescription>

            <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 
                        border-2 border-gray-200 border-dashed rounded-lg cursor-pointer 
                        bg-gray-50 hover:bg-gray-100 transition-all duration-200">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-600">
                                <span className="font-medium">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">.ics file</p>
                        </div>
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".ics"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>

                {error && (
                    <div className="p-4 text-red-600 bg-red-50 rounded-lg border border-red-200">
                        {error}
                    </div>
                )}

                {events.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-medium text-gray-900">Calendar Events:</h2>
                        <div className="space-y-3">
                            {events.map((event, index) => (
                                <div
                                    key={index}
                                    className="p-6 bg-white border border-gray-200 rounded-lg 
                                    hover:border-yellow-600/20 hover:shadow-sm transition-all duration-200"
                                >
                                    <div className="flex flex-col space-y-3">
                                        <h3 className="text-lg font-medium text-gray-900">{event.summary}</h3>
                                        <div className="text-sm text-gray-600 space-y-1.5">
                                            <div>Start: {formatDateTime(event.startTime)}</div>
                                            <div>End: {formatDateTime(event.endTime)}</div>
                                            {event.location && (
                                                <div>Location: {event.location}</div>
                                            )}
                                            {event.description && (
                                                <div className="mt-3">
                                                    <div className="font-medium text-gray-700 mb-1">Description:</div>
                                                    <div className="whitespace-pre-wrap">{event.description}</div>
                                                </div>
                                            )}
                                        </div>
                                        <a
                                            href={generateCalendarLinks([event])[0]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-flex items-center px-4 py-2 bg-yellow-600 
                                            text-white text-sm font-medium rounded-lg hover:bg-yellow-700 
                                            transition-all duration-200 focus:outline-none focus:ring-2 
                                            focus:ring-yellow-600/20 active:scale-[0.98]"
                                        >
                                            Add to Google Calendar
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ToolPage>
    );
}