import ICAL from "ical.js";
import Event from "./types/Event";

export function ICALPreprocessor(ICALString: string): string {
    // split on \n and \r\n and trim whitespace
    const lines = ICALString.split(/\r\n|\n/).map(line => line.trim());

    // Find the index of END:VCALENDAR
    const endIndex = lines.findIndex(line => line === 'END:VCALENDAR');

    if (endIndex !== -1) {
        // Only keep lines up to and including END:VCALENDAR
        lines.splice(endIndex + 1);
    }

    // move the line starting with PRODID to the top of the file right after BEGIN:VCALENDAR
    const prodid = lines.find(line => line.startsWith("PRODID"));
    if (prodid) {
        lines.splice(lines.indexOf(prodid), 1);
        lines.splice(1, 0, prodid);
    }

    return lines.join("\n");
}

export default function ICALToCalendarsConverter(ICALString: string): Event[] {
    const preprocessedICALString = ICALPreprocessor(ICALString);

    const calenderData = ICAL.parse(preprocessedICALString);
    const comp = new ICAL.Component(calenderData);
    const vevents = comp.getAllSubcomponents("vevent");

    return vevents.map(vevent => {
        const event: Event = {
            summary: String(vevent.getFirstPropertyValue("summary") || ""),
            startTime: vevent.getFirstPropertyValue("dtstart")?.toString() || "",
            endTime: vevent.getFirstPropertyValue("dtend")?.toString() || "",
        };

        // Extract timezone from DTSTART property
        const dtStartProperty = vevent.getFirstProperty("dtstart");
        if (dtStartProperty) {
            const tzid = dtStartProperty.getParameter("tzid");
            if (tzid && typeof tzid === 'string') {
                event.timezone = tzid;
            }
        }

        // Optional fields
        const description = vevent.getFirstPropertyValue("description");
        if (description) {
            event.description = String(description);
        }

        const location = vevent.getFirstPropertyValue("location");
        if (location) {
            event.location = String(location);
        }

        const organizer = vevent.getFirstProperty("organizer");
        if (organizer) {
            const organizerParam = organizer.getParameter("cn");
            const organizerValue = organizer.getFirstValue();
            event.organizer = {
                name: typeof organizerParam === 'string' ? organizerParam : "",
                email: (typeof organizerValue === 'string' ? organizerValue.replace(/^mailto:/i, "") : "").toLowerCase()
            };
        }

        const geo = vevent.getFirstPropertyValue("geo");
        if (Array.isArray(geo) && geo.length >= 2 && typeof geo[0] === 'number' && typeof geo[1] === 'number') {
            event.geoLocation = {
                lat: geo[0],
                lon: geo[1]
            };
        }

        const attendees = vevent.getAllProperties("attendee");
        if (attendees.length > 0) {
            event.attendees = attendees.map(attendee => {
                const attendeeName = attendee.getParameter("cn");
                const attendeeValue = attendee.getFirstValue();
                return {
                    name: typeof attendeeName === 'string' ? attendeeName : "",
                    email: (typeof attendeeValue === 'string' ? attendeeValue.replace(/^mailto:/i, "") : "").toLowerCase()
                };
            });
        }

        return event;
    });
}
