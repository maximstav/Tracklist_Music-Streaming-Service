import api from './api';

export interface Playlist {
    id: number;
    name: string;
    songIds?: number[];
    userId?: number;
}

const API_URL = '/api/v1/playlists';

export const getMyPlaylists = async (): Promise<Playlist[]> => {
    const response = await api.get<Playlist[]>(`${API_URL}/my`);
    return response.data;
};

export const getPlaylist = async (id: number): Promise<Playlist> => {
    const response = await api.get<Playlist>(`${API_URL}/${id}`);
    return response.data;
};

export interface CreatePlaylistRequest {
    name: string;
}

export const createPlaylist = async (data: CreatePlaylistRequest): Promise<Playlist> => {
    const response = await api.post<Playlist>(API_URL, data);
    return response.data;
};

export const deletePlaylist = async (id: number): Promise<void> => {
    await api.delete(`${API_URL}/${id}`);
};

export const addSongToPlaylist = async (playlistId: number, songId: number): Promise<Playlist> => {
    const response = await api.post<Playlist>(`${API_URL}/${playlistId}/songs/${songId}`);
    return response.data;
};

export const removeSongFromPlaylist = async (playlistId: number, songId: number): Promise<Playlist> => {
    const response = await api.delete<Playlist>(`${API_URL}/${playlistId}/songs/${songId}`);
    return response.data;
};
