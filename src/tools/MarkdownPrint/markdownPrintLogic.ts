export type PaperSize = 'A4' | 'Letter';

export interface MarkdownPrintOptions {
    paperSize: PaperSize;
    fontSizePt: number;
    lineHeight: number;
    topBottomMarginMm: number;
    leftMarginMm: number;
    rightMarginMm: number;
}

export const defaultMarkdownPrintOptions: MarkdownPrintOptions = {
    paperSize: 'A4',
    fontSizePt: 11,
    lineHeight: 2.0,
    topBottomMarginMm: 18,
    leftMarginMm: 20,
    rightMarginMm: 80
};

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeHref(url: string): string {
    const trimmedUrl = url.trim();

    if (/^(https?:|mailto:|#|\/)/i.test(trimmedUrl)) {
        return escapeHtml(trimmedUrl);
    }

    return '#';
}

function renderInlineMarkdown(value: string): string {
    const codeSegments: string[] = [];
    let html = escapeHtml(value).replace(/`([^`]+)`/g, (_match, code: string) => {
        const index = codeSegments.length;
        codeSegments.push(`<code>${code}</code>`);
        return `@@CODE_SEGMENT_${index}@@`;
    });

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
        return `<a href="${sanitizeHref(url)}">${label}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return html.replace(/@@CODE_SEGMENT_(\d+)@@/g, (_match, index: string) => codeSegments[Number(index)]);
}

function renderList(lines: string[], ordered: boolean): string {
    const tagName = ordered ? 'ol' : 'ul';
    const items = lines
        .map((line) => line.replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/, ''))
        .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
        .join('');

    return `<${tagName}>${items}</${tagName}>`;
}

function renderTable(lines: string[]): string {
    const rows = lines.map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
    const [headers, , ...bodyRows] = rows;
    const headerHtml = headers.map((header) => `<th>${renderInlineMarkdown(header)}</th>`).join('');
    const bodyHtml = bodyRows
        .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`)
        .join('');

    return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function isTableStart(lines: string[], index: number): boolean {
    return Boolean(
        lines[index]?.includes('|') &&
        lines[index + 1] &&
        /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
    );
}

export function renderMarkdownToHtml(markdown: string): string {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: string[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];

        if (!line.trim()) {
            index += 1;
            continue;
        }

        if (line.trim().startsWith('```')) {
            const codeLines: string[] = [];
            index += 1;
            while (index < lines.length && !lines[index].trim().startsWith('```')) {
                codeLines.push(lines[index]);
                index += 1;
            }
            index += 1;
            blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
            continue;
        }

        const heading = /^(#{1,6})\s+(.+)$/.exec(line);
        if (heading) {
            const level = heading[1].length;
            blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
            index += 1;
            continue;
        }

        if (/^\s*([-*_])\s*\1\s*\1\s*$/.test(line)) {
            blocks.push('<hr>');
            index += 1;
            continue;
        }

        if (isTableStart(lines, index)) {
            const tableLines = [lines[index], lines[index + 1]];
            index += 2;
            while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
                tableLines.push(lines[index]);
                index += 1;
            }
            blocks.push(renderTable(tableLines));
            continue;
        }

        if (/^\s*[-*+]\s+/.test(line)) {
            const listLines: string[] = [];
            while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
                listLines.push(lines[index]);
                index += 1;
            }
            blocks.push(renderList(listLines, false));
            continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            const listLines: string[] = [];
            while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
                listLines.push(lines[index]);
                index += 1;
            }
            blocks.push(renderList(listLines, true));
            continue;
        }

        if (/^\s*>\s?/.test(line)) {
            const quoteLines: string[] = [];
            while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
                quoteLines.push(lines[index].replace(/^\s*>\s?/, ''));
                index += 1;
            }
            blocks.push(`<blockquote>${quoteLines.map(renderInlineMarkdown).join('<br>')}</blockquote>`);
            continue;
        }

        const paragraphLines = [line.trim()];
        index += 1;
        while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+/.test(lines[index])) {
            if (
                lines[index].trim().startsWith('```') ||
                /^\s*[-*+]\s+/.test(lines[index]) ||
                /^\s*\d+\.\s+/.test(lines[index]) ||
                /^\s*>\s?/.test(lines[index]) ||
                isTableStart(lines, index)
            ) {
                break;
            }
            paragraphLines.push(lines[index].trim());
            index += 1;
        }
        blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
    }

    return blocks.join('\n');
}

export function buildPrintableDocument(markdown: string, options: MarkdownPrintOptions): string {
    const renderedHtml = renderMarkdownToHtml(markdown);

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Printable Markdown</title>
<style>
@page {
    size: ${options.paperSize};
    margin: ${options.topBottomMarginMm}mm ${options.rightMarginMm}mm ${options.topBottomMarginMm}mm ${options.leftMarginMm}mm;
}
* {
    box-sizing: border-box;
}
body {
    color: #111827;
    font-family: Georgia, "Times New Roman", serif;
    font-size: ${options.fontSizePt}pt;
    line-height: ${options.lineHeight};
}
h1, h2, h3, h4, h5, h6 {
    break-after: avoid;
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.25;
    margin: 0 0 0.8em;
}
p, ul, ol, blockquote, pre, table {
    margin: 0 0 1.2em;
}
li {
    margin-bottom: 0.35em;
}
blockquote {
    border-left: 2px solid #9ca3af;
    color: #374151;
    padding-left: 1em;
}
pre {
    border: 1px solid #d1d5db;
    font-size: 0.88em;
    line-height: 1.5;
    padding: 0.8em;
    white-space: pre-wrap;
}
code {
    font-family: "Courier New", monospace;
}
table {
    border-collapse: collapse;
    width: 100%;
}
th, td {
    border: 1px solid #d1d5db;
    padding: 0.35em 0.5em;
    text-align: left;
    vertical-align: top;
}
a {
    color: #111827;
}
</style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
}
