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
export default function HandlebarsTemplate(): React.ReactElement {
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
                Generate dynamic text using the Handlebars templating engine. Provide JSON data and a Handlebars template,
                and optionally add custom JavaScript helpers. Perfect for generating emails, reports, or any text that needs
                dynamic content based on data.
            </ToolDescription>

            <div className="space-y-6 max-w-4xl w-full">
                {/* JSON Input */}
                <div>
                    <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 mb-2">
                        JSON Data
                    </label>
                    <textarea
                        id="json-input"
                        value={json}
                        onChange={(e) => setJson(e.target.value)}
                        className="w-full h-32 font-mono text-sm"
                        placeholder='{"name": "John", "age": 30}'
                    />
                </div>

                {/* JavaScript Input */}
                <div>
                    <label htmlFor="js-input" className="block text-sm font-medium text-gray-700 mb-2">
                        JavaScript Helpers (Optional)
                    </label>
                    <textarea
                        id="js-input"
                        value={javascript}
                        onChange={(e) => setJavascript(e.target.value)}
                        className="w-full h-32 font-mono text-sm"
                        placeholder="Handlebars.registerHelper('uppercase', function(str) { return str.toUpperCase(); });"
                    />
                </div>

                {/* Template Input */}
                <div>
                    <label htmlFor="template-input" className="block text-sm font-medium text-gray-700 mb-2">
                        Handlebars Template
                    </label>
                    <textarea
                        id="template-input"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        className="w-full h-32 font-mono text-sm"
                        placeholder="Hello {{name}}, you are {{age}} years old!"
                    />
                </div>

                {/* Convert Button */}
                <button
                    onClick={convert}
                    className="btn-primary"
                >
                    Generate Output
                </button>

                {/* Error Display */}
                {parseErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-red-800 mb-2">Errors:</h3>
                        <ul className="list-disc list-inside text-sm text-red-600 space-y-2">
                            {parseErrors.map((error, index) => (
                                <li key={index} className="font-mono">{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Output Display */}
                {output && (
                    <div>
                        <label htmlFor="output" className="block text-sm font-medium text-gray-700 mb-2">
                            Generated Output
                        </label>
                        <textarea
                            id="output"
                            value={output}
                            readOnly
                            className="w-full h-48 bg-gray-50 font-mono text-sm"
                        />
                    </div>
                )}
            </div>
        </ToolPage>
    );
}
