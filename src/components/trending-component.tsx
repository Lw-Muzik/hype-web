import React from "react";
import { Heart } from 'lucide-react';
// TrendingHits Component
type TrendingHitsProps = {};

export default function TrendingHitsComponent(props: TrendingHitsProps) {
    return (
        <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Trending New Hits</h2>
            <div className="flex flex-col md:flex-row items-center">
                <div className="mr-0 md:mr-8 mb-4 md:mb-0">
                    <h1 className="text-4xl md:text-6xl font-bold mb-2">In My Feelings</h1>
                    <p className="text-xl mb-4">Camila Cabello <span className="text-gray-600 dark:text-gray-400">63Million Plays</span></p>
                    <button className="bg-blue-500 text-white px-6 py-2 rounded-full mr-4">Listen Now</button>
                    <button className="text-gray-800 dark:text-white border border-gray-800 dark:border-white rounded-full p-2"><Heart size={20} /></button>
                </div>
                <img src="/api/placeholder/300/300" alt="Artist" className="w-64 h-64 object-cover rounded-lg" />
            </div>
        </section>
    );
};