import packageJson from '../../package.json';
import githubLogo from '../../static/github-mark-white.svg';

export default function Footer() {
    const repoUrl = packageJson.repository.url;

    return (
        <footer className="w-full px-4 py-3 bg-gray-900 border-t border-gray-700">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm">
                <p className="text-center text-gray-300">
                    A webapp by
                    <a href="https://github.com/wvanderp" 
                       className="inline-block mx-1.5 text-yellow-600 hover:text-yellow-500 
                       transition-colors duration-200 hover:underline">
                        wvdp
                    </a>
                    &copy; {new Date().getFullYear()}
                </p>
                <p className="text-center sm:border-l border-gray-700 sm:pl-4 hidden sm:block text-gray-400">
                    Why use the wrong tool when you can use the right one?
                </p>
                <a href={repoUrl} 
                   className="p-1.5 rounded-full hover:bg-gray-800 transition-all duration-200
                   hover:scale-110 active:scale-95"
                   aria-label="View source on GitHub">
                    <img src={githubLogo} alt="" width="20" height="20" className="w-5 h-5"/>
                </a>
            </div>
        </footer>
    );
}
