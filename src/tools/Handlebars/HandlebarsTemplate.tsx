import React from 'react';
import { useState } from 'react';
import Handlebars from 'handlebars';
import ToolDescription from '../../components/ToolDescription';
import ToolPage from '../../components/ToolPage';

/**
 * This tool takes a JSON object, some arbitrary javascript code and a Handlebars template
 * It sets up handlebars with the "plugins" from the js code and then renders the template with the JSON data.
 * the Tool returns the rendered template as a string.
 */
export default function HandlebarsTemplate() : React.ReactElement {
    // inputs
    const [json, setJson] = useState('');
    const [javascript, setJavascript] = useState('');
    const [template, setTemplate] = useState('');

    // output
    const [output, setOutput] = useState('');
    const [parseErrors, setParseErrors] = useState<string[]>([]);

    function convert() {
        setParseErrors([]);
        try {
            JSON.parse(json);
        } catch (e) {
            // @ts-expect-error -- We don't know the type of e but if it string like then we can put on the screen
            setParseErrors([...parseErrors, e.message]);
            return;
        }

        try {
            eval(javascript);
        } catch (e) {
            // @ts-expect-error -- We don't know the type of e but if it string like then we can put on the screen
            setParseErrors([...parseErrors, e.message]);
            return;
        }

        try {
            const templateFunction = Handlebars.compile(template);
            const result = templateFunction(JSON.parse(json));
            setOutput(result);
        }
        catch (e) {
            // @ts-expect-error -- We don't know the type of e but if it string like then we can put on the screen
            setParseErrors([...parseErrors, e.message]);
        }
    }
    
    return (
        <ToolPage 
            title="Handlebars Template"
        >
                    <ToolDescription>
            This tool takes a JSON object, some arbitrary JavaScript code, and a Handlebars template.
            It sets up Handlebars with the "plugins" from the JS code and then renders the template with the JSON data.
            The tool returns the rendered template as a string.
        </ToolDescription>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-6">
                <label className="flex flex-col">
                    <span className="font-medium mb-2">JSON Data:</span>
                    <textarea 
                        className="border-2 border-gray-200 rounded p-3 h-[300px] w-full font-mono text-sm hover:border-blue-500 focus:border-blue-500 focus:outline-none" 
                        value={json} 
                        onChange={(e) => setJson(e.target.value)} 
                    />
                </label>
                <label className="flex flex-col">
                    <span className="font-medium mb-2">JavaScript:</span>
                    <textarea 
                        className="border-2 border-gray-200 rounded p-3 h-[300px] w-full font-mono text-sm hover:border-blue-500 focus:border-blue-500 focus:outline-none" 
                        value={javascript} 
                        onChange={(e) => setJavascript(e.target.value)} 
                    />
                </label>
                <label className="flex flex-col">
                    <span className="font-medium mb-2">Handlebars Template:</span>
                    <textarea 
                        className="border-2 border-gray-200 rounded p-3 h-[300px] w-full font-mono text-sm hover:border-blue-500 focus:border-blue-500 focus:outline-none" 
                        value={template} 
                        onChange={(e) => setTemplate(e.target.value)} 
                    />
                </label>
            </div>

            {parseErrors.length !== 0 && (
                <div className="text-red-500 mb-4 p-4 border-2 border-red-200 rounded bg-red-50 w-full">
                    {parseErrors.join("\n")}
                </div>
            )}

            <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-medium w-full max-w-xs" 
                onClick={convert}
            >
                Convert
            </button>

            {output && (
                <pre className="border-2 border-gray-200 rounded p-4 w-full mt-6 font-mono text-sm bg-gray-50 overflow-x-auto">
                    {output}
                </pre>
            )}
        </ToolPage>
    );
}
