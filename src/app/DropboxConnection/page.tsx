"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Dropbox, DropboxAuth } from 'dropbox';
import { Play, Pause, SkipBack, SkipForward, BarChart2, Volume2, Settings, Folder, Save, Loader, Moon, Sun, Upload, File, LucideUpload } from 'lucide-react';
import * as mm from 'music-metadata-browser';
import * as THREE from 'three';
declare module 'react' {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        webkitdirectory?: string;
        directory?: string;
    }
}
const DROPBOX_APP_KEY = process.env.APP_KEY;
// // Place this at the top of your file or in a separate types file

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
// threejs visualizer interface
interface VisualizerOption {
    name: string;
    setup: (scene: THREE.Scene) => void;
    update: (audioData: Uint8Array) => void;
}
interface DropboxFolder {
    name: string;
    path: string;
}

interface Preset {
    name: string;
    values: number[];
}
// local files interface
interface LocalFolder {
    name: string;
    files: File[];
}
interface LocalAudioFile extends AudioFile {
    file: File;
}

// 
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
    <div className={`relative w-full h-1 bg-gray-600 rounded-full ${className}`}>
        <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <input
            type="range"
            min={min}
            max={max}
            step={0.01}
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
        { name: 'Normal', values: [3.3, 2.0, 1.0, 0.0, 0.0, 1.0, 2.3, 2.6, 2.0, 3.0], },

        { name: 'Flat', values: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], },

        { name: 'Loud', values: [-2.9, -2.9, 2.4, 3.6, 4.7, 4.7, 6.0, 6.0, 3.0, 3.0], },

        { name: 'Pop', values: [1.5, 4.5, 5.8, 3.0, 1.5, 0.0, 0.0, 0.0, 1.5, 3.0], },

        { name: 'Techno', values: [5.8, 5.8, 0.1, -2.8, -2.2, 0.0, 3.6, 7.4, 7.7, 7.5], },

        { name: 'Dance', values: [5.8, 3.1, 2.1, 0.0, 0.0, -2.6, -2.0, -2.2, -0.6, 0.1], },

        { name: 'Bass', values: [7.5, 5.8, 3.9, 0.0, -1.5, -0.0, 0.0, 0.0, 0.0, 0.0], },

        { name: 'Rock', values: [5.8, 3.2, 1.3, -3.0, -2.3, 2.2, 3.6, 5.8, 5.8, 5.8], },

        { name: 'Reggae', values: [5.8, 5.8, 3.0, 0.0, -1.5, -1.5, -0.0, 1.5, 5.8, 5.8], },

        { name: 'SoftTreble', values: [0.0, 0.0, -4.4, -4.5, -4.5, -4.5, -3.0, -0.0, 4.5, 4.5], },

        { name: 'SoftBass', values: [3.0, 3.0, 3.0, 0.0, -3.0, -3.0, -0.0, 0.0, 0.0, 0.0], },

        { name: 'Classic', values: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -3.0, -3.0, -3.0, -4.5], },

        { name: 'Treble', values: [13.5, -3.0, -3.0, -3.0, -1.5, -1.5, -0.0, 6.3, 9.6, 12.3], },

        { name: 'Live', values: [-4.5, -3.8, 2.2, 2.2, 2.2, 2.2, 2.1, 1.5, 1.5, 1.5], },

        { name: 'Folk', values: [-4.5, -4.5, -1.5, 1.5, 4.5, 4.5, 1.5, 0.0, -4.5, -6.0], },

        { name: 'BassTreble', values: [5.8, 5.8, 3.0, 0.0, -1.5, 0.0, 1.5, 1.5, 5.8, 5.8], }
    ]);
    const [localFolders, setLocalFolders] = useState<LocalFolder[]>([]);
    const [localAudioFiles, setLocalAudioFiles] = useState<LocalAudioFile[]>([]);
    const [currentSource, setCurrentSource] = useState<'dropbox' | 'local'>('dropbox');


    const [currentPreset, setCurrentPreset] = useState<string>('Flat');
    const [newPresetName, setNewPresetName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

    // visualizer switchers
    const [currentVisualizer, setCurrentVisualizer] = useState<string>('bars');
    const [showVisualizer, setShowVisualizer] = useState<boolean>(true);
    const [audioContextReady, setAudioContextReady] = useState<boolean>(false);
    const [nextTrack, setNextTrack] = useState<AudioFile | null>(null);
    // 
    // -> visualizer options
    const visualizerContainerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const visualizerMeshRef = useRef<THREE.Mesh | null>(null);
    // --> end
    const audioRef = useRef<HTMLAudioElement>(null);
    const nextAudioRef = useRef<HTMLAudioElement>(null);
    const cacheRef = useRef<{ [key: string]: string }>({});
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const gainNodesRef = useRef<GainNode[]>([]);
    const convolutionNodeRef = useRef<ConvolverNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // ref to handle file upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    // ... (previous refs remain the same)
    const crossfadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // trigger the 3D engine to activate
    useEffect(() => {
        if (visualizerContainerRef.current && !rendererRef.current) {
            const width = visualizerContainerRef.current.clientWidth;
            const height = visualizerContainerRef.current.clientHeight;

            rendererRef.current = new THREE.WebGLRenderer({ alpha: true });
            rendererRef.current.setSize(width, height);
            visualizerContainerRef.current.appendChild(rendererRef.current.domElement);

            sceneRef.current = new THREE.Scene();
            cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            cameraRef.current.position.z = 5;

            visualizers[currentVisualizer].setup(sceneRef.current);

            const animate = () => {
                requestAnimationFrame(animate);
                if (analyserNodeRef.current && sceneRef.current && cameraRef.current && rendererRef.current) {
                    const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
                    analyserNodeRef.current.getByteFrequencyData(dataArray);

                    visualizers[currentVisualizer].update(dataArray);

                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
            };
            animate();
        }

        return () => {
            if (rendererRef.current && visualizerContainerRef.current) {
                // Check if the renderer's DOM element is still a child of the container
                if (visualizerContainerRef.current.contains(rendererRef.current.domElement)) {
                    visualizerContainerRef.current.removeChild(rendererRef.current.domElement);
                }
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            if (sceneRef.current) {
                // Clear the scene
                while (sceneRef.current.children.length > 0) {
                    sceneRef.current.remove(sceneRef.current.children[0]);
                }
                sceneRef.current = null;
            }
            if (visualizerMeshRef.current) {
                visualizerMeshRef.current.geometry.dispose();
                (visualizerMeshRef.current.material as THREE.Material).dispose();
                visualizerMeshRef.current = null;
            }
        };
    }, [currentVisualizer])

    // visualisation settings

    const visualizers: { [key: string]: VisualizerOption } = {
        bars: {
            name: 'Bars',
            setup: (scene) => {
                const geometry = new THREE.BufferGeometry();
                const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
                visualizerMeshRef.current = new THREE.Mesh(geometry, material);
                scene.add(visualizerMeshRef.current);
            },
            update: (audioData) => {
                if (visualizerMeshRef.current) {
                    const positions = [];
                    for (let i = 0; i < audioData.length; i++) {
                        const x = (i / audioData.length) * 10 - 5;
                        const y = (audioData[i] / 255) * 5;
                        positions.push(x, y, 0);
                        positions.push(x, 0, 0);
                    }
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                    visualizerMeshRef.current.geometry = geometry;
                }
            },
        },
        wave: {
            name: 'Wave',
            setup: (scene) => {
                const geometry = new THREE.BufferGeometry();
                const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                visualizerMeshRef.current = new THREE.Mesh(geometry, material);
                scene.add(visualizerMeshRef.current);
            },
            update: (audioData) => {
                if (visualizerMeshRef.current) {
                    const positions = [];
                    for (let i = 0; i < audioData.length; i++) {
                        const x = (i / audioData.length) * 10 - 5;
                        const y = (audioData[i] / 255) * 2 - 1;
                        positions.push(x, y, 0);
                    }
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                    visualizerMeshRef.current.geometry = geometry;
                }
            },
        },
        circular: {
            name: 'Circular',
            setup: (scene) => {
                const geometry = new THREE.BufferGeometry();
                const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                visualizerMeshRef.current = new THREE.Mesh(geometry, material);
                scene.add(visualizerMeshRef.current);
            },
            update: (audioData) => {
                if (visualizerMeshRef.current) {
                    const positions = [];
                    for (let i = 0; i < audioData.length; i++) {
                        const angle = (i / audioData.length) * Math.PI * 2;
                        const radius = (audioData[i] / 255) * 2 + 1;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        positions.push(x, y, 0);
                    }
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                    visualizerMeshRef.current.geometry = geometry;
                }
            },
        },
    };
    useEffect(() => {
        if (audioContextReady && audioRef.current && !audioContextRef.current) {
            initializeAudioContext();
        }
    }, [audioContextReady]);

    const initializeAudioContext = () => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current!);

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

        // Initialize visualizer
        if (visualizerContainerRef.current && !rendererRef.current) {
            initializeVisualizer();
        }
    };

    const initializeVisualizer = () => {
        const width = visualizerContainerRef.current!.clientWidth;
        const height = visualizerContainerRef.current!.clientHeight;

        rendererRef.current = new THREE.WebGLRenderer({ alpha: true });
        rendererRef.current.setSize(width, height);
        visualizerContainerRef.current!.appendChild(rendererRef.current.domElement);

        sceneRef.current = new THREE.Scene();
        cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        cameraRef.current.position.z = 5;

        visualizers[currentVisualizer].setup(sceneRef.current);

        const animate = () => {
            requestAnimationFrame(animate);
            if (analyserNodeRef.current && sceneRef.current && cameraRef.current && rendererRef.current) {
                const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
                analyserNodeRef.current.getByteFrequencyData(dataArray);

                visualizers[currentVisualizer].update(dataArray);

                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();
    };

    const changeVisualizer = (visualizerName: string) => {
        if (sceneRef.current) {
            if (visualizerMeshRef.current) {
                sceneRef.current.remove(visualizerMeshRef.current);
                visualizerMeshRef.current.geometry.dispose();
                (visualizerMeshRef.current.material as THREE.Material).dispose();
                visualizerMeshRef.current = null;
            }
            setCurrentVisualizer(visualizerName);
            visualizers[visualizerName].setup(sceneRef.current);
        }
    };
    // end of visual settings

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
        audioContextRef.current?.resume();
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
    // controls
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
            audioRef.current.addEventListener('ended', handleTrackEnd);
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
                audioRef.current.removeEventListener('ended', handleTrackEnd);
            }
        };
    }, [audioRef.current]);



    const handleTrackEnd = () => {
        if (nextTrack) {
            playTrack(nextTrack, audioFiles.findIndex(file => file.path === nextTrack.path));
        } else {
            handleNextTrack();
        }
    };
    useEffect(() => {
        return () => {
            // Cleanup function
            if (audioRef.current) {
                audioRef.current.pause();
                if (audioRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioRef.current.src);
                }
            }
            if (nextAudioRef.current) {
                nextAudioRef.current.pause();
                if (nextAudioRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(nextAudioRef.current.src);
                }
            }
        };
    }, []);
    const startCrossfade = () => {
        if (nextTrack && audioRef.current && nextAudioRef.current) {
            const fadeOutDuration = crossfadeTime * 1000;
            const fadeInterval = 50;
            let currentTime = 0;

            crossfadeIntervalRef.current = setInterval(() => {
                currentTime += fadeInterval;
                const progress = currentTime / fadeOutDuration;

                if (audioRef.current) audioRef.current.volume = Math.max(volume * (1 - progress), 0);
                if (nextAudioRef.current) nextAudioRef.current.volume = Math.min(volume * progress, volume);

                if (currentTime >= fadeOutDuration) {
                    clearInterval(crossfadeIntervalRef.current!);
                    crossfadeIntervalRef.current = null;
                    if (audioRef.current) audioRef.current.pause();

                    // Instead of swapping refs, update the current audio
                    if (audioRef.current && nextAudioRef.current) {
                        audioRef.current.src = nextAudioRef.current.src;
                        audioRef.current.currentTime = nextAudioRef.current.currentTime;
                        audioRef.current.volume = volume;
                        audioRef.current.play();

                        // Reset the next audio
                        nextAudioRef.current.pause();
                        nextAudioRef.current.src = '';
                    }

                    setCurrentTrack(nextTrack);
                    setNextTrack(null);
                }
            }, fadeInterval);

            nextAudioRef.current.play();
        }
    };

    const playTrack = async (track: AudioFile, index: number) => {
        if (!audioContextReady) {
            setAudioContextReady(true);
        }
        setIsLoading(true);

        try {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            let url = track ? track.path : "";

            if (currentSource === 'dropbox' && !cacheRef.current[track.path]) {
                const accessToken = localStorage.getItem('dropboxAccessToken');
                if (accessToken) {
                    const dbx = new Dropbox({ accessToken });
                    const { result } = await dbx.filesDownload({ path: track.path });
                    const blob = (result as any).fileBlob;
                    url = URL.createObjectURL(blob);
                    cacheRef.current[track.path] = url;
                }
            }

            if (isPlaying && audioRef.current) {
                // Prepare next track for crossfade
                if (nextAudioRef.current) {
                    nextAudioRef.current.src = url;
                    nextAudioRef.current.volume = 0;
                    setNextTrack(track);
                }
            } else {
                if (audioRef.current) {
                    audioRef.current.src = url;
                    audioRef.current.volume = volume;
                    await audioRef.current.play();
                    setCurrentTrack(track);
                    setIsPlaying(true);
                }
            }
            // Prepare the next track
            const nextIndex = (index + 1) % audioFiles.length;
            setNextTrack(audioFiles[nextIndex]);
        } catch (error) {
            console.error('Error playing track:', error);
            setError('Failed to play the track. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    // ---------------
    const checkDropboxConnection = () => {
        const accessToken = localStorage.getItem('dropboxAccessToken');
        if (accessToken) {
            setIsConnected(true);
            fetchFolders(accessToken);
        }
    };

    const connectToDropbox = () => {
        const dbx = new DropboxAuth({ fetch: fetch });
        dbx.setClientId(DROPBOX_APP_KEY as string);
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
    // const playTrack = async (track: AudioFile, index: number) => {
    //     if (!audioContextReady) {
    //         setAudioContextReady(true);
    //     }
    //     setIsLoading(true);
    //     if (audioRef.current && nextAudioRef.current) {
    //         let url = track.path;

    //         if (currentSource === 'dropbox' && !cacheRef.current[track.path]) {
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
    //             // Crossfade logic
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
    //     if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
    //         await audioContextRef.current.resume();
    //     }
    //     setIsLoading(false);
    // };

    const togglePlayPause = async () => {
        if (!audioContextReady) {
            setAudioContextReady(true);
        }

        try {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    await audioRef.current.play();
                }
                setIsPlaying(!isPlaying);
            }
        } catch (error) {
            console.error('Error toggling play/pause:', error);
            setError('Failed to play/pause. Please try again.');
        }
    };

    const handleNextTrack = () => {
        const currentIndex = audioFiles.findIndex(file => file.path === currentTrack?.path);
        const nextIndex = (currentIndex + 1) % audioFiles.length;
        playTrack(audioFiles[nextIndex], nextIndex);
    };

    const handlePreviousTrack = () => {
        const currentIndex = audioFiles.findIndex(file => file.path === currentTrack?.path);
        const previousIndex = (currentIndex - 1 + audioFiles.length) % audioFiles.length;
        playTrack(audioFiles[previousIndex], previousIndex);
    };


    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration);

            // Start crossfade when approaching the end of the track
            if (audioRef.current.duration - audioRef.current.currentTime <= crossfadeTime && nextTrack && !crossfadeIntervalRef.current) {
                startCrossfade();
            }
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
    // handling local files
    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const folderName = files[0].webkitRelativePath.split('/')[0];
            const audioFiles = Array.from(files).filter(file =>
                file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|flac)$/i)
            );

            const newFolder: LocalFolder = { name: folderName, files: audioFiles };
            setLocalFolders(prev => [...prev, newFolder]);

            await fetchLocalAudioFiles(newFolder);
        }
    };

    const fetchLocalAudioFiles = async (folder: LocalFolder) => {
        setIsLoading(true);
        try {
            const audioFiles = await Promise.all(folder.files.map(async (file) => {
                const metadata = await mm.parseBlob(file);
                return {
                    name: file.name,
                    path: URL.createObjectURL(file),
                    size: file.size,
                    artist: metadata.common.artist || 'Unknown Artist',
                    album: metadata.common.album || 'Unknown Album',
                    title: metadata.common.title || 'Unknown Title',
                    imageUrl: metadata.common.picture && metadata.common.picture.length > 0
                        ? URL.createObjectURL(new Blob([metadata.common.picture[0].data], { type: metadata.common.picture[0].format }))
                        : '/api/placeholder/300/300',
                    duration: metadata.format.duration || 0,
                    file: file
                };
            }));
            setLocalAudioFiles(audioFiles);
            setAudioFiles(audioFiles);
            setCurrentFolder(folder.name);
            setError(null);
            setCurrentSource('local');
        } catch (err) {
            console.error('Error fetching local audio files:', err);
            setError('Failed to process local audio files. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
                    <>
                        <h2 className="text-md font-semibold mt-4 mb-2">Local Files</h2>
                        <Button onClick={() => fileInputRef.current?.click()} className="mb-2">
                            <LucideUpload size={25} className="mr-2" />

                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            webkitdirectory=""
                            directory=""
                            onChange={handleFileImport}
                            style={{ display: 'none' }}
                        />
                        <ul className="space-y-2">
                            {localFolders.map((folder, index) => (
                                <li
                                    key={index}
                                    className={`flex items-center p-2 rounded cursor-pointer ${currentFolder === folder.name && currentSource === 'local' ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                                    onClick={() => fetchLocalAudioFiles(folder)}
                                >
                                    <Folder size={20} className="mr-2" />
                                    <span>{folder.name}</span>
                                </li>
                            ))}
                        </ul>

                    </>
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
                    {/* ui to render our 3d code */}
                    {showVisualizer && (
                        <div
                            ref={visualizerContainerRef}
                            className="absolute inset-0 pointer-events-none"
                            style={{ zIndex: 1 }}
                        ></div>
                    )}
                    {/* end of 3D rendering */}
                </div>
            </div>
            <div className="bg-gray-200 dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                        <Button onClick={() => setShowVisualizer(!showVisualizer)}>
                            <BarChart2 size={20} />
                        </Button>
                        {Object.keys(visualizers).map((name) => (
                            <Button
                                key={name}
                                onClick={() => changeVisualizer(name)}
                                className={currentVisualizer === name ? 'bg-blue-700 dark:bg-blue-800' : ''}
                            >
                                {visualizers[name].name}
                            </Button>
                        ))}
                    </div>
                </div>
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
                            className="w-96"
                        />
                        <span className="text-white dark:text-muted">{Math.floor(volume * 100)}%</span>
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

                            max={20}
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
                            <div key={index} className="flex flex-col items-center">
                                <input
                                    type="range"
                                    min="-18"
                                    step="0.01"
                                    max="18"
                                    value={equalizer[index]}
                                    onChange={(e) => handleEqualizerChange(index, Number(e.target.value))}
                                    className="w-6 h-24 appearance-none bg-gray-700 rounded-full outline-none"
                                    style={{
                                        // writingMode: 'bt-lr',
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
                crossOrigin='anonymous'
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleNextTrack}
            />
            <audio ref={nextAudioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleNextTrack}
                crossOrigin='anonymous' />
            <canvas ref={canvasRef} className="absolute pointer-events-none w-full h-64 bottom-0" />
        </div>
    );
};

export default Page;