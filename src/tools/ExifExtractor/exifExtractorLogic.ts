import { parseMetadata } from "@uswriting/exiftool";

// Define a type for the expected EXIF data structure
export type ExifData = Record<string, unknown>[];

/**
 * Extracts EXIF metadata from an image file.
 * @param file The image file to process.
 * @returns A promise that resolves with the extracted EXIF data or an error message.
 */
export async function extractExifDataFromFile(
    file: File
): Promise<{ data: ExifData | null; error: string | null }> {
    try {
        // Specify ExifData as the expected type T for the 'data' field in the result
        const exifResult = await parseMetadata<ExifData>(file, {
            args: ["-json"], // Ask exiftool to output JSON
            // Transform the raw string output (which should be JSON) into the ExifData type
            transform: (data: string): ExifData => JSON.parse(data),
        });

        // Check the success flag from the exifResult object
        if (exifResult.success && exifResult.data) {
            // Return the actual data payload
            return { data: exifResult.data, error: null };
        } else {
            // Use the error message from the exifResult object
            return {
                data: null,
                error: exifResult.error || "Failed to extract EXIF data.",
            };
        }
    } catch (err) {
        if (err instanceof Error) {
            return {
                data: null,
                error: err.message || "Failed to extract EXIF data.",
            };
        } else {
            return {
                data: null,
                error: "An unknown error occurred during EXIF extraction.",
            };
        }
    }
}
