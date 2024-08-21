import React from 'react';
import { useState } from 'react';
import Handlebars from 'handlebars';

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
        <div className="flex flex-col items-center w-full">
            <h1 className="text-2xl font-bold">Handlebars Template</h1>

            <p>
                This tool takes a JSON object, some arbitrary javascript code and a Handlebars template
                It sets up handlebars with the "plugins" from the js code and then renders the template with the JSON data.
                the Tool returns the rendered template as a string.
            </p>

            <div className="flex">
                {/* three text areas for the json template and js */}
                <label className="flex flex-col">
                    JSON Data:
                    <textarea className="border-2 border-gray-200 rounded p-2" value={json} onChange={(e) => setJson(e.target.value)} />
                </label>
                <label className="flex flex-col">
                    Javascript:
                    <textarea className="border-2 border-gray-200 rounded p-2" value={javascript} onChange={(e) => setJavascript(e.target.value)} />
                </label>
                <label className="flex flex-col">
                    Handlebars Template:
                    <textarea className="border-2 border-gray-200 rounded p-2" value={template} onChange={(e) => setTemplate(e.target.value)} />
                </label>
            </div>

            {parseErrors && <div className="text-red-500">{parseErrors}</div>}

            <button className="bg-blue-500 text-white p-2 rounded m-4" onClick={convert}>Convert</button>

            {output && <pre className="border-2 border-gray-200 rounded p-2">{output}</pre>}
      </div>
    );
}
