"use client"
import React from 'react';
// Genres Component
const GenresComponent: React.FC = () => {
    const genres: string[] = ['Dance Beat', 'Electro Pop', 'Alternative Indie', 'Hip Hop', 'Classical Period', 'Hip Hop Rap'];

    return (
        <section className="mb-12">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Genres</h2>
                <a href="#" className="text-blue-500">See all</a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {genres.map((genre, index) => (
                    <div key={index} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                        <p>{genre}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};
export default GenresComponent;
