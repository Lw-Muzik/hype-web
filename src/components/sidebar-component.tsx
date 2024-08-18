import React from 'react';
// import { X } from 'lucide-react';


interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
}

// Sidebar Component
const SidebarComponent: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
    return (
        <div className={`bg-white dark:bg-gray-900 text-gray-800 dark:text-white w-64 p-6 flex flex-col fixed h-full transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
            <h1 className="text-2xl font-bold mb-8">Groovvy</h1>
            <nav className="mb-8">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">MENU</h2>
                <ul>
                    <li className="mb-2"><a href="#" className="text-blue-500">Explore</a></li>
                    <li className="mb-2"><a href="#" className="text-gray-600 dark:text-gray-400">Genres</a></li>
                    <li className="mb-2"><a href="#" className="text-gray-600 dark:text-gray-400">Albums</a></li>
                    <li className="mb-2"><a href="#" className="text-gray-600 dark:text-gray-400">Artists</a></li>
                    <li className="mb-2"><a href="#" className="text-gray-600 dark:text-gray-400">Radio</a></li>
                </ul>
            </nav>
            {/* ... (rest of the sidebar content) ... */}
        </div>
    );
};
export default SidebarComponent;