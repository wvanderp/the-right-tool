import packageJson from '../package.json';
import logo from '../static/temp-logo.svg'; 

export default function HomePage() {
    const repoLink = packageJson.repository.url;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-16 text-center w-full max-w-7xl mx-auto">
            <img src={logo} alt="Logo" className="mb-6 w-24 h-24" /> 
            <h1 className="text-4xl font-bold text-gray-900 tracking-wide">Welcome to The right tool</h1>
            <p className="text-lg mt-3 text-gray-600 max-w-2xl">
                Why use the wrong tool when you can use the right one?
            </p>
            <p className="text-base mt-8 text-gray-600 max-w-2xl leading-relaxed">
                Your go-to destination for effortlessly transforming files and converting values.
                With a curated collection of powerful yet user-friendly tools, why settle for anything less than perfect results?
            </p>
            <p className="text-base mt-6 text-gray-600 max-w-2xl">
                You can find the source code for this project on{' '}
                <a href={repoLink} className="text-yellow-600 hover:text-yellow-700 hover:underline transition-colors duration-200">
                    GitHub
                </a>
                .
            </p>
        </div>
    );
}
