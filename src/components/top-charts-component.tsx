import React from 'react';

interface Song {
    title: string;
    artist: string;
}

const TopChartsComponent: React.FC = () => {
    // TopCharts Component

    const songs: Song[] = [
        { title: 'Havana', artist: 'Camila Cabello' },
        { title: 'Jesus is King', artist: 'Kanye West' },
        { title: 'Closer', artist: 'The Chainsmokers' },
        { title: 'Lean On', artist: 'Major Lazer ft DJ Snake' }
    ];

    return (
        <section className="mb-12">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Top Charts</h2>
                <a href="#" className="text-blue-500">See all</a>
            </div>
            <ul>
                {songs.map((song, index) => (
                    <li key={index} className="flex items-center mb-4">
                        <span className="mr-4">{index + 1}</span>
                        <img src={`/api/placeholder/40/40`} alt={song.title} className="w-10 h-10 object-cover rounded-lg mr-4" />
                        <div>
                            <p>{song.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{song.artist}</p>
                        </div>
                        <span className="ml-auto">3:45</span>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default TopChartsComponent;