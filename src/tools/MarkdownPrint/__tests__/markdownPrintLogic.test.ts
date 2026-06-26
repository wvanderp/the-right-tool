import { describe, expect, it } from 'vitest';
import { buildPrintableDocument, defaultMarkdownPrintOptions, renderMarkdownToHtml } from '../markdownPrintLogic';

describe('markdownPrintLogic', () => {
    describe('renderMarkdownToHtml', () => {
        it('renders common markdown blocks', () => {
            const html = renderMarkdownToHtml(`# Title

Paragraph with **bold** text.

- First
- Second`);

            expect(html).toContain('<h1>Title</h1>');
            expect(html).toContain('<p>Paragraph with <strong>bold</strong> text.</p>');
            expect(html).toContain('<ul><li>First</li><li>Second</li></ul>');
        });

        it('escapes unsafe html and blocks javascript links', () => {
            const html = renderMarkdownToHtml('[Bad](javascript:alert(1)) <script>alert(1)</script>');

            expect(html).toContain('<a href="#">Bad</a>');
            expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
            expect(html).not.toContain('<script>');
            expect(html).not.toContain('javascript:alert');
        });

        it('preserves fenced code content as escaped text', () => {
            const html = renderMarkdownToHtml('```\nconst value = "<tag>";\n```');

            expect(html).toContain('<pre><code>const value = &quot;&lt;tag&gt;&quot;;</code></pre>');
        });

        it('filters HTML comments outside fenced code blocks', () => {
            const html = renderMarkdownToHtml(`# Title

Visible text.
<!-- Hidden note -->

Before comment. <!-- Inline note --> After comment.
<!--
Hidden
multi-line note
-->

\`\`\`
<!-- Keep code comment -->
\`\`\``);

            expect(html).toContain('<h1>Title</h1>');
            expect(html).toContain('<p>Visible text.</p>');
            expect(html).toContain('<p>Before comment. After comment.</p>');
            expect(html).toContain('<pre><code>&lt;!-- Keep code comment --&gt;</code></pre>');
            expect(html).not.toContain('Hidden note');
            expect(html).not.toContain('Inline note');
            expect(html).not.toContain('multi-line note');
        });
    });

    describe('buildPrintableDocument', () => {
        it('uses the selected paper size, spacing, and comment margin', () => {
            const documentHtml = buildPrintableDocument('# Notes', {
                ...defaultMarkdownPrintOptions,
                paperSize: 'Letter',
                lineHeight: 2.1,
                rightMarginMm: 70
            });

            expect(documentHtml).toContain('size: Letter;');
            expect(documentHtml).toContain('margin: 18mm 70mm 18mm 20mm;');
            expect(documentHtml).toContain('line-height: 2.1;');
            expect(documentHtml).toContain('<h1>Notes</h1>');
        });
    });
});
