# List Tool (Better name needed)

This tool performs set operations on two lists of strings, similar to SQL joins. You input two lists of strings, and it returns:

- **Intersection**: Items that are in both lists.
- **Left Difference**: Items that are in the first list but not in the second.
- **Right Difference**: Items that are in the second list but not in the first.
- **Symmetric Difference**: Items that are in one list but not in the other.

## Use Cases and features

This tool is useful when integrating datasets or creating exhaustive lists of items. Common scenarios include:

- Checking if all items from a data source are in your list.
- Identifying items in your master list that need to be removed because they're no longer in the data source.
- Finding missing items between two datasets.
- Performing data reconciliation between different sources.

This tool has the following features:

- Real-time updates as you type.
- Handles empty lines gracefully.
- **Cross-platform line ending support**: Automatically handles different line ending formats (Unix `\n`, Windows `\r\n`, classic Mac `\r`, and reverse `\n\r`).
- Case-sensitive comparison.
- **Preserves duplicates**: If an item appears multiple times in a list, duplicates are maintained in the results.
- Export results as plain text.

## History

This is a problem I have often when I'm trying to integrate datasets or to create exhaustive lists of items. I have one data source and I need to check if all the items from the data source are in my list and if all the items in my list are in the data source. The second because if things are disbanded that I need to remove it from the master list.

## Decisions

## Future improvements
