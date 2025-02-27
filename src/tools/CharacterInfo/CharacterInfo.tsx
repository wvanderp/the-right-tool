import React, { useState, JSX } from 'react';
import ToolPage from '../../components/ToolPage';
import ToolDescription from '../../components/ToolDescription';
import { getCharacterInfoArray, type CharacterInfo } from './characterInfoUtils';

export default function CharacterInfo(): React.ReactElement {
    const [text, setText] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const characterInfoArray = getCharacterInfoArray(text);

    const handleCharacterClick = (index: number) => {
        setSelectedIndex(selectedIndex === index ? null : index);
    };

    return (
        <ToolPage title="Character Information">
            <ToolDescription>
                Paste or type any text to see detailed information about each character.
                Non-visible characters (like spaces, tabs, and control characters) are shown with visible symbols.
                Hover over any character to view its Unicode information, including character code,
                name, category, block, and script information.
            </ToolDescription>

            <div className="w-full max-w-4xl space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Text:
                    </label>
                    <textarea
                        className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg font-mono text-lg hover:border-blue-500 focus:border-blue-500 focus:outline-none"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type or paste text here..."
                    />
                </div>

                <div className="p-4 border-2 border-gray-200 rounded-lg min-h-[100px]">
                    {characterInfoArray.reduce((acc: JSX.Element[], info, index) => {
                            acc.push(
                                <span
                                    key={index}
                                    className="relative group inline-block cursor-help"
                                    onClick={() => handleCharacterClick(index)}
                                >
                                    <span className={`text-xl font-mono p-1 rounded inline-block min-w-[1em] text-center ${selectedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-100'}`}>
                                        {info.displayChar}
                                    </span>
                                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg ${selectedIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} whitespace-nowrap z-10 pointer-events-none`}>
                                        <div>Original: {info.char}</div>
                                        <div>Display: {info.displayChar}</div>
                                        <div>Code: U+{info.code.toString(16).toUpperCase().padStart(4, '0')}</div>
                                        <div>Name: {info.name}</div>
                                        <div>Category: {info.category}</div>
                                        <div>Block: {info.block}</div>
                                        <div>Script: {info.script}</div>
                                    </div>
                                </span>
                            );

                            if (info.char === '\n') {
                                acc.push(<br key={`br-${index}`} />);
                            } 
                        
                        return acc;
                    }, [])}
                </div>
            </div>
        </ToolPage>
    );
}