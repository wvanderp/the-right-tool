import React from "react";
import type { ExifData } from "./exifExtractorLogic";

interface ExifSummaryProps {
  exif: ExifData;
  imageFile?: File;
}

/**
 * Displays a summary of EXIF data: camera, exposure, location, and a thumbnail.
 * no labeling, no headings, just the data because the user can infer what it is from the format of the data.
 */
export default function ExifSummary({ exif, imageFile }: ExifSummaryProps) {
  // EXIF data is an array, usually with one object per file
  const data = exif && exif.length > 0 ? exif[0] : {};

  // Camera info
  const make = (data["Make"] as string) || "Unknown";
  const model = (data["Model"] as string) || "Unknown";

  // Exposure settings
  const exposureTime = data["ExposureTime"] || data["ShutterSpeedValue"] || "-";
  const fNumber = data["FNumber"] || data["ApertureValue"] || "-";
  const iso = data["ISO"] || data["ISOSpeedRatings"] || "-";

  // Location (GPS)
  const lat = data["GPSLatitude"] as number | undefined;
  const lon = data["GPSLongitude"] as number | undefined;
  const location = lat && lon ? `${lat}, ${lon}` : "Not available";

  // Date information
  const date = data["DateTimeOriginal"] as string | undefined;

  // Thumbnail (from file, not EXIF)
  const [thumbUrl, setThumbUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setThumbUrl(null);
  }, [imageFile]);

  return (
    <div className="bg-white border border-gray-200 rounded p-4 mt-4">
      <div className="flex flex-col gap-4">
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt="Thumbnail preview"
            className="w-full h-40 object-cover rounded border border-gray-300"
          />
        )}
        <div className="space-y-2">
          <div className="text-sm text-gray-900">
            {make} {model}
          </div>
          <div className="text-sm text-gray-900">
            {exposureTime !== "-" && <>{exposureTime} sec</>}{" "}
            {fNumber !== "-" && <>@ f/{fNumber}</>}{" "}
            {iso !== "-" && <>ISO {iso}</>}
          </div>{" "}
          <div className="text-sm text-gray-900">{location}</div>
          {date && <div className="text-sm text-gray-900">{date}</div>}
        </div>
      </div>
    </div>
  );
}
