import React, { useMemo, useRef, useState } from 'react';
import ToolDescription from '../../components/ToolDescription';
import ToolPage from '../../components/ToolPage';
import {
    buildPrintableDocument,
    defaultMarkdownPrintOptions,
    MarkdownPrintOptions,
    PaperSize,
    renderMarkdownToHtml
} from './markdownPrintLogic';
import { FiPrinter, FiUpload } from 'react-icons/fi';

const sampleMarkdown = `# Review Notes

This printable view leaves extra room for handwritten comments.

## Checklist

- Keep the original markdown structure.
- Increase line spacing for annotation.
- Reserve a wide right margin for notes.

> Comments are easier to add when the content is not packed tightly.
`;

export default function MarkdownPrint(): React.ReactElement {
    const [markdown, setMarkdown] = useState(sampleMarkdown);
    const [fileName, setFileName] = useState('Sample markdown');
    const [options, setOptions] = useState<MarkdownPrintOptions>(defaultMarkdownPrintOptions);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewHtml = useMemo(() => renderMarkdownToHtml(markdown), [markdown]);

    const updateOption = <Key extends keyof MarkdownPrintOptions>(key: Key, value: MarkdownPrintOptions[Key]) => {
        setOptions((currentOptions) => ({
            ...currentOptions,
            [key]: value
        }));
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setMarkdown(String(reader.result ?? ''));
            setFileName(file.name);
        };
        reader.readAsText(file);
    };

    const printMarkdown = () => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const documentToPrint = iframe.contentWindow?.document;

        if (!documentToPrint || !iframe.contentWindow) {
            document.body.removeChild(iframe);
            return;
        }

        documentToPrint.open();
        documentToPrint.write(buildPrintableDocument(markdown, options));
        documentToPrint.close();
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        window.setTimeout(() => document.body.removeChild(iframe), 1000);
    };

    return (
        <ToolPage title="Markdown Print Layout">
            <ToolDescription>
                Render a markdown file as a clean printable document with generous line spacing and a wide right margin
                for handwritten comments.
            </ToolDescription>

            <style>
                {`
                .markdown-print-preview h1,
                .markdown-print-preview h2,
                .markdown-print-preview h3,
                .markdown-print-preview h4,
                .markdown-print-preview h5,
                .markdown-print-preview h6 {
                    font-family: Arial, Helvetica, sans-serif;
                    font-weight: 700;
                    line-height: 1.25;
                    margin: 0 0 0.8em;
                }

                .markdown-print-preview p,
                .markdown-print-preview ul,
                .markdown-print-preview ol,
                .markdown-print-preview blockquote,
                .markdown-print-preview pre,
                .markdown-print-preview table {
                    margin: 0 0 1.2em;
                }

                .markdown-print-preview ul,
                .markdown-print-preview ol {
                    padding-left: 1.5em;
                }

                .markdown-print-preview li {
                    margin-bottom: 0.35em;
                }

                .markdown-print-preview blockquote {
                    border-left: 2px solid #9ca3af;
                    color: #374151;
                    padding-left: 1em;
                }

                .markdown-print-preview pre {
                    border: 1px solid #d1d5db;
                    font-size: 0.88em;
                    line-height: 1.5;
                    padding: 0.8em;
                    white-space: pre-wrap;
                }

                .markdown-print-preview code {
                    font-family: "Courier New", monospace;
                }

                .markdown-print-preview table {
                    border-collapse: collapse;
                    width: 100%;
                }

                .markdown-print-preview th,
                .markdown-print-preview td {
                    border: 1px solid #d1d5db;
                    padding: 0.35em 0.5em;
                    text-align: left;
                    vertical-align: top;
                }
                `}
            </style>

            <div className="w-full space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr] gap-6 items-start">
                    <section className="card space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Markdown</h2>
                                <p className="text-sm text-gray-500">{fileName}</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".md,.markdown,text/markdown,text/plain"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button
                                type="button"
                                className="btn-secondary inline-flex items-center gap-2"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FiUpload className="h-4 w-4" />
                                Upload
                            </button>
                        </div>

                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-2">Markdown source</span>
                            <textarea
                                value={markdown}
                                onChange={(event) => {
                                    setMarkdown(event.target.value);
                                    setFileName('Pasted markdown');
                                }}
                                className="w-full min-h-[360px] font-mono text-sm"
                                spellCheck="false"
                            />
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="block text-sm font-medium text-gray-700 mb-2">Paper</span>
                                <select
                                    value={options.paperSize}
                                    onChange={(event) => updateOption('paperSize', event.target.value as PaperSize)}
                                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                                >
                                    <option value="A4">A4</option>
                                    <option value="Letter">Letter</option>
                                </select>
                            </label>

                            <label className="block">
                                <span className="block text-sm font-medium text-gray-700 mb-2">
                                    Font size: {options.fontSizePt} pt
                                </span>
                                <input
                                    type="range"
                                    min="9"
                                    max="14"
                                    step="1"
                                    value={options.fontSizePt}
                                    onChange={(event) => updateOption('fontSizePt', Number(event.target.value))}
                                    className="w-full accent-yellow-600"
                                />
                            </label>

                            <label className="block">
                                <span className="block text-sm font-medium text-gray-700 mb-2">
                                    Line spacing: {options.lineHeight.toFixed(1)}
                                </span>
                                <input
                                    type="range"
                                    min="1.4"
                                    max="3"
                                    step="0.1"
                                    value={options.lineHeight}
                                    onChange={(event) => updateOption('lineHeight', Number(event.target.value))}
                                    className="w-full accent-yellow-600"
                                />
                            </label>

                            <label className="block">
                                <span className="block text-sm font-medium text-gray-700 mb-2">
                                    Right margin: {options.rightMarginMm} mm
                                </span>
                                <input
                                    type="range"
                                    min="30"
                                    max="90"
                                    step="1"
                                    value={options.rightMarginMm}
                                    onChange={(event) => updateOption('rightMarginMm', Number(event.target.value))}
                                    className="w-full accent-yellow-600"
                                />
                            </label>
                        </div>

                        <button
                            type="button"
                            className="btn-primary inline-flex items-center gap-2"
                            onClick={printMarkdown}
                        >
                            <FiPrinter className="h-4 w-4" />
                            Print
                        </button>
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg font-semibold text-gray-900">Print preview</h2>
                            <p className="text-sm text-gray-500">Right margin is reserved for comments.</p>
                        </div>
                        <div className="w-full overflow-auto rounded-lg border border-gray-200 bg-gray-100 p-4">
                            <article
                                className="markdown-print-preview mx-auto min-h-[720px] bg-white text-gray-900"
                                style={{
                                    width: options.paperSize === 'A4' ? '794px' : '816px',
                                    maxWidth: '100%',
                                    paddingTop: `${options.topBottomMarginMm * 2.4}px`,
                                    paddingBottom: `${options.topBottomMarginMm * 2.4}px`,
                                    paddingLeft: `${options.leftMarginMm * 2.4}px`,
                                    paddingRight: `${options.rightMarginMm * 2.4}px`,
                                    fontFamily: 'Georgia, "Times New Roman", serif',
                                    fontSize: `${options.fontSizePt * 1.333}px`,
                                    lineHeight: options.lineHeight
                                }}
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </div>
                    </section>
                </div>
            </div>
        </ToolPage>
    );
}
