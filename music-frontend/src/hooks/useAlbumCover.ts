import { useState, useEffect } from 'react';
import { getAlbumCoverUrl } from '../services/albumService';

// module-level cache: albumId → presigned cover URL
// prevents redundant API calls when many songs share the same album
const coverCache = new Map<number, string>();

interface UseAlbumCoverResult {
    coverUrl: string | null;
    isLoading: boolean;
}

/**
 * Fetches and caches the album cover art URL for a given albumId.
 * Returns null (with isLoading=false) when albumId is undefined or the album has no cover art.
 */
export const useAlbumCover = (albumId?: number | null): UseAlbumCoverResult => {
    const [coverUrl, setCoverUrl] = useState<string | null>(
        albumId != null ? coverCache.get(albumId) ?? null : null
    );
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (albumId == null) {
            setCoverUrl(null);
            return;
        }

        // already cached — use it
        const cached = coverCache.get(albumId);
        if (cached) {
            setCoverUrl(cached);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        getAlbumCoverUrl(albumId)
            .then((url) => {
                if (!cancelled) {
                    coverCache.set(albumId, url);
                    setCoverUrl(url);
                }
            })
            .catch(() => {
                // 400 = no cover art, 404 = album not found — both are expected
                if (!cancelled) {
                    setCoverUrl(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [albumId]);

    return { coverUrl, isLoading };
};
