const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Deployment Fix: Allow requests from anywhere (like Vercel)
app.use(cors({ origin: '*' }));
app.use(express.json());

const getOrCreateDefaultUser = async () => {
    let user = await prisma.user.findUnique({ where: { email: 'shivam@dhwani.com' } });
    if (!user) {
        user = await prisma.user.create({ data: { email: 'shivam@dhwani.com', name: 'Shivam' } });
    }
    return user;
};

// ================= FAVORITES SYSTEM =================
app.get('/api/favorites', async (req, res) => {
    try {
        const user = await getOrCreateDefaultUser();
        const favorites = await prisma.favorite.findMany({ where: { userId: user.id } });
        res.json({ success: true, data: favorites });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/favorites', async (req, res) => {
    const { songId, title, artist, image, url } = req.body;
    try {
        const user = await getOrCreateDefaultUser();
        const favorite = await prisma.favorite.create({
            data: { userId: user.id, songId, title, artist, image, url }
        });
        res.json({ success: true, favorite });
    } catch (error) {
        res.status(400).json({ success: false, error: "Song already liked or bad request" });
    }
});

app.delete('/api/favorites/:songId', async (req, res) => {
    const { songId } = req.params;
    try {
        const user = await getOrCreateDefaultUser();
        await prisma.favorite.delete({
            where: { userId_songId: { userId: user.id, songId: songId } }
        });
        res.json({ success: true, message: 'Removed from favorites' });
    } catch (error) {
        res.status(400).json({ success: false, error: 'Could not remove song' });
    }
});

// ================= PLAYLISTS SYSTEM =================
app.get('/api/playlists', async (req, res) => {
    try {
        const user = await getOrCreateDefaultUser();
        const playlists = await prisma.playlist.findMany({
            where: { userId: user.id },
            include: { songs: true }
        });
        res.json({ success: true, data: playlists });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/playlists', async (req, res) => {
    const { name } = req.body;
    try {
        const user = await getOrCreateDefaultUser();
        const newPlaylist = await prisma.playlist.create({
            data: { name, userId: user.id }
        });
        res.json({ success: true, data: newPlaylist });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/playlists/:playlistId/songs', async (req, res) => {
    const { playlistId } = req.params;
    const { songId, title, artist, image, url } = req.body;
    try {
        const playlistSong = await prisma.playlistSong.create({
            data: { playlistId, songId, title, artist, image, url }
        });
        res.json({ success: true, data: playlistSong });
    } catch (error) {
        res.status(400).json({ success: false, error: "Song already exists in this playlist" });
    }
});

app.delete('/api/playlists/:id', async (req, res) => {
    try {
        await prisma.playlist.delete({ where: { id: req.params.id } });
        res.json({ success: true, message: "Playlist deleted successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Premium Backend live on port ${PORT}`));