# ICS to calendars

Many sites provide an ICS file to add something to our calendars. The problem is that our calendar apps (especially Google Calendar) do not support opening ICS files.

This tool reads the ICS files and provides a link to add them to Google Calendar.

You "upload" the ICS file to this tool, and it will parse the file and provide a relevant link to add the event to your calendar.

## History

I noticed this problem during phone presentation season. Big companies provide an ICS file to add their presentation to your calendar. But I can't add them to my Google Calendar. So, I created this tool.

I noticed that you can add ICS files to your calendar on Android. But this tool is still useful because I'm not always on my phone.

## Decisions

## Future improvements

First, here are some plans for this tool:

- parse the ICS file
- show the included events in a human-readable way
- let the user select the events they want to add to the calendar
- generate a link to add the selected events to the calendar

And now for some ideas for the future:

- Add support for other calendar apps like Outlook or Apple Calendar (I use Google Calendar myself, so I'm not that interested in this in the first round)
- Add support for other file formats like CSV or Excel files
- Download the ICS file
- having other export formats like CSV or Excel files
