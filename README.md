# The Right Tool

Why use the wrong tool when you can use the right one?

Welcome to The Right Tool ([therighttool.dev](https://therighttool.dev/)), your go-to destination for effortlessly transforming files and converting values. With a curated collection of powerful yet user-friendly tools, why settle for anything less than perfect results?

## Available Tools

- **File Transfer**: Follow separate sending and receiving flows with animated QR codes, live feedback, and per-file packet grids. Two-way transfers adapt QR payload size and display speed to receiver measurements while fixed-size packets preserve progress. Files remain local to the devices.
- **ICS to Calendars**: Convert ICS calendar files to Google Calendar events.
- **JSON to GeoJSON**: Transform regular JSON data into GeoJSON format.
- **Weighted Distribution**: Distribute values across multiple items using percentage-based weights.
- **Handlebars**: Template rendering tool.
- **EXIF Extractor**: Extract EXIF metadata from image files directly in your browser.
- **List Comparison Tool**: Compare two lists to find intersections and differences.
- **Markdown Print Layout**: Render markdown as a printable document with extra line spacing, a wide right margin for comments, and filtered HTML comments.
- **Predictive Text Editor**: Generate contextual text continuations through OpenRouter and accept them one word at a time.
- **Vitamin Calculator**: Calculate supplement combinations and locally import or export supplements and requirements as one JSON backup.

## Contributing

The Right Tool is an open-source project. If you'd like to contribute or report issues, please visit our GitHub repository.

## Development

```bash
pnpm install
pnpm run dev
```

For testing:

```bash
pnpm test
```

## License

MIT License - See LICENSE file for details

Code formatting uses ESLint with @stylistic rules based on the older handwritten tools: four-space indentation, semicolons, and single quotes. Run pnpm format to apply fixes or pnpm format:check to check code. In VS Code, install the ESLint extension (dbaeumer.vscode-eslint) to apply fixes on save. EditorConfig provides whitespace defaults for other file types.

The mobile navigation uses the dynamic viewport height so its full tool list remains reachable while the browser address bar is visible or hidden.
