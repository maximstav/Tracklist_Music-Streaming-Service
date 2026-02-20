import api from './api';

export interface Song {
    id: number;
    title: string;
    duration: number;
    hasAudio: boolean;
    albumId?: number;
    albumTitle?: string;
    artistIds: number[];
    artistNames: string[];
}

// Helper to get artist name(s) as string
export const getArtistName = (song: Song): string => {
    if (song.artistNames && song.artistNames.length > 0) {
        return song.artistNames.join(', ');
    }
    return 'Unknown Artist';
};

const API_URL = '/api/v1/songs';

export const getAllSongs = async (): Promise<Song[]> => {
    const response = await api.get<Song[]>(API_URL);
    return response.data;
};

export const searchSongs = async (query: string): Promise<Song[]> => {
    const params = { q: query };
    const response = await api.get<Song[]>(`${API_URL}/search`, { params });
    return response.data;
};

export interface CreateSongRequest {
    title: string;
    duration: number;
    albumId: number;
    artistIds: number[];
    s3Key?: string;
}

export const createSong = async (data: CreateSongRequest): Promise<Song> => {
    const response = await api.post<Song>(API_URL, data);
    return response.data;
};

export const finalizeSong = async (data: CreateSongRequest): Promise<Song> => {
    // Use /finalize endpoint when s3Key is provided (after file upload)
    if (!data.s3Key) {
        throw new Error('s3Key is required for finalize');
    }
    const response = await api.post<Song>(`${API_URL}/finalize`, data);
    return response.data;
};

export interface PlayResponse {
    playUrl: string;
}

export const getPlayUrl = async (songId: number): Promise<string> => {
    const response = await api.get<PlayResponse>(`${API_URL}/${songId}/play`);
    return response.data.playUrl;
};