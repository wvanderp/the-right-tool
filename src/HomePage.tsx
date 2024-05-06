import packageJson from '../package.json';
import logo from '../static/temp-logo.svg'; 

export default function HomePage() {
    const repoLink = packageJson.repository.url;

    return (
        <div className="flex flex-col items-center justify-center h-screen px-4 sm:px-0 text-center w-full lg:w-3/4 mx-auto">
            <img src={logo} alt="Logo" className="mb-4" /> 
            <h1 className="text-4xl font-bold">Welcome to The right tool</h1>
            <p className="text-md mt-2 max-w-2xl">
                Why use the wrong tool when you can use the right one?
            </p>
            <p className="text-lg mt-8 max-w-2xl">
                Your go-to destination for effortlessly transforming files and converting values.
                With a curated collection of powerful yet user-friendly tools, why settle for anything less than perfect results?
            </p>
            <p className="text-lg mt-4 max-w-2xl">
                You can find the source code for this project on{' '}
                <a href={repoLink} className="text-blue-500 hover:text-blue-700 underline">
                    GitHub
                </a>
                .
            </p>
        </div>
    );
}
