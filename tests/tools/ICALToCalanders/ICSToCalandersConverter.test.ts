import { describe, it, expect } from 'vitest';

import fs from 'fs';
import path from 'path';

import ICALToCalendersConverter from '../../../src/tools/ICALToCalenders/ICALToCalendersConverter';

const icalFolder = path.join(__dirname, 'icals');

describe('ICSToCalandersConverter', () => {

    it('Should support the most basic case', () => {
        const ICAL = fs.readFileSync(path.join(icalFolder, 'basic.ics'), 'utf-8');

        const result = ICALToCalendersConverter(ICAL);

        expect(result).toEqual([]);
    });
});
