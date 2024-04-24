import { ToolComponent } from '../types/ToolComponent';

export default function Menu(props: { tools: ToolComponent[] }) {
    return (
        <nav className="w-1/8 p-4 mr-8 bg-gray-800 text-white h-screen">
            <h1 className="text-3xl font-normal mb-4">The Right Tool</h1>
            <ul className="space-y-2">
                {props.tools.map(({ meta }) => (
                    <li key={meta.route} className="p-2 rounded hover:bg-gray-900 bg-gray-600 hover:text-yellow-300">
                        <a href={meta.route} className="text-yellow-500">{meta.name}</a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
