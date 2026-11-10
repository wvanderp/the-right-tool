export function rotationDelay(confirmed: number) {
    return confirmed < 4 ? 1000 : confirmed < 12 ? 750 : confirmed < 28 ? 500 : 350;
}
export function startRotation(advance: () => void, milliseconds = 1000) {
    const timer = setInterval(advance, milliseconds);
    return () => clearInterval(timer);
}
