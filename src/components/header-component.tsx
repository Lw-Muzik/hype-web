import React from "react";
import { Clock, Music, Sun, Moon } from "lucide-react";
interface HeaderProps {
    toggleTheme: () => void;
    isDarkMode: boolean;
}

// Header Component
const HeaderComponent: React.FC<HeaderProps> = ({ toggleTheme, isDarkMode }) => {
    return (
        <header className="flex justify-between items-center mb-8">
            <div className="relative">
                <input type="text" placeholder="Type here to search" className="bg-gray-100 dark:bg-gray-800 rounded-full py-2 px-4 w-64" />
                <Music className="absolute right-3 top-2.5 text-gray-400" size={20} />
            </div>
            <div className="flex items-center">
                <button onClick={toggleTheme} className="mr-4">
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <div className="mr-4 relative">
                    <div className="w-3 h-3 bg-blue-500 rounded-full absolute -top-1 -right-1"></div>
                    <Clock className="text-gray-600 dark:text-gray-400" size={20} />
                </div>
                <img src="/api/placeholder/40/40" alt="User" className="w-10 h-10 rounded-full" />
            </div>
        </header>
    );
};
export default HeaderComponent;