"use client"
import React, { useState } from 'react';

import SidebarComponent from '@/components/sidebar-component';
import HeaderComponent from '@/components/header-component';
import TrendingHitsComponent from '../components/trending-component';
import PlayerComponent from '@/components/player-component';
import TopArtistsComponent from '@/components/top-artists-component';
import GenresComponent from '@/components/genre-components';
import TopChartsComponent from '@/components/top-charts-component';

// Main MusicStreamingUI Component
const MusicStreamingUI: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={`${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white min-h-screen flex flex-col">
        <div className="flex flex-1">
          <SidebarComponent isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
          <div className="flex-1 p-8 overflow-y-auto">
            <HeaderComponent toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
            <button className="md:hidden mb-4" onClick={toggleSidebar}>Toggle Sidebar</button>
            <TrendingHitsComponent />
            <TopArtistsComponent />
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 mr-0 md:mr-8 mb-8 md:mb-0">
                <GenresComponent />
              </div>
              <div className="w-full md:w-64">
                <TopChartsComponent />
              </div>
            </div>
          </div>
        </div>
        <PlayerComponent />
      </div>
    </div>
  );
};

export default MusicStreamingUI;