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
        <ToolPage title="Handlebars Template Generator">
            <ToolDescription>
                Transform your data using the power of Handlebars templating. Add custom JavaScript helpers 
                to extend functionality, then combine your JSON data with your template to generate the final output. 
                Perfect for generating formatted text, HTML, or any text-based content.
            </ToolDescription>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
                <label className="flex flex-col">
                    <span className="font-medium mb-2 text-gray-700">JSON Data:</span>
                    <textarea 
                        className="border border-gray-300 rounded-lg p-4 h-[300px] w-full font-mono text-sm
                        focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                        outline-none transition-all duration-200" 
                        value={json} 
                        onChange={(e) => setJson(e.target.value)} 
                        spellCheck="false"
                        placeholder="Paste your JSON data here..."
                    />
                </label>
                <label className="flex flex-col">
                    <span className="font-medium mb-2 text-gray-700">Custom Helpers (JavaScript):</span>
                    <textarea 
                        className="border border-gray-300 rounded-lg p-4 h-[300px] w-full font-mono text-sm
                        focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                        outline-none transition-all duration-200" 
                        value={javascript} 
                        onChange={(e) => setJavascript(e.target.value)} 
                        spellCheck="false"
                        placeholder="// Define custom Handlebars helpers here
Handlebars.registerHelper('uppercase', function(str) {
    return str.toUpperCase();
});"
                    />
                </label>
                <label className="flex flex-col">
                    <span className="font-medium mb-2 text-gray-700">Template:</span>
                    <textarea 
                        className="border border-gray-300 rounded-lg p-4 h-[300px] w-full font-mono text-sm
                        focus:ring-2 focus:ring-yellow-600/20 focus:border-yellow-600 
                        outline-none transition-all duration-200" 
                        value={template} 
                        onChange={(e) => setTemplate(e.target.value)} 
                        spellCheck="false"
                        placeholder="Enter your Handlebars template here...
Example: {{#each items}}
  - {{uppercase name}}
{{/each}}"
                    />
                </label>
            </div>

            {parseErrors.length !== 0 && (
                <div className="text-red-600 mb-6 p-4 border border-red-200 rounded-lg bg-red-50 w-full">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                        {parseErrors.join("\n")}
                    </pre>
                </div>
            )}

            <button 
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2.5 rounded-lg 
                font-medium w-full max-w-xs transition-all duration-200 
                hover:shadow-sm active:scale-[0.98]" 
                onClick={convert}
            >
                Generate Output →
            </button>

            {output && (
                <div className="mt-8 w-full">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Generated Output:</h3>
                    <pre className="border border-gray-200 rounded-lg p-4 w-full font-mono text-sm 
                    bg-gray-50 overflow-x-auto">
                        {output}
                    </pre>
                </div>
            )}
        </ToolPage>
    );
}
