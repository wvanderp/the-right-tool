import packageJson from '../../package.json';
import githubLogo from '../../static/github-mark-white.svg';

export default function Footer() {
    const repoUrl = packageJson.repository.url;

    return (
        <footer className="w-full px-4 py-3 bg-gray-900">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm">
                <p className="text-center text-gray-300">
                    Built with ❤️ by
                    <a href="https://github.com/wvanderp" 
                       className="inline-block mx-1.5 text-yellow-600 hover:text-yellow-500 
                       transition-colors duration-200 hover:underline"
                       title="Visit creator's GitHub profile">
                        wvdp
                    </a>
                    &copy; {new Date().getFullYear()}
                </p>
                <p className="text-center sm:border-l sm:pl-4 hidden sm:block text-gray-400">
                    Why use the wrong tool when you can use the right one?
                </p>
                <a href={repoUrl} 
                   className="p-1.5 rounded-full hover:bg-gray-800 transition-all duration-200
                   hover:scale-110 active:scale-95"
                   title="View source code on GitHub"
                   aria-label="View project source code on GitHub">
                    <img src={githubLogo} alt="GitHub" width="20" height="20" className="w-5 h-5"/>
                </a>
            </div>
        </footer>
    );
}
