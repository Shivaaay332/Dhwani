import { create } from 'zustand';

export interface Song {
    id: string;
    songId?: string;
    title: string;
    artist: string;
    image: string;
    url: string;
}

interface User {
    name: string;
    email: string;
}

interface PlayerStore {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    
    // Premium Toast System
    toast: string | null;
    showToast: (msg: string) => void;
    
    currentTrack: Song | null;
    queue: Song[];
    isPlaying: boolean;
    isFullScreen: boolean;
    isShuffle: boolean;
    loopMode: number;
    
    deferredPrompt: any;
    setDeferredPrompt: (prompt: any) => void;

    playTrack: (track: Song, queue: Song[]) => void;
    togglePlay: () => void;
    setPlaying: (playing: boolean) => void;
    toggleFullScreen: () => void;
    toggleShuffle: () => void;
    toggleLoop: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
    user: null,
    login: (userData) => set({ user: userData }),
    logout: () => set({ user: null, currentTrack: null, isPlaying: false }),

    toast: null,
    showToast: (msg) => {
        set({ toast: msg });
        setTimeout(() => set({ toast: null }), 3000);
    },

    deferredPrompt: null,
    setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),

    currentTrack: null,
    queue: [],
    isPlaying: false,
    isFullScreen: false,
    isShuffle: false,
    loopMode: 0,

    playTrack: (track, queue) => set({ 
        currentTrack: { ...track, id: track.id || track.songId || '' }, 
        queue, 
        isPlaying: true 
    }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setPlaying: (playing) => set({ isPlaying: playing }),
    toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
    toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
    toggleLoop: () => set((state) => ({ loopMode: (state.loopMode + 1) % 3 })),

    nextTrack: () => set((state) => {
        if (!state.currentTrack || state.queue.length === 0) return state;
        if (state.loopMode === 2) return { isPlaying: true }; 
        let nextIndex = state.isShuffle ? Math.floor(Math.random() * state.queue.length) : (state.queue.findIndex(t => (t.id === state.currentTrack?.id || t.songId === state.currentTrack?.id)) + 1) % state.queue.length;
        return { currentTrack: state.queue[nextIndex], isPlaying: true };
    }),

    prevTrack: () => set((state) => {
        if (!state.currentTrack || state.queue.length === 0) return state;
        let prevIndex = (state.queue.findIndex(t => (t.id === state.currentTrack?.id || t.songId === state.currentTrack?.id)) - 1 + state.queue.length) % state.queue.length;
        return { currentTrack: state.queue[prevIndex], isPlaying: true };
    }),
}));