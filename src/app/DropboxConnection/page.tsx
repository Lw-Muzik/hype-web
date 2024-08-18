"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Dropbox, DropboxAuth } from 'dropbox';
import { Play, Pause, SkipBack, SkipForward, Volume2, Settings, Folder, Save, Loader, Moon, Sun } from 'lucide-react';
import * as mm from 'music-metadata-browser';

const DROPBOX_APP_KEY = "YOUR_DROPBOX_APP_KEY";

interface AudioFile {
    name: string;
    path: string;
    size: number;
    artist?: string;
    album?: string;
    title?: string;
    imageUrl?: string;
    duration?: number;
}

interface DropboxFolder {
    name: string;
    path: string;
}

interface Preset {
    name: string;
    values: number[];
}

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => (
    <button
        className={`px-4 py-2 rounded-full bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${className}`}
        {...props}
    >
        {children}
    </button>
);
const MaterialSlider: React.FC<{
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    className?: string;
}> = ({ min, max, value, onChange, className }) => (
    <div className={`relative w-full h-2 bg-gray-600 rounded-full ${className}`}>
        <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
            className="absolute top-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-md transform -translate-y-1/2"
            style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 8px)` }}
        />
    </div>
);

const LoadingOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
        <Loader className="w-12 h-12 text-blue-500 animate-spin" />
    </div>
);

const Page: React.FC = () => {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [folders, setFolders] = useState<DropboxFolder[]>([]);
    const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
    const [currentFolder, setCurrentFolder] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [currentTrack, setCurrentTrack] = useState<AudioFile | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(1);
    const [crossfadeTime, setCrossfadeTime] = useState<number>(5);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [equalizer, setEqualizer] = useState<number[]>(new Array(10).fill(0));
    const [roomEffect, setRoomEffect] = useState<string>('none');
    const [presets, setPresets] = useState<Preset[]>([
        { name: 'Flat', values: new Array(10).fill(0) },
        { name: 'Bass Boost', values: [6, 5, 4, 3, 1, 0, 0, 0, 0, 0] },
        { name: 'Treble Boost', values: [0, 0, 0, 0, 0, 2, 3, 4, 5, 6] },
    ]);
    const [currentPreset, setCurrentPreset] = useState<string>('Flat');
    const [newPresetName, setNewPresetName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const nextAudioRef = useRef<HTMLAudioElement>(null);
    const cacheRef = useRef<{ [key: string]: string }>({});
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const gainNodesRef = useRef<GainNode[]>([]);
    const convolutionNodeRef = useRef<ConvolverNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);


    useEffect(() => {
        checkDropboxConnection();
        handleCallback();
        const darkModePreference = localStorage.getItem('darkMode');
        setIsDarkMode(darkModePreference === 'true');
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('darkMode', isDarkMode.toString());
    }, [isDarkMode]);
    useEffect(() => {
        if (audioRef.current && !audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);

            const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
            gainNodesRef.current = frequencies.map(freq => {
                const filter = audioContextRef.current!.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = 0;
                return filter;
            });

            sourceNodeRef.current.connect(gainNodesRef.current[0]);
            gainNodesRef.current.reduce((prev, curr) => {
                prev.connect(curr);
                return curr;
            });

            analyserNodeRef.current = audioContextRef.current.createAnalyser();
            analyserNodeRef.current.fftSize = 256;
            gainNodesRef.current[gainNodesRef.current.length - 1].connect(analyserNodeRef.current);
            analyserNodeRef.current.connect(audioContextRef.current.destination);
        }

        const animate = () => {
            if (analyserNodeRef.current && canvasRef.current) {
                const bufferLength = analyserNodeRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserNodeRef.current.getByteFrequencyData(dataArray);

                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                    const barWidth = canvasRef.current.width / bufferLength;
                    let x = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        const barHeight = dataArray[i] / 255 * canvasRef.current.height;
                        ctx.fillStyle = `hsl(${i / bufferLength * 360}, 100%, 50%)`;
                        ctx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
                        x += barWidth + 1;
                    }
                }
            }
            requestAnimationFrame(animate);
        };
        animate();
    }, [audioRef.current]);

    const checkDropboxConnection = () => {
        const accessToken = localStorage.getItem('dropboxAccessToken');
        if (accessToken) {
            setIsConnected(true);
            fetchFolders(accessToken);
        }
    };

    const connectToDropbox = () => {
        const dbx = new DropboxAuth({ fetch: fetch });
        dbx.setClientId(DROPBOX_APP_KEY);
        dbx.getAuthenticationUrl('http://localhost:3000/DropboxConnection').then((authUrl) => {
            window.location.href = authUrl as string;
        });
    };

    const handleCallback = () => {
        const urlParams = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = urlParams.get('access_token');
        if (accessToken) {
            localStorage.setItem('dropboxAccessToken', accessToken);
            setIsConnected(true);
            fetchFolders(accessToken);
        }
    };

    const fetchFolders = async (accessToken: string) => {
        setIsLoading(true);
        try {
            const dbx = new Dropbox({ accessToken });
            const response = await dbx.filesListFolder({ path: '' });
            const folders = response.result.entries
                .filter((entry) => entry['.tag'] === 'folder')
                .map((folder) => ({
                    name: folder.name,
                    path: folder.path_display || '',
                }));
            setFolders(folders);
            setError(null);
        } catch (err) {
            console.error('Error fetching folders:', err);
            setError('Failed to fetch folders. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAudioFiles = async (accessToken: string, path: string) => {
        setIsLoading(true);
        try {
            const dbx = new Dropbox({ accessToken });
            const response = await dbx.filesListFolder({ path });
            const audioFiles = await Promise.all(response.result.entries
                .filter((entry) => entry['.tag'] === 'file' && entry.name.match(/\.(mp3|wav|ogg|flac)$/i))
                .map(async (file) => {
                    const metadata = await fetchMetadata(dbx, file.path_display || '');
                    return {
                        name: file.name,
                        path: file.path_display || '',
                        size: (file as any).size || 0,
                        ...metadata
                    };
                }));
            setAudioFiles(audioFiles);
            setCurrentFolder(path);
            setError(null);
        } catch (err) {
            console.error('Error fetching audio files:', err);
            setError('Failed to fetch audio files. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMetadata = async (dbx: Dropbox, filePath: string) => {
        try {
            const { result } = await dbx.filesDownload({ path: filePath });
            const blob = (result as any).fileBlob;
            const metadata = await mm.parseBlob(blob);

            return {
                artist: metadata.common.artist || 'Unknown Artist',
                album: metadata.common.album || 'Unknown Album',
                title: metadata.common.title || 'Unknown Title',
                imageUrl: metadata.common.picture && metadata.common.picture.length > 0
                    ? URL.createObjectURL(new Blob([metadata.common.picture[0].data], { type: metadata.common.picture[0].format }))
                    : '/api/placeholder/300/300',
                duration: metadata.format.duration || 0
            };
        } catch (error) {
            console.error('Error fetching metadata:', error);
            return {
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                title: 'Unknown Title',
                imageUrl: '/api/placeholder/300/300',
                duration: 0
            };
        }
    };
    const playTrack = async (track: AudioFile, index: number) => {
        setIsLoading(true);
        if (audioRef.current && nextAudioRef.current) {
            let url = cacheRef.current[track.path];
            if (!url) {
                const accessToken = localStorage.getItem('dropboxAccessToken');
                if (accessToken) {
                    const dbx = new Dropbox({ accessToken });
                    const { result } = await dbx.filesDownload({ path: track.path });
                    const blob = (result as any).fileBlob;
                    url = URL.createObjectURL(blob);
                    cacheRef.current[track.path] = url;
                }
            }

            audioRef.current.src = url;
            audioRef.current.volume = volume;
            audioRef.current.play().catch(error => console.error("Playback failed", error));
            setIsPlaying(true);
            setCurrentTrack(track);
        }
        setIsLoading(false);
    };
    // const playTrack = async (track: AudioFile, index: number) => {
    //     setIsLoading(true);
    //     if (audioRef.current && nextAudioRef.current) {
    //         let url = cacheRef.current[track.path];
    //         if (!url) {
    //             const accessToken = localStorage.getItem('dropboxAccessToken');
    //             if (accessToken) {
    //                 const dbx = new Dropbox({ accessToken });
    //                 const { result } = await dbx.filesDownload({ path: track.path });
    //                 const blob = (result as any).fileBlob;
    //                 url = URL.createObjectURL(blob);
    //                 cacheRef.current[track.path] = url;
    //             }
    //         }

    //         if (isPlaying) {
    //             const fadeOutDuration = crossfadeTime * 1000;
    //             const fadeInterval = 50;
    //             let currentTime = 0;

    //             const fadeOutInterval = setInterval(() => {
    //                 currentTime += fadeInterval;
    //                 const newVolume = volume * (1 - (currentTime / fadeOutDuration));
    //                 if (audioRef.current) audioRef.current.volume = Math.max(newVolume, 0);
    //                 if (currentTime >= fadeOutDuration) {
    //                     clearInterval(fadeOutInterval);
    //                     if (audioRef.current) audioRef.current.pause();
    //                 }
    //             }, fadeInterval);

    //             nextAudioRef.current.src = url;
    //             nextAudioRef.current.volume = 0;
    //             nextAudioRef.current.play();

    //             const fadeInInterval = setInterval(() => {
    //                 currentTime += fadeInterval;
    //                 const newVolume = volume * (currentTime / fadeOutDuration);
    //                 if (nextAudioRef.current) nextAudioRef.current.volume = Math.min(newVolume, volume);
    //                 if (currentTime >= fadeOutDuration) {
    //                     clearInterval(fadeInInterval);
    //                     [audioRef.current, nextAudioRef.current] = [nextAudioRef.current, audioRef.current];
    //                 }
    //             }, fadeInterval);
    //         } else {
    //             audioRef.current.src = url;
    //             audioRef.current.volume = volume;
    //             audioRef.current.play();
    //         }
    //         setIsPlaying(true);
    //         setCurrentTrack(track);
    //     }
    //     setIsLoading(false);
    // };

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleNextTrack = () => {
        const currentIndex = audioFiles.findIndex(file => file.path === currentTrack?.path);
        if (currentIndex < audioFiles.length - 1) {
            playTrack(audioFiles[currentIndex + 1], currentIndex + 1);
        }
    };

    const handlePreviousTrack = () => {
        const currentIndex = audioFiles.findIndex(file => file.path === currentTrack?.path);
        if (currentIndex > 0) {
            playTrack(audioFiles[currentIndex - 1], currentIndex - 1);
        }
    };

    // const handleTimeUpdate = () => {
    //     if (audioRef.current) {
    //         setCurrentTime(audioRef.current.currentTime);

    // 
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const handleEqualizerChange = (index: number, value: number) => {
        const newEqualizer = [...equalizer];
        newEqualizer[index] = value;
        setEqualizer(newEqualizer);
        if (gainNodesRef.current[index]) {
            gainNodesRef.current[index].gain.setValueAtTime(value, audioContextRef.current!.currentTime);
        }
    };

    const handleRoomEffectChange = async (effect: string) => {
        setRoomEffect(effect);
        if (audioContextRef.current) {
            if (!convolutionNodeRef.current) {
                convolutionNodeRef.current = audioContextRef.current.createConvolver();
            }

            let impulseResponse: AudioBuffer | null = null;
            switch (effect) {
                case 'small-room':
                    impulseResponse = await (await fetch('/small-room-impulse.wav')).arrayBuffer()
                        .then(arrayBuffer => audioContextRef.current!.decodeAudioData(arrayBuffer));
                    break;
                case 'large-hall':
                    impulseResponse = await (await fetch('/large-hall-impulse.wav')).arrayBuffer()
                        .then(arrayBuffer => audioContextRef.current!.decodeAudioData(arrayBuffer));
                    break;
                case 'none':
                default:
                    impulseResponse = null;
                    break;
            }

            if (impulseResponse) {
                convolutionNodeRef.current.buffer = impulseResponse;
                gainNodesRef.current[gainNodesRef.current.length - 1].disconnect();
                gainNodesRef.current[gainNodesRef.current.length - 1].connect(convolutionNodeRef.current);
                convolutionNodeRef.current.connect(audioContextRef.current.destination);
            } else {
                gainNodesRef.current[gainNodesRef.current.length - 1].disconnect();
                gainNodesRef.current[gainNodesRef.current.length - 1].connect(audioContextRef.current.destination);
            }
        }
    };

    const handlePresetChange = (presetName: string) => {
        const preset = presets.find(p => p.name === presetName);
        if (preset) {
            setCurrentPreset(presetName);
            setEqualizer(preset.values);
            preset.values.forEach((value, index) => {
                if (gainNodesRef.current[index]) {
                    gainNodesRef.current[index].gain.setValueAtTime(value, audioContextRef.current!.currentTime);
                }
            });
        }
    };

    const handleSavePreset = () => {
        if (newPresetName) {
            const newPreset: Preset = {
                name: newPresetName,
                values: [...equalizer]
            };
            setPresets([...presets, newPreset]);
            setCurrentPreset(newPresetName);
            setNewPresetName('');
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const getDisplayTitle = (file: AudioFile) => {
        if (file.title && file.title !== 'Unknown Title') {
            return file.title;
        }
        return file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
    };

    return (
        <div className={`flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200`}>
            {isLoading && <LoadingOverlay />}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-64 p-4 bg-gray-200 dark:bg-gray-800 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold">Dropbox Music</h1>
                        <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-300 dark:bg-gray-700">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                    {!isConnected ? (
                        <Button onClick={connectToDropbox}>Connect to Dropbox</Button>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold mb-2">Folders</h2>
                            <ul className="space-y-2">
                                {folders.map((folder, index) => (
                                    <li
                                        key={index}
                                        className={`flex items-center p-2 rounded cursor-pointer ${currentFolder === folder.path ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                                        onClick={() => {
                                            const accessToken = localStorage.getItem('dropboxAccessToken');
                                            if (accessToken) fetchAudioFiles(accessToken, folder.path);
                                        }}
                                    >
                                        <Folder size={20} className="mr-2" />
                                        <span>{folder.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4">Tracks</h2>
                    {error && (
                        <div className="bg-red-500 text-white p-2 rounded mb-4">
                            {error}
                        </div>
                    )}
                    <ul className="space-y-2">
                        {audioFiles.map((file, index) => (
                            <li
                                key={index}
                                className={`flex items-center p-2 rounded cursor-pointer ${currentTrack?.path === file.path ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                                onClick={() => playTrack(file, index)}
                            >
                                <span className="w-8 text-right mr-4 text-gray-500">{String(index + 1).padStart(2, '0')}</span>
                                <img src={file.imageUrl} alt={file.album} className="w-12 h-12 mr-4 rounded" />
                                <div className="flex-1">
                                    <p className="font-semibold">{getDisplayTitle(file)}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{file.artist}</p>
                                </div>
                                <span className="text-gray-600 dark:text-gray-400 mr-4">{formatTime(file.duration || 0)}</span>
                                <Button className="text-gray-600 dark:text-gray-400 bg-transparent hover:bg-gray-300 dark:hover:bg-gray-700">
                                    <Play size={20} />
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="bg-gray-200 dark:bg-gray-800 p-4">
                <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                    <div className="flex items-center mb-4 md:mb-0">
                        {currentTrack && (
                            <>
                                <img src={currentTrack.imageUrl} alt={currentTrack.album} className="w-16 h-16 mr-4 rounded" />
                                <div>
                                    <p className="font-semibold">{getDisplayTitle(currentTrack)}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{currentTrack.artist} - {currentTrack.album}</p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <Button onClick={handlePreviousTrack}><SkipBack size={20} /></Button>
                        <Button onClick={togglePlayPause}>
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        </Button>
                        <Button onClick={handleNextTrack}><SkipForward size={20} /></Button>
                    </div>
                    <div className="flex items-center mt-4 md:mt-0">
                        <Volume2 size={20} className="mr-2" />
                        <MaterialSlider
                            min={0}
                            max={1}
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-24"
                        />
                    </div>
                    <Button onClick={() => setShowSettings(!showSettings)} className="mt-4 md:mt-0">
                        <Settings size={20} />
                    </Button>
                </div>
                <div className="flex items-center">
                    <span className="mr-2">{formatTime(currentTime)}</span>
                    <MaterialSlider
                        min={0}
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 mx-4"
                    />
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
            {showSettings && (
                <div className="absolute bottom-24 right-4 bg-gray-800 p-4 rounded shadow-lg">
                    <h3 className="text-lg font-semibold mb-2">Settings</h3>
                    <div className="flex items-center mb-2">
                        <label htmlFor="crossfade" className="mr-2">Crossfade Time (s):</label>
                        <input
                            id="crossfade"
                            type="number"
                            min={0}
                            max={10}
                            value={crossfadeTime}
                            onChange={(e) => setCrossfadeTime(Number(e.target.value))}
                            className="bg-gray-700 text-white px-2 py-1 rounded"
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="roomEffect" className="mr-2">Room Effect:</label>
                        <select
                            id="roomEffect"
                            value={roomEffect}
                            onChange={(e) => handleRoomEffectChange(e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded"
                        >
                            <option value="none">None</option>
                            <option value="small-room">Small Room</option>
                            <option value="large-hall">Large Hall</option>
                        </select>
                    </div>
                    <h4 className="text-md font-semibold mt-4 mb-2">Equalizer</h4>
                    <div className="mb-2">
                        <label htmlFor="preset" className="mr-2">Preset:</label>
                        <select
                            id="preset"
                            value={currentPreset}
                            onChange={(e) => handlePresetChange(e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded mr-2"
                        >
                            {presets.map(preset => (
                                <option key={preset.name} value={preset.name}>{preset.name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="New preset name"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded mr-2"
                        />
                        <Button onClick={handleSavePreset} className="px-2 py-1">
                            <Save size={16} />
                        </Button>
                    </div>
                    <div className="grid grid-cols-10 gap-2">
                        {[32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((freq, index) => (
                            <div key={freq} className="flex flex-col items-center">
                                <input
                                    type="range"
                                    min="-12"
                                    max="12"
                                    value={equalizer[index]}
                                    onChange={(e) => handleEqualizerChange(index, Number(e.target.value))}
                                    className="w-6 h-24 appearance-none bg-gray-700 rounded-full outline-none"
                                    style={{
                                        writingMode: 'bt-lr',
                                        WebkitAppearance: 'slider-vertical',
                                    }}
                                />
                                <span className="text-xs mt-1">{freq < 1000 ? freq : `${freq / 1000}k`}</span>
                            </div>
                        ))}
                    </div>
                    <Button onClick={() => setShowSettings(false)} className="mt-4">
                        Close
                    </Button>
                </div>
            )}
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleNextTrack}
            />
            <audio ref={nextAudioRef} />
            <canvas ref={canvasRef} className="absolute bottom-24 left-4 w-64 h-64" />
        </div>
    );
};

export default Page;