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
            className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                align === 'right' ? 'text-right' : ''
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
                    className={`w-full ${align === 'right' ? 'text-right' : ''}`}
                    step={step}
                    min={min}
                    max={max}
                />
            ) : (
                `${value.toFixed(suffix === '%' ? 1 : 2)}${suffix}`
            )}
        </span>
    );
}
