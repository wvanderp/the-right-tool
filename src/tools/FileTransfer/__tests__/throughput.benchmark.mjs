import assert from 'node:assert/strict';
import { runThroughputScenario, THROUGHPUT_SCENARIOS } from './throughputHarness.ts';

const results = [];
for (const scenario of THROUGHPUT_SCENARIOS) {
    const result = await runThroughputScenario(scenario);
    assert.equal(result.receivedBytes, scenario.size, 'Entire file is received before the deadline.');
    assert.equal(result.confirmedBytes, scenario.feedback ? scenario.size : 0);
    assert.deepEqual(result.reconstructed, result.original, 'Reconstructed file matches every source byte.');
    assert.equal(result.ignoredReads, 0);
    assert.ok(result.bytesPerSecond >= scenario.minimum, `${scenario.name} meets ${scenario.minimum} B/s.`);
    results.push({ scenario: scenario.name, fileBytes: scenario.size, minimumBytesPerSecond: scenario.minimum,
        elapsedSeconds: result.elapsedMs / 1000, bytesPerSecond: Number(result.bytesPerSecond.toFixed(1)),
        qrAreaPercent: Number((result.qrAreaFraction * 100).toFixed(1)) });
}
console.log('Whole-file virtual-time transfer; includes metadata, final QR hold, and all final acknowledgements when feedback is enabled.');
console.table(results);
