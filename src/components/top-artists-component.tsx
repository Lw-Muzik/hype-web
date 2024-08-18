import React from 'react';

interface Artist {
    name: string;
    plays: number;
}
const TopArtistsComponent: React.FC = () => {
    // TopArtists Component
    const artists: Artist[] = [
        { name: 'Travis Scott', plays: 44 },
        { name: 'Billie Eilish', plays: 40 },
        { name: 'This Kid', plays: 36 },
        { name: 'Kanye', plays: 32 },
        { name: 'Nicki Minaj', plays: 28 },
        { name: 'Starboy', plays: 24 }
    ];

    return (
        <section className="mb-12">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Top Artists</h2>
                <a href="#" className="text-blue-500">See all</a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {artists.map((artist, index) => (
                    <div key={index} className="text-center">
                        <img src={`/api/placeholder/100/100`} alt={artist.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                        <p className="text-sm">{artist.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{artist.plays}M Plays</p>
                    </div>
                ))}
            </div>
        </section>
    );


};

export default TopArtistsComponent;