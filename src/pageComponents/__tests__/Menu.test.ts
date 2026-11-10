import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import Menu from '../Menu';

afterEach(() => vi.unstubAllGlobals());

it('keeps the scrollable mobile navigation within the visible viewport', () => {
    vi.stubGlobal('document', { location: { pathname: '/' } });
    const html = renderToStaticMarkup(createElement(Menu, { tools: [] }));
    const navigation = html.match(/<nav class="([^"]+)"/)?.[1];
    expect(navigation).toContain('h-dvh');
    expect(navigation).toContain('overflow-y-auto');
    expect(navigation).toContain('md:h-screen');
});
