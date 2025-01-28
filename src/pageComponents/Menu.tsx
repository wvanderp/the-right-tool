import { ToolComponent } from '../types/ToolComponent';

export default function Menu(props: { tools: ToolComponent[] }) {
    const currentPath = document.location.pathname;

    return (
        <nav className="w-1/8 p-4 mr-8 bg-gray-800 text-white h-screen">
            <a href="/">
                <h1 className="text-3xl font-normal mb-4">The right tool</h1>
            </a>
            <ul className="space-y-2">
                {props.tools.map(({ meta }) => (
                    <a key={meta.name} href={`${meta.route}`} className={`${currentPath === meta.route ? 'text-white' : 'text-yellow-500'}`}>
                        <li key={meta.route} className={`p-2 rounded hover:bg-gray-600 ${currentPath === meta.route ? 'bg-yellow-500' : 'bg-gray-900'} hover:text-yellow-300`}>
                            {meta.name}
                        </li>
                    </a>
                ))}
            </ul>
        </nav>
    );
}
