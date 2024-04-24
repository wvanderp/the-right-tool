export default function Footer() {
    return (
        <footer className="w-full p-2 bg-gray-800 text-white fixed bottom-0">
            <p className="text-center text-sm">
                A webpage by 
                <a href="https://github.com/wvanderp" className="text-blue-500 hover:text-blue-700 underline ml-1">
                    wvdp
                </a>
                {` `} 
                &copy; {new Date().getFullYear()}
            </p>
        </footer>
    );
}
