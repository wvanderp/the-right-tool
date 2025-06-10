import { useState, useEffect } from 'react';
import { ToolComponent } from '../types/ToolComponent';

export default function Menu(props: { tools: ToolComponent[] }) {
    const currentPath = document.location.pathname;
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Close menu when route changes on mobile
    useEffect(() => {
        setIsMenuOpen(false);
    }, [currentPath]);

    return (
        <>
            <button 
                className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-gray-900 text-white rounded-lg 
                hover:bg-gray-800 hover:scale-105 active:scale-95 flex items-center justify-center
                transition-custom border border-gray-700"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
                {isMenuOpen ? '✕' : '☰'}
            </button>
            
            <div className="md:sticky md:top-0 md:h-screen">
                <nav className={`
                    w-64 p-6 bg-gray-900 text-white border-r border-gray-700
                    fixed md:sticky top-0 left-0 h-screen overflow-y-auto z-40
                    transform transition-custom ease-in-out pt-16 md:pt-6
                    ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <a href="/" className="block mt-8 md:mt-0">
                        <h1 className="text-2xl font-medium mb-8 text-white hover:text-yellow-600
                            transition-custom tracking-wide">
                            The Right Tool
                        </h1>
                    </a>
                    <ul className="space-y-1.5" role="list">
                        {props.tools.map(({ meta }) => (
                            <a key={meta.name} 
                               href={`${meta.route}`} 
                               onClick={() => setIsMenuOpen(false)}
                               aria-current={currentPath === meta.route ? 'page' : undefined}>
                                <li 
                                    className={`px-4 py-3 rounded-lg border-l-2 transition-custom
                                        tracking-wide leading-relaxed
                                        ${currentPath === meta.route 
                                            ? 'border-yellow-600 bg-gray-800 text-yellow-600 font-medium' 
                                            : 'border-transparent text-gray-300 hover:bg-gray-800 hover:text-white hover:border-yellow-600/50'
                                        }`}>
                                    {meta.name}
                                </li>
                            </a>
                        ))}
                    </ul>
                </nav>
            </div>
        </>
    );
}
