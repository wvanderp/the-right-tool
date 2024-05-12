import ICAL from "ical.js";

export default function ICALToCalendersConverter(ICALString: string): string[] {
    console.log(ICALString);

    const calenderData = ICAL.parse(ICALString);



    console.log(JSON.stringify(calenderData, null, 2));


    return [];
}
