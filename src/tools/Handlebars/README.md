# Handlebars template

This tool is designed to streamline your work with handlebars templates. You can easily input the template, data, and any partials and helpers you need. The tool will then swiftly render the template and display the result, saving you valuable time and effort.

## History

When I needed to create wiki pages based on Excel files using handlebars, I didn't want to start a whole project. So, I developed this tool, which is adaptable to a variety of tasks and doesn't require a large-scale project.

## Decisions

I decided to use handlebars because it's what I always use.

One of the more controversial decisions is how I handle the partials and helpers. I decided to use a text box and just `eval` the content of the text box. This is not the most secure way of doing this, but it is the easiest way to do this. The most dangerous thing that can happen is that other future tools can be affected by the partials and helpers of this tool.

## Future improvements

- Find a way to make the partials and helpers save
- Add an easier way of editing the template and the data.
- Add more competent ways of exporting the result. like a download button or a way to copy the result to the clipboard.
