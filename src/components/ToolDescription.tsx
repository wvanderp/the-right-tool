import React from 'react';

interface ToolDescriptionProps {
    children: React.ReactNode;
}

export default function ToolDescription({ children }: ToolDescriptionProps): React.ReactElement {
    return (
        <div className="border border-gray-200 rounded-lg p-6 mb-8 w-full bg-gray-50">
            <p className="text-gray-600 leading-relaxed text-base tracking-wide">
                {children}
            </p>
        </div>
    );
}
