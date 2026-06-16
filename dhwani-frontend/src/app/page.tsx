'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Search, Heart, Music, Disc, Play, Pause, Plus, ListMusic, Trash2, Mic, User, Settings as SettingsIcon, LogOut, Download, Smartphone, Star, Edit3, Save, X, ChevronLeft } from 'lucide-react';
import Player from '@/components/Player';

// Deployment Fix: Dynamic API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dhwani-api.onrender.com';
const CATEGORIES = ["Trending", "Arijit Singh", "90s Hindi", "LoFi", "Punjabi", "Romantic"];

export default function Home() {
    const { user, login, logout, playTrack, currentTrack, isPlaying, deferredPrompt, setDeferredPrompt, toast, showToast, updateUser } = usePlayerStore();
    
    const [activeTab, setActiveTab] = useState<'home' | 'search' | 'playlists' | 'liked' | 'profile' | 'settings'>('home');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editFavoriteSinger, setEditFavoriteSinger] = useState('');
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
    const [query, setQuery] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [heroTracks, setHeroTracks] = useState<any[]>([]);
    const [mainTracks, setMainTracks] = useState<any[]>([]);
    const [recTracks, setRecTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [likedSongs, setLikedSongs] = useState<any[]>([]);
    const [selectedPlaylistSongs, setSelectedPlaylistSongs] = useState<any[] | null>(null);
    const [currentPlaylistName, setCurrentPlaylistName] = useState('');
    const [showPlaylistModal, setShowPlaylistModal] = useState<string | null>(null);

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });
    }, [setDeferredPrompt]);

    // Handle back button - smooth navigation within app
    useEffect(() => {
        // Track navigation depth
        const navDepth = { count: 0 };
        
        const handlePopState = () => {
            // If we're deeper in navigation (opened playlist detail)
            if (selectedPlaylistSongs) {
                setSelectedPlaylistSongs(null);
                setCurrentPlaylistName('');
                navDepth.count = 1;
                history.pushState(null, '', '');
            }
            // If we're in any tab except home
            else if (activeTab !== 'home') {
                setActiveTab('home');
                navDepth.count = 0;
                history.pushState(null, '', '');
            }
            // If we're at home and try to go back - let browser handle it (will go to previous webpage)
            else {
                // At home, back button will exit to previous page - this is expected browser behavior
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        
        return () => window.removeEventListener('popstate', handlePopState);
    }, [selectedPlaylistSongs, activeTab]);

    // Edit profile handlers
    const startEditProfile = () => {
        setEditName(user?.name || '');
        setEditEmail(user?.email || '');
        setEditBio(user?.bio || '');
        setEditFavoriteSinger(user?.favoriteSinger || '');
        setIsEditingProfile(true);
    };

    const saveProfile = () => {
        if (!editName.trim() || !editEmail.trim()) {
            showToast("Name and Email required!");
            return;
        }
        updateUser({ name: editName.trim(), email: editEmail.trim(), bio: editBio.trim(), favoriteSinger: editFavoriteSinger.trim() });
        setIsEditingProfile(false);
        showToast("Profile updated!");
    };

    const handleLogout = () => {
        if (confirm("Are you sure you want to logout?")) {
            logout();
            showToast("Logged out successfully");
        }
    };

    const installPWA = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        } else {
            showToast("Browser doesn't support install or already installed.");
        }
    };

    const loadBackendData = async () => {
        if (!user) return;
        try {
            const favRes = await axios.get(`${API_URL}/api/favorites`);
            if (favRes.data.success) setLikedSongs(favRes.data.data);
            const playlistRes = await axios.get(`${API_URL}/api/playlists`);
            if (playlistRes.data.success) setPlaylists(playlistRes.data.data);
        } catch (err) {}
    };

    useEffect(() => {
        if (!user) return;
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [heroRes, recRes, mainRes] = await Promise.all([
                    axios.get(`/api/search?query=latest bollywood hits`),
                    axios.get(`/api/search?query=best romantic hindi`),
                    axios.get(`/api/search?query=${CATEGORIES[0]}`)
                ]);
                if (heroRes.data?.success) setHeroTracks(heroRes.data.data.slice(0, 5));
                if (recRes.data?.success) setRecTracks(recRes.data.data.slice(0, 6));
                if (mainRes.data?.success) setMainTracks(mainRes.data.data);
            } catch (err) {}
            setLoading(false);
        };
        fetchInitialData();
        loadBackendData();
    }, [user]);

    useEffect(() => {
        if (heroTracks.length === 0) return;
        const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroTracks.length), 4000);
        return () => clearInterval(interval);
    }, [heroTracks]);

    const handleCategoryClick = async (cat: string) => {
        setActiveCategory(cat); setQuery(''); setLoading(true);
        try {
            const res = await axios.get(`/api/search?query=${cat}`);
            if (res.data?.success) setMainTracks(res.data.data);
        } catch (err) {}
        setLoading(false);
    };

    const handleSearchSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;
        setActiveTab('home'); setActiveCategory(''); setLoading(true);
        try {
            const res = await axios.get(`/api/search?query=${query}`);
            if (res.data?.success) setMainTracks(res.data.data);
        } catch (err) {}
        setLoading(false);
    };

    const startVoiceSearch = () => {
        // VERCEL TYPE ERROR FIX: window ko "any" assign kiya taaki TypeScript block na kare
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (!SpeechRecognition) return showToast("Voice Search not supported here.");
        const recognition = new SpeechRecognition();
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript); handleSearchSubmit(); setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const toggleFavorite = async (song: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const isLiked = likedSongs.some(s => s.songId === String(song.id) || s.songId === song.songId);
        try {
            if (isLiked) {
                await axios.delete(`${API_URL}/api/favorites/${song.id || song.songId}`);
                showToast("Removed from Liked");
            } else {
                await axios.post(`${API_URL}/api/favorites`, { songId: String(song.id || song.songId), title: song.title, artist: song.artist, image: song.image, url: song.url });
                showToast("Added to Liked ❤️");
            }
            loadBackendData();
        } catch (err) {}
    };

    const createPlaylist = async () => {
        const name = prompt("Enter Playlist Name:");
        if (!name) return;
        try { await axios.post(`${API_URL}/api/playlists`, { name }); showToast("Playlist Created!"); loadBackendData(); } catch (err) {}
    };

    const addSongToPlaylist = async (playlistId: string, song: any) => {
        try {
            await axios.post(`${API_URL}/api/playlists/${playlistId}/songs`, { songId: String(song.id), title: song.title, artist: song.artist, image: song.image, url: song.url });
            showToast('Added to playlist! 🎵'); setShowPlaylistModal(null); loadBackendData();
        } catch (err) { showToast('Already in playlist!'); }
    };

    const renderTrackCard = (song: any, contextQueue: any[]) => {
        const isCurrentPlaying = (currentTrack?.id === String(song.id) || currentTrack?.id === song.songId) && isPlaying;
        const isLiked = likedSongs.some(s => s.songId === String(song.id) || s.songId === song.songId);
        return (
            <div key={song.id || song.songId} className="group relative bg-white/5 p-3 md:p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all duration-300">
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                    <img src={song.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="art" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-xs">
                        <button onClick={() => playTrack(song, contextQueue)} className="w-10 h-10 md:w-12 md:h-12 bg-fuchsia-500 rounded-full flex items-center justify-center text-black transform translate-y-3 group-hover:translate-y-0 transition-all shadow-lg active:scale-90">
                            {isCurrentPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                        </button>
                    </div>
                </div>
                <h3 className="font-bold text-xs md:text-sm truncate text-white">{song.title}</h3>
                <p className="text-zinc-400 text-[10px] md:text-xs truncate mt-0.5">{song.artist}</p>
                <div className="flex gap-2 mt-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => toggleFavorite(song, e)} className={`p-1.5 rounded-md transition ${isLiked ? 'text-fuchsia-500' : 'bg-white/5 text-zinc-400 hover:text-white'}`}><Heart size={14} fill={isLiked ? "currentColor" : "none"} /></button>
                    <button onClick={() => setShowPlaylistModal(song.id)} className="p-1.5 bg-white/5 rounded-md hover:text-fuchsia-500 text-zinc-400 transition"><Plus size={14} /></button>
                </div>
                {showPlaylistModal === song.id && (
                    <div className="absolute left-0 right-0 bottom-12 bg-zinc-900 border border-white/10 rounded-xl p-2 z-50 shadow-2xl">
                        <p className="text-[10px] uppercase font-black tracking-wider p-1 text-zinc-400">Add to Playlist</p>
                        <div className="max-h-24 overflow-y-auto mt-1 flex flex-col gap-1">
                            {playlists.map((pl) => <button key={pl.id} onClick={() => addSongToPlaylist(pl.id, song)} className="text-left w-full text-[10px] md:text-xs p-2 rounded-md hover:bg-fuchsia-500 hover:text-black font-semibold truncate transition-colors text-white">{pl.name}</button>)}
                            <button onClick={() => { setShowPlaylistModal(null); createPlaylist(); }} className="text-center w-full text-[10px] p-1.5 rounded-md bg-white/5 text-fuchsia-400 font-bold mt-1 hover:bg-white/10">+ New</button>
                        </div>
                        <button onClick={() => setShowPlaylistModal(null)} className="w-full text-[10px] text-zinc-500 mt-1 font-bold">Cancel</button>
                    </div>
                )}
            </div>
        );
    };

    if (!user) {
        return (
            <main className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden text-white">
                <div className="ambient-bg" />
                <div className="bg-black/60 backdrop-blur-2xl p-8 md:p-12 rounded-[32px] border border-white/10 w-full max-w-md shadow-2xl z-10 relative">
                    <div className="flex justify-center mb-6"><img src="/logo.png" alt="Logo" className="w-20 h-20 object-cover rounded-2xl shadow-[0_0_20px_#d946ef] animate-pulse" onError={(e) => e.currentTarget.style.display='none'} /></div>
                    <h1 className="text-3xl font-black text-center mb-2">Welcome to Dhwani</h1>
                    <p className="text-zinc-400 text-center mb-8 text-sm">Sign in to your premium music studio</p>
                    <form onSubmit={(e: any) => { e.preventDefault(); login({ name: e.target.name.value, email: e.target.email.value }); showToast(`Welcome back, ${e.target.name.value}!`); }} className="space-y-4">
                        <input type="text" name="name" placeholder="Your Name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fuchsia-500 text-white" />
                        <input type="email" name="email" placeholder="Email Address" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fuchsia-500 text-white" />
                        <button type="submit" className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:scale-[1.02] shadow-lg mt-4 transition active:scale-95">Enter Studio</button>
                    </form>
                </div>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen bg-[#050505] text-white flex overflow-hidden">
            <div className="ambient-bg" />

            {toast && (
                <div className="fixed bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl z-[100] animate-bounce text-sm whitespace-nowrap">
                    {toast}
                </div>
            )}

            <aside className="hidden md:flex flex-col w-64 bg-black/80 backdrop-blur-2xl border-r border-white/5 h-screen z-30">
                <div className="p-6 flex items-center gap-3 text-2xl font-black">
                    <img src="/logo.png" className="w-8 h-8 rounded-md" alt="logo" onError={(e) => e.currentTarget.style.display='none'} />
                    <span className="bg-gradient-to-r from-fuchsia-500 to-purple-500 bg-clip-text text-transparent italic">Dhwani</span>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'home' ? 'bg-fuchsia-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><Music size={20} /> Home</button>
                    <button onClick={() => setActiveTab('search')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'search' ? 'bg-fuchsia-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><Search size={20} /> Search</button>
                    <button onClick={() => setActiveTab('playlists')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'playlists' ? 'bg-fuchsia-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><ListMusic size={20} /> Playlists</button>
                    <button onClick={() => setActiveTab('liked')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'liked' ? 'bg-fuchsia-500 text-black shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><Heart size={20} /> Liked Songs</button>
                </nav>
                <div className="p-4 mt-auto border-t border-white/5 space-y-2">
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition ${activeTab === 'profile' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                        <div className="w-8 h-8 bg-fuchsia-500 text-black rounded-full flex items-center justify-center font-black">{user.name.charAt(0)}</div>
                        <span className="font-bold text-sm truncate">{user.name}</span>
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'settings' ? 'text-fuchsia-500 bg-white/5' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}><SettingsIcon size={20} /> Settings</button>
                </div>
            </aside>

            <div className="flex-1 pb-24 md:pb-32 h-screen overflow-y-auto scrollbar-hide relative z-10 w-full">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    
                    <div className="md:hidden flex justify-between items-center mb-6 pt-2">
                        <div className="flex items-center gap-2 font-black text-xl">
                            <img src="/logo.png" className="w-6 h-6 rounded-md" alt="logo" onError={(e) => e.currentTarget.style.display='none'} />
                            <span className="text-fuchsia-500 italic">Dhwani</span>
                        </div>
                        <button onClick={() => setActiveTab('profile')} className="w-8 h-8 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-full flex items-center justify-center text-black font-black text-sm">{user.name.charAt(0)}</button>
                    </div>

                    {activeTab === 'home' && (
                        <div className="space-y-6">
                            {/* Categories - horizontal scroll on mobile */}
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mask-edges flex-nowrap">
                                {CATEGORIES.map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => handleCategoryClick(cat)} 
                                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeCategory === cat ? 'bg-fuchsia-500 text-black border-fuchsia-500' : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            
                            {!query && heroTracks.length > 0 && (
                                <div className="relative h-[200px] md:h-[320px] rounded-[24px] md:rounded-[32px] overflow-hidden mb-6 md:mb-10 shadow-2xl">
                                    <div className="flex h-full transition-transform duration-700" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                        {heroTracks.map((track, i) => (
                                            <div key={i} className="min-w-full h-full relative bg-cover bg-center" style={{ backgroundImage: `url(${track.image})` }}>
                                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                                                <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 max-w-lg">
                                                    <span className="px-2 md:px-3 py-1 bg-fuchsia-500 text-black text-[8px] md:text-[10px] font-black uppercase rounded-lg mb-2 md:mb-4 inline-block shadow-lg">Trending #{i + 1}</span>
                                                    <h1 className="text-2xl md:text-5xl font-black mb-1 md:mb-2 drop-shadow-md">{track.title}</h1>
                                                    <p className="text-sm md:text-lg text-zinc-300 font-medium mb-3 md:mb-6">{track.artist}</p>
                                                    <button onClick={() => playTrack(track, heroTracks)} className="px-6 py-2 md:px-8 md:py-3 bg-white text-black text-sm md:text-base font-bold rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition shadow-xl">
                                                        <Play fill="currentColor" size={16} /> Play Now
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <h2 className="text-lg md:text-2xl font-extrabold mb-4 flex items-center gap-3 mt-6">{activeCategory} <div className="h-1 w-8 md:w-10 bg-fuchsia-500 rounded-full" /></h2>
                            {loading ? <div className="text-center text-zinc-500 py-10">Loading...</div> : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                                    {mainTracks.map(song => renderTrackCard(song, mainTracks))}
                                </div>
                            )}

                            {!query && recTracks.length > 0 && (
                                <>
                                    <h2 className="text-lg md:text-2xl font-extrabold mb-4 flex items-center gap-3 mt-10">Recommended <div className="h-1 w-10 bg-fuchsia-500 rounded-full" /></h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                                        {recTracks.map(song => renderTrackCard(song, recTracks))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div>
                            <form onSubmit={handleSearchSubmit} className="relative mb-8 flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Artists, songs..." className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-fuchsia-500 text-lg text-white" autoFocus />
                                </div>
                                <button type="button" onClick={startVoiceSearch} className={`p-4 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-fuchsia-500 text-black shadow-[0_0_15px_#d946ef]' : 'bg-white/10 text-zinc-400 hover:text-white border border-white/10'}`}><Mic size={20} /></button>
                            </form>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {mainTracks.map(song => (
                                    <div key={song.id} onClick={() => playTrack(song, mainTracks)} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl hover:bg-white/10 cursor-pointer border border-white/5 transition active:scale-95">
                                        <img src={song.image} className="w-12 h-12 rounded-md object-cover" alt="art" />
                                        <div className="overflow-hidden flex-1"><h4 className="text-sm font-bold truncate text-white">{song.title}</h4><p className="text-xs text-zinc-400 truncate">{song.artist}</p></div>
                                        <Play size={16} className="text-zinc-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'playlists' && (
                        <div>
                            {!selectedPlaylistSongs ? (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl md:text-2xl font-black">Your Playlists</h2>
                                        <button onClick={createPlaylist} className="px-4 py-2 bg-fuchsia-500 text-black text-xs font-bold rounded-full hover:scale-105 transition"><Plus size={14} className="inline mr-1"/> Create</button>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {playlists.map(pl => (
                                            <div key={pl.id} className="relative bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition overflow-hidden">
                                                {/* Delete button - bottom right, always visible on mobile */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); if(confirm('Delete this playlist?')) { axios.delete(`${API_URL}/api/playlists/${pl.id}`).then(() => { loadBackendData(); showToast("Playlist Deleted"); }); } }} 
                                                    className="absolute bottom-3 right-3 z-10 p-2 bg-black/60 hover:bg-red-500 rounded-full transition"
                                                >
                                                    <Trash2 size={14} className="text-white"/>
                                                </button>
                                                
                                                {/* Clickable area for opening playlist */}
                                                <div 
                                                    onClick={() => { setSelectedPlaylistSongs(pl.songs || []); setCurrentPlaylistName(pl.name); }} 
                                                    className="p-4 cursor-pointer"
                                                >
                                                    <div className="aspect-square bg-fuchsia-500/10 rounded-xl flex items-center justify-center text-fuchsia-500 mb-3 group-hover:bg-fuchsia-500 group-hover:text-black transition">
                                                        <ListMusic size={32} />
                                                    </div>
                                                    <h3 className="font-bold text-sm truncate text-white">{pl.name}</h3>
                                                    <p className="text-xs text-zinc-500">{pl.songs?.length || 0} tracks</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-4 mb-6">
                                        <button onClick={() => setSelectedPlaylistSongs(null)} className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-bold hover:bg-white/20 transition text-white">← Back</button>
                                        <h2 className="text-xl md:text-3xl font-black text-fuchsia-500">{currentPlaylistName}</h2>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {selectedPlaylistSongs.map((song) => renderTrackCard(song, selectedPlaylistSongs))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'liked' && (
                        <div>
                            <h2 className="text-xl md:text-2xl font-black mb-6">Liked Songs</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {likedSongs.map(song => renderTrackCard(song, likedSongs))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && !isEditingProfile && (
                        <div className="max-w-md mx-auto text-center mt-6 md:mt-10">
                            <button onClick={startEditProfile} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition md:hidden z-10">
                                <Edit3 size={18} className="text-white" />
                            </button>
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-fuchsia-500 to-purple-600 rounded-full mx-auto flex items-center justify-center text-3xl md:text-4xl font-black shadow-lg mb-4">{user?.name?.charAt(0) || 'U'}</div>
                            <h2 className="text-xl md:text-2xl font-black">{user?.name}</h2>
                            <p className="text-zinc-400 text-sm mb-2">{user?.email}</p>
                            {user?.bio && <p className="text-zinc-500 text-sm mb-4 italic">"{user.bio}"</p>}
                            {user?.favoriteSinger && (
                                <div className="flex items-center justify-center gap-2 text-fuchsia-400 text-sm mb-6">
                                    <Star size={14} fill="currentColor" />
                                    <span>Fav: {user.favoriteSinger}</span>
                                </div>
                            )}
                            <button onClick={startEditProfile} className="w-full py-3 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition active:scale-95 text-white hidden md:block">
                                <Edit3 size={16} className="inline mr-2" /> Edit Profile
                            </button>
                        </div>
                    )}

                    {activeTab === 'profile' && isEditingProfile && (
                        <div className="max-w-md mx-auto mt-6 md:mt-10 relative">
                            <div className="flex items-center justify-between mb-6">
                                <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                                    <ChevronLeft size={20} className="text-white" />
                                </button>
                                <h2 className="text-xl font-black">Edit Profile</h2>
                                <div className="w-10"></div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-400 font-bold uppercase mb-2 block">Name</label>
                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fuchsia-500 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 font-bold uppercase mb-2 block">Email</label>
                                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fuchsia-500 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 font-bold uppercase mb-2 block">Bio</label>
                                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fuchsia-500 text-white resize-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 font-bold uppercase mb-2 block">Favorite Singer</label>
                                    <input type="text" value={editFavoriteSinger} onChange={(e) => setEditFavoriteSinger(e.target.value)} placeholder="e.g., Arijit Singh, Lata Mangeshkar..." className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-fuchsia-500 text-white" />
                                </div>
                                <button onClick={saveProfile} className="w-full py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-xl font-bold hover:scale-[1.02] transition active:scale-95 text-white">
                                    <Save size={16} className="inline mr-2" /> Save Changes
                                </button>
                                <button onClick={() => setIsEditingProfile(false)} className="w-full py-3 border border-white/20 rounded-xl font-bold hover:bg-white/5 transition active:scale-95 text-zinc-400">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-xl mx-auto mt-4 md:mt-10">
                            <h2 className="text-2xl font-black mb-6">Settings</h2>
                            
                            <h3 className="font-bold text-zinc-500 mb-4 uppercase tracking-widest text-xs">App Preferences</h3>
                            <div className="space-y-3 mb-8">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                                    <div><p className="font-bold text-white">Audio Quality</p><p className="text-xs text-zinc-400">Stream high-quality 320kbps audio</p></div>
                                    <span className="text-fuchsia-500 text-sm font-bold bg-fuchsia-500/10 px-3 py-1 rounded-md">High</span>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                                    <div><p className="font-bold text-white">Data Saver</p><p className="text-xs text-zinc-400">Reduce data usage on cellular network</p></div>
                                    <input type="checkbox" className="accent-fuchsia-500 w-4 h-4 cursor-pointer" />
                                </div>
                            </div>

                            <h3 className="font-bold text-zinc-500 mb-4 uppercase tracking-widest text-xs">PWA & System</h3>
                            <div className="space-y-3">
                                {deferredPrompt && (
                                    <button onClick={installPWA} className="w-full p-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-xl flex items-center gap-4 hover:scale-[1.01] transition shadow-lg text-left active:scale-95">
                                        <Smartphone size={24} className="text-white" />
                                        <div><p className="font-bold text-white text-lg">Install Dhwani App</p><p className="text-xs text-white/80">Add to home screen for native experience</p></div>
                                    </button>
                                )}
                                <button onClick={handleLogout} className="w-full p-4 border border-red-500/30 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition active:scale-95">
                                    <LogOut size={18} /> Sign Out securely
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-black/95 backdrop-blur-2xl border-t border-white/10 flex justify-around items-center px-2 z-50">
                <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'home' ? 'text-fuchsia-500' : 'text-zinc-500'}`}><Music size={22} /><span className="text-[9px] font-bold">Home</span></button>
                <button onClick={() => setActiveTab('search')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'search' ? 'text-fuchsia-500' : 'text-zinc-500'}`}><Search size={22} /><span className="text-[9px] font-bold">Search</span></button>
                <button onClick={() => setActiveTab('playlists')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'playlists' ? 'text-fuchsia-500' : 'text-zinc-500'}`}><ListMusic size={22} /><span className="text-[9px] font-bold">Library</span></button>
                <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'settings' ? 'text-fuchsia-500' : 'text-zinc-500'}`}><SettingsIcon size={22} /><span className="text-[9px] font-bold">Settings</span></button>
            </nav>

            <Player />
            
            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .mask-edges { -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent); }
            `}</style>
        </main>
    );
}