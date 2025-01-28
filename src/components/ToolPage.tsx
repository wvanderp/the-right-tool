import React from 'react';

interface ToolPageProps {
    title: string;
    children: React.ReactNode;
}

export default function ToolPage({ title, children }: ToolPageProps): React.ReactElement {
    return (
        <div className="flex flex-col items-center w-full p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">{title}</h1>
            {children}
        </div>
    );
}
