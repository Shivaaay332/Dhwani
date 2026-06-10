import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'Bollywood';

    try {
        // Headers aur timeout add kiya taaki Apple block na kare
        const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20&country=IN`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000 // 10 seconds timeout
        });
        
        const formattedSongs = res.data.results
            .filter((track: any) => track.previewUrl) 
            .map((track: any) => ({
                id: String(track.trackId),
                title: track.trackName,
                artist: track.artistName,
                image: track.artworkUrl100.replace('100x100', '600x600'),
                url: track.previewUrl 
            }));

        return NextResponse.json({ success: true, data: formattedSongs });
        
    } catch (error: any) {
        console.error("Server API Error (Rate Limit/Network):", error.message);
        
        // Agar Apple connection reset karta hai, toh hum 500 crash nahi hone denge.
        // Hum politely empty data bhejenge taaki app chalta rahe.
        return NextResponse.json(
            { success: false, data: [], message: "Server busy. Retrying..." }, 
            { status: 200 } 
        );
    }
}