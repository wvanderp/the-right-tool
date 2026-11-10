export function startRotation(advance: () => void, milliseconds = 1000) {
    const timer = setInterval(advance, milliseconds);
    return () => clearInterval(timer);
}
