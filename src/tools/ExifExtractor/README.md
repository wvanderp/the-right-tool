# EXIF Extractor Tool

The EXIF Extractor tool allows you to extract EXIF metadata from image files directly in your browser using the [@uswriting/exiftool](https://github.com/uswriting/exiftool) package. No data is uploaded to any server; all processing happens locally.

## Features

- Extracts EXIF metadata from images (JPEG, TIFF, and some RAW formats)
- Displays a summary card with camera, exposure, location, and a thumbnail preview
- Shows the full EXIF data as formatted JSON
- Lets you generate custom output using a Handlebars template (click "Show Template Editor" to reveal)
- Uses The Right Tool's design language and Tailwind CSS

## Usage

1. Select an image file using the file input. Extraction happens automatically—no need to click a button.
2. View the summary card with camera, exposure, location, and a thumbnail preview.
3. See the full extracted metadata as formatted JSON below the summary.
4. (Optional) Click "Show Template Editor" to create a custom output using a Handlebars template. The output updates automatically as you edit the template or upload a new image.

## Development

- Main component: `ExifExtractor.tsx`
- Summary component: `ExifSummary.tsx`
- Logic: `exifExtractorLogic.ts`
- Location: `src/tools/ExifExtractor/`
- Depends on: `@uswriting/exiftool`

## Example

```tsx
import ExifExtractor from "../tools/ExifExtractor/ExifExtractor";

function App() {
  return <ExifExtractor />;
}
```

## License

MIT License
