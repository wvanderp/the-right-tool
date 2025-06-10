import { useState, useMemo } from "react";
import ToolPage from "../../components/ToolPage";
import ToolDescription from "../../components/ToolDescription";
import { compareLists, parseList, formatList } from "./listComparisonLogic";

export default function ListComparisonTool() {
    const [listAInput, setListAInput] = useState("");
    const [listBInput, setListBInput] = useState("");

    const result = useMemo(() => {
        const listA = parseList(listAInput);
        const listB = parseList(listBInput);
        return compareLists(listA, listB);
    }, [listAInput, listBInput]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <ToolPage title="List Comparison Tool">
            <ToolDescription>
                Perform set operations on two lists of strings. Input your lists (one item per line)
                and see the intersection, differences, and symmetric difference in real-time.
            </ToolDescription>

            {/* Input Section */}
            <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Input Lists</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card">
                        <div className="flex items-center justify-between mb-3">
                            <label htmlFor="listA" className="text-sm font-medium text-gray-700">
                                List A
                            </label>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {parseList(listAInput).length} items
                            </span>
                        </div>
                        <textarea
                            id="listA"
                            value={listAInput}
                            onChange={(e) => setListAInput(e.target.value)}
                            className="w-full h-48 font-mono text-sm resize-none"
                            placeholder="Enter items, one per line..."
                        />
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between mb-3">
                            <label htmlFor="listB" className="text-sm font-medium text-gray-700">
                                List B
                            </label>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {parseList(listBInput).length} items
                            </span>
                        </div>
                        <textarea
                            id="listB"
                            value={listBInput}
                            onChange={(e) => setListBInput(e.target.value)}
                            className="w-full h-48 font-mono text-sm resize-none"
                            placeholder="Enter items, one per line..."
                        />
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Results</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Intersection */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-green-800">
                                    Intersection
                                </h3>
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                    {result.intersection.length} items
                                </span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(formatList(result.intersection))}
                                className="text-xs text-green-700 hover:text-green-800 bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition-custom"
                                type="button"
                            >
                                Copy
                            </button>
                        </div>
                        <textarea
                            value={formatList(result.intersection)}
                            readOnly
                            className="w-full h-32 p-3 border border-green-300 rounded-md bg-white font-mono text-sm resize-none"
                            placeholder="Items in both lists will appear here..."
                        />
                        <p className="text-xs text-green-700 mt-2">Items that exist in both List A and List B</p>
                    </div>

                    {/* A Only */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Only in A
                                </h3>
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    {result.leftDifference.length} items
                                </span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(formatList(result.leftDifference))}
                                className="text-xs text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-custom"
                                type="button"
                            >
                                Copy
                            </button>
                        </div>
                        <textarea
                            value={formatList(result.leftDifference)}
                            readOnly
                            className="w-full h-32 p-3 border border-blue-300 rounded-md bg-white font-mono text-sm resize-none"
                            placeholder="Items only in List A will appear here..."
                        />
                        <p className="text-xs text-blue-700 mt-2">Items that exist only in List A</p>
                    </div>

                    {/* B Only */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-orange-800">
                                    Only in B
                                </h3>
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                    {result.rightDifference.length} items
                                </span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(formatList(result.rightDifference))}
                                className="text-xs text-orange-700 hover:text-orange-800 bg-orange-100 hover:bg-orange-200 px-2 py-1 rounded transition-custom"
                                type="button"
                            >
                                Copy
                            </button>
                        </div>
                        <textarea
                            value={formatList(result.rightDifference)}
                            readOnly
                            className="w-full h-32 p-3 border border-orange-300 rounded-md bg-white font-mono text-sm resize-none"
                            placeholder="Items only in List B will appear here..."
                        />
                        <p className="text-xs text-orange-700 mt-2">Items that exist only in List B</p>
                    </div>

                    {/* Symmetric Difference */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-purple-800">
                                    Symmetric Difference
                                </h3>
                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                    {result.symmetricDifference.length} items
                                </span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(formatList(result.symmetricDifference))}
                                className="text-xs text-purple-700 hover:text-purple-800 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded transition-custom"
                                type="button"
                            >
                                Copy
                            </button>
                        </div>
                        <textarea
                            value={formatList(result.symmetricDifference)}
                            readOnly
                            className="w-full h-32 p-3 border border-purple-300 rounded-md bg-white font-mono text-sm resize-none"
                            placeholder="Items in either list but not both will appear here..."
                        />
                        <p className="text-xs text-purple-700 mt-2">Items that exist in either list but not in both</p>
                    </div>
                </div>
            </div>
        </ToolPage>
    );
}
