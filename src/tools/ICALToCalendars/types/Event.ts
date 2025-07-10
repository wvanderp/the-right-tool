// [
//     "vcalendar",
//     [
//       [
//         "version",
//         {},
//         "text",
//         "2.0"
//       ],
//       [
//         "prodid",
//         {},
//         "text",
//         "-//hacksw/handcal//NONSGML v1.0//EN"
//       ]
//     ],
//     [
//       [
//         "vevent",
//         [
//           [
//             "uid",
//             {},
//             "text",
//             "uid1@example.com"
//           ],
//           [
//             "dtstamp",
//             {},
//             "date-time",
//             "1997-07-14T17:00:00Z"
//           ],
//           [
//             "organizer",
//             {
//               "cn": "John Doe"
//             },
//             "cal-address",
//             "MAILTO:john.doe@example.com"
//           ],
//           [
//             "dtstart",
//             {},
//             "date-time",
//             "1997-07-14T17:00:00Z"
//           ],
//           [
//             "dtend",
//             {},
//             "date-time",
//             "1997-07-15T04:00:00Z"
//           ],
//           [
//             "summary",
//             {},
//             "text",
//             "Bastille Day Party"
//           ],
//           [
//             "geo",
//             {},
//             "float",
//             [
//               48.85299,
//               2.36885
//             ]
//           ]
//         ],
//         []
//       ]
//     ]
//   ]



export default interface Event {
    summary: string;
    description?: string;
    location?: string;
    startTime: string;
    endTime: string;
    timezone?: string; // IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
    organizer?: {
        name: string;
        email: string;
    };
    geoLocation?: {
        lat: number;
        lon: number;
    };
    attendees?: {
        name: string;
        email: string;
    }[];
}