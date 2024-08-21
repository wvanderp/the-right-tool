# JSONToGEOJSON

In this document, we will introduce JSONToGEOJSON, a tool designed to convert JSON files to GEOJSON files. We will explain the history of this tool, the decisions that were made, and we will write down ideas for future improvements.

## History

This tool came about because a lot of geo data is stored in plain JSON files. This is not a problem, but getting this working in GIS software is difficult. This tool was created to convert JSON files to GEOJSON files.

One of the limitations of other tools is their inability to select the key that indicates the latitude and longitude. This tool, however, allows you to choose the key indicating the latitude and longitude, providing you with more control and flexibility in your data manipulation.

## Decisions

While the most basic case only needs the latitude and longitude key, there are some cases where the information is deeper in the JSON file. This is why we allowed the user to use JSONPath to select the latitude and longitude keys. The choice for JSONPath was semi-arbitrary because I don't have a favorite library for this.

## Future improvements

- Add support for other JSON query languages, like JMESPath or JSONiq.
- Support other in- and output formats, like CSV or shapefiles.
- Give a dropdown of all the keys in the object
