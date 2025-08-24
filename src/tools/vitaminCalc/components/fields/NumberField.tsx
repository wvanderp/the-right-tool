import React, { ChangeEvent, useCallback, useState, forwardRef } from 'react';

const parseNumber = (value: string): number | null => {
    if (!value) return null;

    // Allow both comma and dot as decimal separators, but only process if it's a final value
    const normalized = value.trim();
    if (normalized.endsWith('.') || normalized.endsWith(',')) {
        return null;
    }

    const withDot = normalized.replace(',', '.');
    const parsed = parseFloat(withDot);

    return isNaN(parsed) ? null : parsed;
};

interface NumberFieldProps {
    value: number | null;
    onChange: (value: number | null) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    autoFocus?: boolean;
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField({
    value, onChange, className, placeholder, disabled, onKeyDown, autoFocus
}, ref) {
    const [inputValue, setInputValue] = useState(value?.toString() ?? '');

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const newInput = e.target.value;
        if (newInput === '' || /^-?\d*[.,]?\d*$/.test(newInput)) {
            setInputValue(newInput);
        }
    }, []);

    const handleBlur = useCallback(() => {
        const parsedValue = parseNumber(inputValue);
        onChange(parsedValue);
        setInputValue(parsedValue?.toString() ?? '');
    }, [inputValue, onChange]);

    return (
        <input
            ref={ref}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={onKeyDown}
            autoFocus={autoFocus}
            className={className}
            placeholder={placeholder}
            disabled={disabled} />
    );
});
