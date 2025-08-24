import React, { useState } from 'react';

interface EditableFieldProps {
    value: number;
    onChange: (value: string) => void;
    suffix?: string;
    step?: string;
    align?: 'left' | 'right';
    min?: number;
    max?: number;
}

export function EditableField({
    value,
    onChange,
    suffix = '',
    step = '0.1',
    align = 'left',
    min = 0,
    max = Infinity
}: EditableFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const handleStartEditing = () => {
        setInputValue(value.toString());
        setIsEditing(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const numValue = Number(newValue);

        if (newValue === '' || (numValue >= min && numValue <= max)) {
            setInputValue(newValue);
            onChange(newValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    return (
        <span
            className={`cursor-pointer hover:bg-gray-50 px-2 py-2 rounded transition-colors duration-200 ${align === 'right' ? 'text-right' : ''
                }`}
            onClick={handleStartEditing}
        >
            {isEditing ? (
                <input
                    type="number"
                    value={inputValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    autoFocus
                    className={`w-full border border-gray-300 rounded px-2 py-2 
                    focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                    outline-none transition-custom
                    ${align === 'right' ? 'text-right' : ''}`}
                    step={step}
                    min={min}
                    max={max}
                />
            ) : (
                <span className="text-gray-700">
                    {`${value.toFixed(suffix === '%' ? 1 : 2)}${suffix}`}
                </span>
            )}
        </span>
    );
}
