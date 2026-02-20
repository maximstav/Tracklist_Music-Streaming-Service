import api from './api';

export interface Artist {
    id: number;
    name: string;
    genre?: string;
    songIds: number[];
    songTitles: string[];
    albumIds: number[];
    albumTitles: string[];
}

const API_URL = '/api/v1/artists';

export const getAllArtists = async (): Promise<Artist[]> => {
    const response = await api.get<Artist[]>(API_URL);
    return response.data;
};

export interface CreateArtistRequest {
    name: string;
    genre?: string;
}

export const createArtist = async (data: CreateArtistRequest): Promise<Artist> => {
    const response = await api.post<Artist>(API_URL, data);
    return response.data;
};
