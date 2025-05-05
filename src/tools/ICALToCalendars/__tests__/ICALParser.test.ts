import { describe, it, expect } from "vitest";

import fs from "fs";
import path from "path";

import ICALParser, { ICALPreprocessor } from "../ICALParser";

const icalFolder = path.join(__dirname, "icals");

describe("ICSToCalendarsConverter", () => {
  it("Should support the most basic case", () => {
    const ICAL = fs.readFileSync(path.join(icalFolder, "basic.ics"), "utf-8");

    const result = ICALParser(ICAL);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      summary: "Bastille Day Party",
      startTime: "1997-07-14T17:00:00Z",
      endTime: "1997-07-15T04:00:00Z",
      organizer: {
        name: "John Doe",
        email: "john.doe@example.com",
      },
      geoLocation: {
        lat: 48.85299,
        lon: 2.36885,
      },
    });
  });

  it("should support ICal with missing fields", () => {
    const ICAL = fs.readFileSync(path.join(icalFolder, "kapper.ics"), "utf-8");

    const result = ICALParser(ICAL);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      summary:
        "Afspraak bij BrainWash Capelle a/d IJssel Koperwiek ,op 03-03-2025 met aanvang 12:55",
      startTime: "2025-03-03T12:55:00",
      endTime: "2025-03-03T13:15:00",
      location: "Koperwiek 71 2903AD Capelle a/d Ijssel",
    });
  });
});

describe("Ical Preprocessor", () => {
  it("should move prodid to the second line", () => {
    const ICAL = `BEGIN:VCALENDAR
        something
        PRODID:-//Google Inc//Google Calendar 70.9054//EN
        something else
        END:VCALENDAR`;

    const result = ICALPreprocessor(ICAL);

    expect(result).toEqual(`BEGIN:VCALENDAR
PRODID:-//Google Inc//Google Calendar 70.9054//EN
something
something else
END:VCALENDAR`);
  });
});
