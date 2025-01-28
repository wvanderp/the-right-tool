import packageJson from '../../package.json';
import githubLogo from '../../static/github-mark-white.svg';

export default function Footer() {
    const repoUrl = packageJson.repository.url

    return (
        <footer className="w-full p-2 bg-gray-800 text-white fixed bottom-0 flex justify-center items-center">
            <p className="text-center text-sm">
                A webapp by 
                <a href="https://github.com/wvanderp" className="text-blue-500 hover:text-blue-700 underline ml-1">
                    wvdp
                </a>
                {` `} 
                &copy; {new Date().getFullYear()}
            </p>
            <p className="text-center text-sm ml-4">
                Why use the wrong tool when you can use the right one?
            </p>
            <a href={repoUrl} className="ml-4">
                <img src={githubLogo} alt="GitHub" width="24" height="24" style={{ fill: 'white' }}/>
            </a>
        </footer>
    );
}
