/**
* Creating an "Add to Google Calendar" link on your website enables users to effortlessly add events to their personal calendars. This is achieved by constructing a URL that pre-fills event details when clicked. Here's a comprehensive guide on how to build such a link, including essential parameters, formatting rules, and considerations for various scenarios.
* 
* **Base URL:**
* 
* 
* ```
* https://calendar.google.com/calendar/render?action=TEMPLATE
* ```
* 
* 
* 
* **Required Parameters:**
* 
* 1. **`text`**: Specifies the event title.
*    - *Format*: `text=Event+Title`
*    - *Example*: `text=Team+Meeting`
* 
* 2. **`dates`**: Defines the event's start and end times.
*    - *Format*: `dates=YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ` for specific times in UTC.
*    - *Example*: `dates=20250315T090000Z/20250315T100000Z`
*    - *All-Day Events*: Use `dates=YYYYMMDD/YYYYMMDD`. Note that the end date should be the day after the last day of the event.
*      - *Example*: `dates=20250315/20250316` for an all-day event on March 15, 2025.
* 
* **Optional Parameters:**
* 
* - **`details`**: Provides a description of the event.
*   - *Format*: `details=Event+Description`
*   - *Example*: `details=Discuss+project+milestones`
* 
* - **`location`**: Indicates the event's location.
*   - *Format*: `location=Event+Location`
*   - *Example*: `location=123+Main+St,+Anytown`
* 
* - **`ctz`**: Sets the event's time zone using IANA time zone names.
*   - *Format*: `ctz=Time_Zone`
*   - *Example*: `ctz=America/New_York`
* 
* - **`recur`**: Defines recurrence rules for repeating events using the `RRULE` format from RFC 5545.
*   - *Format*: `recur=RRULE:FREQ=FREQUENCY;UNTIL=END_DATE`
*   - *Example*: `recur=RRULE:FREQ=WEEKLY;UNTIL=20250601T000000Z` for a weekly event until June 1, 2025.
* 
* - **`trp`**: Determines the event's transparency, indicating whether the time is marked as busy or available.
*   - *Format*: `trp=true` or `trp=false`
*   - *Example*: `trp=false` (shows as busy)
* 
* - **`sprop`**: Specifies the source of the event, such as the website where the event is listed.
*   - *Format*: `sprop=website:Source_URL`
*   - *Example*: `sprop=website:https://www.example.com`
* 
* **Constructing the URL:**
* 
* Combine the base URL with the necessary parameters to form the complete link. Ensure all parameter values are URL-encoded to handle special characters properly.
* 
* *Example URL:*
* 
* 
* ```
* https://calendar.google.com/calendar/render?action=TEMPLATE&text=Team+Meeting&dates=20250315T090000Z/20250315T100000Z&details=Discuss+project+milestones&location=123+Main+St,+Anytown&ctz=America/New_York
* ```
* 
* 
* 
* **Edge Cases and Considerations:**
* 
* 1. **Time Zone Handling:**
*    - If the `ctz` parameter is omitted, Google Calendar defaults to UTC.
*    - To use the user's local time zone, omit both the `ctz` parameter and the `Z` suffix in the `dates` parameter.
* 
* 2. **Special Characters:**
*    - Always URL-encode special characters in parameter values to ensure the URL is correctly parsed.
*    - *Example*: A space should be encoded as `%20` or replaced with a plus sign (`+`).
* 
* 3. **Recurring Events:**
*    - The `recur` parameter must follow the iCalendar `RRULE` specification.
*    - Improperly formatted recurrence rules can lead to errors or unexpected behavior.
* 
* 4. **Event Visibility:**
*    - The `trp` parameter controls whether the event shows as busy (`trp=false`) or available (`trp=true`).
*    - For all-day events, the `trp` parameter is ignored; use the `crm` parameter with values `AVAILABLE`, `BUSY`, or `BLOCKING` instead.
* 
* 5. **Parameter Dependencies:**
*    - The `action`, `text`, and `dates` parameters are mandatory.
*    - Omitting any required parameter will result in an incomplete or non-functional event link.
* 
* **Best Practices:**
* 
* - **Testing:** Before deploying, test the generated URLs across different devices and calendar applications to ensure compatibility and correctness.
* 
* - **User Guidance:** Provide clear instructions or tooltips near the "Add to Calendar" link to guide users on its functionality.
* 
* - **Security Considerations:** Be cautious when including links within event descriptions to prevent potential phishing attacks. Ensure all links are from trusted sources.
* 
* By meticulously constructing your "Add to Google Calendar" links with these parameters and considerations, you can offer a seamless and user-friendly experience for adding 
*/

import type Event from "./types/Event";

/**
 * Get the browser's timezone using the Intl API
 */
function getBrowserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function generateCalendarLinks(events: Event[]): string[] {
    if (!events || events.length === 0) {
        return [];
    }

    return events.map((event) => generateGoogleCalendarLink(event));
}

function generateGoogleCalendarLink(event: Event): string {
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";

    // Format dates to match Google Calendar format
    // If the original time ends with Z (UTC), keep the Z suffix
    // If the original time doesn't end with Z (local time), don't add Z suffix
    const formatDate = (dateStr: string) => {
        const isUTC = dateStr.endsWith('Z');
        const formatted = dateStr
            .replace(/[-:.]/g, '') // Remove dashes, colons, and periods
            .replace(/\.\d+/, '') // Remove milliseconds
            .replace(/Z$/, '') // Remove any existing Z
            .substring(0, 15); // Keep only up to seconds

        return isUTC ? formatted + 'Z' : formatted;
    };

    const startTime = formatDate(event.startTime);
    const endTime = formatDate(event.endTime);

    // Manually encode parameters to ensure proper formatting
    const encodeParam = (str: string) => {
        return str.split(' ').join('+') // Replace spaces with +
            .replace(/[&]/g, '%26') // Encode &
            .replace(/[#]/g, '%23') // Encode #
            .replace(/[,]/g, '%2C'); // Encode ,
    };

    const params = [];
    params.push(`text=${encodeParam(event.summary)}`);
    params.push(`dates=${startTime}/${endTime}`);

    if (event.description) {
        params.push(`details=${encodeParam(event.description)}`);
    }

    if (event.location) {
        params.push(`location=${encodeParam(event.location)}`);
    }

    // Use the event's timezone if provided, otherwise fall back to browser's timezone
    const timezone = event.timezone || getBrowserTimezone();
    params.push(`ctz=${encodeParam(timezone)}`);

    return `${baseUrl}&${params.join('&')}`;
}
