import React from 'react';

interface ToolDescriptionProps {
    children: React.ReactNode;
}

export default function ToolDescription({ children }: ToolDescriptionProps): React.ReactElement {
    return (
        <div className="border-2 border-gray-200 rounded-lg p-6 mb-8 w-full">
            <p className="text-gray-700 leading-relaxed">
                {children}
            </p>
        </div>
    );
}
