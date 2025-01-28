import { ToolComponent } from '../types/ToolComponent';

export default function Menu(props: { tools: ToolComponent[] }) {
    const currentPath = document.location.pathname;

    return (
        <nav className="w-64 p-6 mr-8 bg-gray-900 text-white h-screen border-r border-gray-700">
            <a href="/" className="block">
                <h1 className="text-2xl font-medium mb-8 text-white hover:text-yellow-400">
                    The right tool
                </h1>
            </a>
            <ul className="space-y-0.5">
                {props.tools.map(({ meta }) => (
                    <a key={meta.name} href={`${meta.route}`}>
                        <li key={meta.route} 
                            className={`px-4 py-3 border-l-2 
                                ${currentPath === meta.route 
                                    ? 'border-yellow-400 bg-gray-800 text-yellow-400 font-medium' 
                                    : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white hover:border-gray-600'
                                }`}>
                            {meta.name}
                        </li>
                    </a>
                ))}
            </ul>
        </nav>
    );
}
