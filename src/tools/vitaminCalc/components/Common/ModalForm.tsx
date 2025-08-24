import { useEffect, useRef, ReactNode } from 'react';

interface ModalFormProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
    error?: string;
    className?: string;
}

function ModalForm({ title, onClose, children, error, className }: ModalFormProps) {
    const liveRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const startedOutsideRef = useRef<boolean>(false);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        if (liveRef.current) liveRef.current.textContent = error ?? '';
    }, [error]);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50"
            onPointerDown={(e) => {
                // only consider the start target: if pointerdown happened on the overlay element
                startedOutsideRef.current = e.target === overlayRef.current;
            }}
            onClick={() => {
                // only close if the pointerdown started outside the modal (on the overlay)
                if (startedOutsideRef.current) onClose();
            }}
        >
            <div className={`bg-white p-8 rounded-lg shadow-lg w-full max-w-md max-h-full overflow-y-auto ${className ?? ''}`} onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                {error && <div className="text-red-500 mb-2" role="alert">{error}</div>}
                <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />
                {children}
            </div>
        </div>
    );
}

export default ModalForm;
