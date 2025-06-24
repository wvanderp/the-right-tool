import { describe, it, expect } from "vitest";
import { extractExifDataFromFile } from "../exifExtractorLogic";
import fs from "fs";
import path from "path";

describe("ExifExtractor Logic", () => {
    it("should correctly extract EXIF data from a sample image", async () => {
        // Create a File object from the test image
        const imagePath = path.join(
            __dirname,
            "2023-08-04_Saemangeum_temp_phone_mast_with_climber_-_WSJ_2023.jpg"
        );
        const imageBuffer = fs.readFileSync(imagePath);
        const imageFile = new File(
            [imageBuffer],
            "2023-08-04_Saemangeum_temp_phone_mast_with_climber_-_WSJ_2023.jpg",
            { type: "image/jpeg" }
        );

        // Extract EXIF data from the image
        const { data, error } = await extractExifDataFromFile(imageFile);

        // Check that there is no error
        expect(error).toBeNull();

        // Check that data is not null
        expect(data).not.toBeNull();

        // Make sure we have EXIF data in the expected format
        expect(Array.isArray(data)).toBeTruthy();
        expect(data!.length).toBeGreaterThan(0);

        // Check for some common EXIF properties that should exist
        const exifData = data![0];
        expect(exifData).toHaveProperty("FileName");
        expect(exifData.FileName).toBe(
            "2023-08-04_Saemangeum_temp_phone_mast_with_climber_-_WSJ_2023.jpg"
        );

        // Take a snapshot of the entire EXIF data structure
        // This will create a snapshot file to compare against in future test runs
        expect(data).toMatchSnapshot();
    });

    it("should handle errors when file is not an image", async () => {
        // Create a non-image file
        const textFile = new File(["This is not an image"], "test.txt", {
            type: "text/plain",
        });

        // Try to extract EXIF data
        const { data } = await extractExifDataFromFile(textFile);

        // Should return file-level metadata for a text file
        expect(Array.isArray(data)).toBeTruthy();
        expect(data).toHaveLength(1);
        expect(data?.[0].FileType).toBe("TXT");
        expect(data?.[0].FileName).toBe("test.txt");
        // Error may be null or a warning, depending on exiftool's output
    });
});
