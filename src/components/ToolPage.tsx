import React, { useEffect } from 'react';

interface ToolPageProps {
    title: string;
    children: React.ReactNode;
}

export default function ToolPage({ title, children }: ToolPageProps): React.ReactElement {
    // Update the document title when the component mounts or the title changes
    useEffect(() => {
        // Set the document title to include the site name
        document.title = `${title} | The Right Tool`;
        
        // Restore the original title when the component unmounts
        return () => {
            document.title = 'The Right Tool';
        };
    }, [title]);

    return (
        <div className="flex flex-col items-center w-full p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">{title}</h1>
            {children}
        </div>
    );
}
