/**
 * Converts any data to a pretty JSON string
 * 
 * @param data any data to be converted to a pretty JSON
 * @returns a pretty JSON string
 */
export default function toPrettyJSON(data: unknown) {
    return JSON.stringify(data, null, 4);
}
