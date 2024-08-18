import React from 'react';
import { Play, SkipBack, SkipForward, Repeat, Shuffle, Mic2, Volume2, Maximize2 } from "lucide-react";
const PlayerComponent: React.FC = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row items-center">
            <img src="/api/placeholder/60/60" alt="Current track" className="w-16 h-16 object-cover rounded-lg mr-4 mb-4 sm:mb-0" />
            <div className="flex-1 text-center sm:text-left mb-4 sm:mb-0">
                <h3 className="font-bold">Butterfly Effect</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Travis Scott</p>
            </div>
            <div className="flex items-center mb-4 sm:mb-0">
                <button className="mx-2"><SkipBack size={20} /></button>
                <button className="mx-2 bg-blue-500 rounded-full p-2"><Play size={24} /></button>
                <button className="mx-2"><SkipForward size={20} /></button>
            </div>
            <div className="flex-1 mx-4 w-full sm:w-auto">
                <div className="flex items-center">
                    <span className="text-sm mr-2">2:45</span>
                    <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="w-1/3 h-full bg-blue-500 rounded-full"></div>
                    </div>
                    <span className="text-sm ml-2">4:02</span>
                </div>
            </div>
            <div className="flex items-center">
                <button className="mx-2"><Mic2 size={20} /></button>
                <button className="mx-2"><Repeat size={20} /></button>
                <button className="mx-2"><Shuffle size={20} /></button>
                <button className="mx-2"><Volume2 size={20} /></button>
                <button className="mx-2"><Maximize2 size={20} /></button>
            </div>
        </div>
    );
};

export default PlayerComponent;