# JSONToGEOJSON

In this document, we will explain the history of this tool, the decisions that were made and write down ideas for future improvements.

## History

this tool came about because a lot of geo data is stored in plain JSON files. This is not a problem, but its difficult to get this working in GIS software. This tool was created to convert JSON files to GEOJSON files.

one of the this that was bothering me with other tools is that you cant select the key that indicates the latitude and longitude. This tool allows you to select the key that indicates the latitude and longitude.

## Decisions

while the most basic case only need the latitude and longitude key, there are some cases where the information is deeper in the JSON file. This is why we decided to allow the user to use JSONPath to select the latitude and longitude key. the choice for JSONPath was semi-arbitrary, because I don't have a favorite library for this.

## Future improvements

add support for other JSON query languages, like JMESPath or JSONiq.
add support of other in- and output formats, like CSV or shapefiles.
