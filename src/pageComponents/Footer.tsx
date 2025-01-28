import packageJson from '../../package.json';
import githubLogo from '../../static/github-mark-white.svg';

export default function Footer() {
    const repoUrl = packageJson.repository.url;

    return (
        <footer className="w-full px-4 py-3 bg-gray-900 text-white fixed bottom-0">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-4 text-sm">
                <p className="text-center">
                    A webapp by
                    <a href="https://github.com/wvanderp" 
                       className="inline-block mx-1 text-blue-400 hover:text-blue-300 underline">
                        wvdp
                    </a>
                    &copy; {new Date().getFullYear()}
                </p>
                <p className="text-center border-l border-gray-600 pl-4">
                    Why use the wrong tool when you can use the right one?
                </p>
                <a href={repoUrl} 
                   className="hover:opacity-80 transition-opacity"
                   aria-label="View source on GitHub">
                    <img src={githubLogo} alt="" width="20" height="20" className="w-5 h-5"/>
                </a>
            </div>
        </footer>
    );
}
