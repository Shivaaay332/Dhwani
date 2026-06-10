'use client';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, ChevronDown, Maximize2, Download, Volume2, Sliders, AlignLeft, X, Heart, Share2, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

// Deployment Fix: Dynamic API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dhwani-api.onrender.com';

export default function Player() {
    const { currentTrack, isPlaying, togglePlay, setPlaying, nextTrack, prevTrack, isFullScreen, toggleFullScreen, isShuffle, toggleShuffle, loopMode, toggleLoop, showToast } = usePlayerStore();
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState('0:00');
    const [duration, setDuration] = useState('0:00');
    const [volume, setVolume] = useState(1);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    const [showEQ, setShowEQ] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [lyrics, setLyrics] = useState('');
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [bass, setBass] = useState(0);
    const [treble, setTreble] = useState(0);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const bassFilterRef = useRef<BiquadFilterNode | null>(null);
    const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    
    // VERCEL TYPE ERROR FIX: null add kar diya
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (currentTrack) {
            axios.get(`${API_URL}/api/favorites`).then(res => {
                setIsLiked(res.data.data.some((s: any) => s.songId === currentTrack.id || s.songId === currentTrack.songId));
            }).catch(() => {});
        }
    }, [currentTrack]);

    const handleLikeCurrent = async () => {
        if (!currentTrack) return;
        try {
            if (isLiked) {
                await axios.delete(`${API_URL}/api/favorites/${currentTrack.id || currentTrack.songId}`);
                setIsLiked(false);
                showToast("Removed from Liked Songs");
            } else {
                await axios.post(`${API_URL}/api/favorites`, {
                    songId: String(currentTrack.id || currentTrack.songId), title: currentTrack.title, artist: currentTrack.artist, image: currentTrack.image, url: currentTrack.url
                });
                setIsLiked(true);
                showToast("Added to Liked Songs ❤️");
            }
        } catch (err) {}
    };

    const handleShare = () => {
        if (!currentTrack) return;
        setShowMenu(false);
        if (navigator.share) {
            navigator.share({ title: `Listen to ${currentTrack.title}`, text: `Check out ${currentTrack.title} by ${currentTrack.artist}`, url: currentTrack.url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(currentTrack.url);
            showToast("Song link copied to clipboard!");
        }
    };

    const initWebAudio = () => {
        if (!audioRef.current || audioCtxRef.current) return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
            analyserRef.current = audioCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            bassFilterRef.current = audioCtxRef.current.createBiquadFilter();
            bassFilterRef.current.type = 'lowshelf'; bassFilterRef.current.frequency.value = 200;
            trebleFilterRef.current = audioCtxRef.current.createBiquadFilter();
            trebleFilterRef.current.type = 'highshelf'; trebleFilterRef.current.frequency.value = 3000;
            sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
            sourceRef.current.connect(bassFilterRef.current); bassFilterRef.current.connect(trebleFilterRef.current);
            trebleFilterRef.current.connect(analyserRef.current); analyserRef.current.connect(audioCtxRef.current.destination);
        } catch (err) {}
    };

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5; let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgb(${barHeight + 25 * (i / bufferLength)}, ${250 * (i / bufferLength)}, 50)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
        animationRef.current = requestAnimationFrame(drawVisualizer);
    };

    useEffect(() => {
        if (isPlaying) {
            initWebAudio();
            if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
            audioRef.current?.play().catch(() => setPlaying(false));
            drawVisualizer();
        } else {
            audioRef.current?.pause();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, [isPlaying, currentTrack]);

    useEffect(() => {
        if (currentTrack && 'mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrack.title, artist: currentTrack.artist,
                artwork: [{ src: currentTrack.image, sizes: '512x512', type: 'image/jpeg' }]
            });
            navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
            navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
            navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
            navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
        }
    }, [currentTrack, nextTrack, prevTrack, setPlaying]);

    const fetchLyrics = async () => {
        if (!currentTrack) return;
        setShowLyrics(true); 
        setLyricsLoading(true); 
        setShowMenu(false);

        let cleanArtist = currentTrack.artist.split(/,|&|feat\./i)[0].trim();
        let cleanTitle = currentTrack.title.replace(/\[.*?\]|\(.*?\)/g, "").trim();

        try {
            const res = await axios.get(`https://api.lyrics.ovh/v1/${cleanArtist}/${cleanTitle}`);
            setLyrics(res.data.lyrics || "Lyrics not found.");
        } catch { 
            setLyrics(`Lyrics not found in global database for:\n${cleanTitle} by ${cleanArtist}\n\n(This might be an instrumental track or not available in the public lyrics API)`); 
        }
        setLyricsLoading(false);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const cur = audioRef.current.currentTime; const dur = audioRef.current.duration || 0;
            setProgress(dur > 0 ? (cur / dur) * 100 : 0);
            setCurrentTime(`${Math.floor(cur / 60)}:${Math.floor(cur % 60).toString().padStart(2, '0')}`);
        }
    };

    const triggerDownload = async () => {
        if (!currentTrack) return;
        setIsDownloading(true); setShowMenu(false); showToast("Starting Download...");
        try {
            const res = await fetch(currentTrack.url);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Dhwani_${currentTrack.title.replace(/\s+/g, '_')}.m4a`; a.click();
            URL.revokeObjectURL(url);
            showToast("Download Complete!");
        } catch { showToast("Download failed due to server restrictions."); }
        setIsDownloading(false);
    };

    if (!currentTrack) return null;

    return (
        <>
            <div className={`fixed bottom-16 md:bottom-0 left-0 right-0 h-16 md:h-24 bg-zinc-950/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-4 md:px-6 z-40 transition-transform duration-500 md:ml-64 ${isFullScreen ? 'translate-y-[200%]' : 'translate-y-0'}`}>
                <div className="flex items-center gap-3 w-1/2 md:w-1/3 cursor-pointer" onClick={toggleFullScreen}>
                    <img src={currentTrack.image} className="w-10 h-10 md:w-14 md:h-14 rounded-lg object-cover shadow-2xl" alt="cover" />
                    <div className="overflow-hidden flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs md:text-sm font-bold truncate text-white max-w-[100px] md:max-w-[200px]">{currentTrack.title}</h4>
                            {isPlaying && (
                                <div className="flex items-end gap-[2px] h-3">
                                    <div className="w-[3px] bg-fuchsia-500 rounded-full animate-[wave_1s_ease-in-out_infinite]"></div>
                                    <div className="w-[3px] bg-fuchsia-500 rounded-full animate-[wave_1s_ease-in-out_infinite_0.2s]"></div>
                                    <div className="w-[3px] bg-fuchsia-500 rounded-full animate-[wave_1s_ease-in-out_infinite_0.4s]"></div>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] md:text-xs text-zinc-400 truncate max-w-[120px] md:max-w-[200px] mt-0.5">{currentTrack.artist}</p>
                    </div>
                </div>

                <div className="hidden md:flex flex-col items-center gap-2 w-1/3">
                    <div className="flex items-center gap-6">
                        <button onClick={prevTrack} className="text-zinc-400 hover:text-white"><SkipBack size={20} fill="currentColor" /></button>
                        <button onClick={togglePlay} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button onClick={nextTrack} className="text-zinc-400 hover:text-white"><SkipForward size={20} fill="currentColor" /></button>
                    </div>
                    <div className="flex items-center gap-3 w-full text-[11px] text-zinc-500 font-mono">
                        <span>{currentTime}</span>
                        <input type="range" value={progress} onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = (parseFloat(e.target.value) / 100) * (audioRef.current.duration || 0); }} className="flex-1 h-1 bg-white/10 rounded-full appearance-none accent-fuchsia-500 cursor-pointer" min="0" max="100" />
                        <span>{duration}</span>
                    </div>
                </div>

                <div className="flex md:hidden items-center gap-4">
                    <button onClick={togglePlay} className="text-white">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    <button onClick={nextTrack} className="text-zinc-400"><SkipForward size={24} fill="currentColor" /></button>
                </div>

                <div className="hidden md:flex justify-end gap-5 w-1/3 text-zinc-400">
                    <button onClick={handleShare} className="hover:text-white transition"><Share2 size={18} /></button>
                    <button onClick={toggleFullScreen} className="hover:text-white transition"><Maximize2 size={18} /></button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 md:hidden">
                    <div className="h-full bg-fuchsia-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className={`fixed inset-0 bg-black z-50 transition-all duration-500 flex flex-col p-6 md:p-8 ${isFullScreen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <img src={currentTrack.image} className="w-full h-full object-cover blur-[80px] opacity-30 scale-150" alt="bg" />
                </div>
                <div className="relative z-10 flex flex-col h-full max-w-md md:max-w-2xl mx-auto w-full pt-8 md:pt-0">
                    <header className="flex justify-between items-center mb-6 relative">
                        <button onClick={toggleFullScreen} className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-full text-white"><ChevronDown size={24} /></button>
                        <span className="text-[10px] md:text-xs font-black tracking-widest uppercase opacity-40 text-zinc-300">Dhwani Pro</span>
                        <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)} className="p-2 md:p-3 rounded-full bg-white/5 hover:bg-white/10 text-white"><MoreVertical size={20} /></button>
                            {showMenu && (
                                <div className="absolute right-0 top-12 bg-zinc-900 border border-white/10 rounded-xl p-2 w-48 shadow-2xl z-50 flex flex-col gap-1">
                                    <button onClick={triggerDownload} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-sm font-bold text-left text-white"><Download size={16} /> Download</button>
                                    <button onClick={() => { setShowEQ(!showEQ); setShowMenu(false); }} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-sm font-bold text-left text-white"><Sliders size={16} /> Equalizer</button>
                                    <button onClick={fetchLyrics} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-sm font-bold text-left text-white"><AlignLeft size={16} /> Show Lyrics</button>
                                    <button onClick={handleShare} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-sm font-bold text-left text-white"><Share2 size={16} /> Share Link</button>
                                </div>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 flex flex-col items-center justify-center w-full relative mt-4 md:mt-0">
                        <canvas ref={canvasRef} className="absolute bottom-10 w-full h-32 opacity-50 z-0 pointer-events-none" width="800" height="150" />
                        {!showLyrics && !showEQ && (
                            <>
                                <div className="relative w-64 md:w-80 aspect-square shadow-2xl rounded-[32px] overflow-hidden border border-white/10 z-10">
                                    <img src={currentTrack.image} className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-95'}`} alt="cover" />
                                </div>
                                <div className="text-center w-full px-4 mt-8 z-10">
                                    <h2 className="text-2xl md:text-3xl font-black text-white truncate">{currentTrack.title}</h2>
                                    <p className="text-base md:text-lg text-zinc-400 mt-1 truncate">{currentTrack.artist}</p>
                                </div>
                            </>
                        )}
                        {showEQ && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-[32px] p-6 md:p-8 flex flex-col justify-center border border-white/10 z-20">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-lg md:text-xl font-black text-fuchsia-500">Equalizer</h3>
                                    <button onClick={() => setShowEQ(false)} className="bg-white/10 p-2 rounded-full text-white"><X size={16}/></button>
                                </div>
                                <div className="space-y-8">
                                    <div>
                                        <div className="flex justify-between mb-2"><label className="font-bold text-sm text-white">Bass Boost</label><span className="text-fuchsia-500 text-sm">{bass} dB</span></div>
                                        <input type="range" min="-10" max="20" step="1" value={bass} onChange={(e) => { const v = parseFloat(e.target.value); setBass(v); if(bassFilterRef.current) bassFilterRef.current.gain.value = v; }} className="w-full h-2 rounded-full appearance-none accent-fuchsia-500" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2"><label className="font-bold text-sm text-white">Treble</label><span className="text-fuchsia-500 text-sm">{treble} dB</span></div>
                                        <input type="range" min="-10" max="20" step="1" value={treble} onChange={(e) => { const v = parseFloat(e.target.value); setTreble(v); if(trebleFilterRef.current) trebleFilterRef.current.gain.value = v; }} className="w-full h-2 rounded-full appearance-none accent-fuchsia-500" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {showLyrics && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-[32px] p-8 overflow-y-auto border border-white/10 z-20 scrollbar-hide">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-fuchsia-500">Live Lyrics</h3>
                                    <button onClick={() => setShowLyrics(false)} className="bg-white/10 p-2 rounded-full text-white"><X size={16}/></button>
                                </div>
                                {lyricsLoading ? <p className="animate-pulse text-white">Syncing...</p> : <p className="text-xl md:text-2xl font-bold leading-relaxed whitespace-pre-wrap text-white">{lyrics}</p>}
                            </div>
                        )}
                    </div>

                    <footer className="w-full flex flex-col gap-6 pb-4 md:pb-8 mt-auto z-10">
                        <div className="flex justify-between items-center px-2">
                            <button onClick={handleLikeCurrent} className={`transition ${isLiked ? 'text-fuchsia-500 drop-shadow-[0_0_8px_#d946ef]' : 'text-white/40 hover:text-white'}`}><Heart size={28} fill={isLiked ? "currentColor" : "none"} /></button>
                            <div className="flex items-center gap-2">
                                <Volume2 size={16} className="text-zinc-500" />
                                <input type="range" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }} min="0" max="1" step="0.01" className="w-20 h-1 bg-white/10 rounded-full appearance-none accent-white" />
                            </div>
                        </div>
                        <div>
                            <input type="range" value={progress} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = (parseFloat(e.target.value) / 100) * (audioRef.current.duration || 0); }} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white" min="0" max="100" />
                            <div className="flex justify-between text-[10px] md:text-xs text-zinc-500 font-mono mt-2"><span>{currentTime}</span><span>{duration}</span></div>
                        </div>
                        <div className="flex justify-between items-center px-2 md:px-4">
                            <button onClick={toggleShuffle} className={isShuffle ? 'text-fuchsia-500' : 'text-white/40'}><Shuffle size={20} /></button>
                            <button onClick={prevTrack} className="text-white/80 active:scale-90 transition"><SkipBack size={32} fill="currentColor" /></button>
                            <button onClick={togglePlay} className="w-20 h-20 bg-white active:scale-95 transition-all rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                            </button>
                            <button onClick={nextTrack} className="text-white/80 active:scale-90 transition"><SkipForward size={32} fill="currentColor" /></button>
                            <button onClick={toggleLoop} className={loopMode > 0 ? 'text-fuchsia-500' : 'text-white/40'}><Repeat size={20} /></button>
                        </div>
                    </footer>
                </div>
            </div>
            <style jsx global>{`
                @keyframes wave { 0% { height: 4px; } 100% { height: 16px; } }
            `}</style>
            <audio ref={audioRef} src={currentTrack.url} crossOrigin="anonymous" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(`${Math.floor((audioRef.current?.duration || 0) / 60)}:${Math.floor((audioRef.current?.duration || 0) % 60).toString().padStart(2, '0')}`)} onEnded={nextTrack} />
        </>
    );
}