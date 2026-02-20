import { Play, Pause, Plus, Music, X } from "lucide-react";
import { type Song, getArtistName } from "../services/songService";
import { usePlayer } from "../context/PlayerContext";
import { useAlbumCover } from "../hooks/useAlbumCover";
import { useState } from "react";
import { createPortal } from "react-dom";
import { getMyPlaylists, addSongToPlaylist, type Playlist } from "../services/playlistService";

interface SongCardProps {
    song: Song;
}

const SongCard = ({ song }: SongCardProps) => {
    const { currentSong, isPlaying, playSong, pause, resume } = usePlayer();

    const isCurrentSong = currentSong?.id === song.id;
    const isThisPlaying = isCurrentSong && isPlaying;

    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [modalLoading, setModalLoading] = useState(false);

    const handlePlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isThisPlaying) {
            pause();
        } else if (isCurrentSong) {
            resume();
        } else {
            playSong(song);
        }
    };

    const handlePlusClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPlaylistModal(true);
        setModalLoading(true);
        try {
            const data = await getMyPlaylists();
            setPlaylists(data);
        } catch (err) {
            console.error("Failed to load playlists");
        } finally {
            setModalLoading(false);
        }
    };

    const handleAddToPlaylist = async (playlistId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await addSongToPlaylist(playlistId, song.id);
            setShowPlaylistModal(false);
        } catch (err) {
            console.error("Failed to add to playlist");
        }
    };

    const { coverUrl } = useAlbumCover(song.albumId);

    return (
        <div className={`group relative bg-zinc-900/40 p-4 rounded-md hover:bg-zinc-800/40 transition duration-300 ${isCurrentSong ? 'ring-2 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] bg-zinc-800/60' : ''}`}>
            <div className="relative aspect-square mb-4 bg-zinc-800 rounded-md overflow-hidden shadow-lg">
                {song.hasAudio ? (
                    coverUrl ? (
                        <img
                            src={coverUrl}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLImageElement).src = "";
                                (e.target as HTMLImageElement).style.display = "none";
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null
                ) : null}

                {/* Placeholder if no image or image error (hidden by default if image exists) */}
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-inner text-zinc-500 ${coverUrl ? 'hidden' : ''}`}>
                    <Music size={40} className="opacity-50 drop-shadow-md" />
                </div>

                {/* Play Button Overlay */}
                <button
                    onClick={handlePlayClick}
                    className="absolute bottom-2 right-2 p-3 rounded-full bg-green-500 text-black shadow-[0_4px_15px_rgba(34,197,94,0.4)] translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out hover:scale-110 hover:bg-green-400 hover:shadow-[0_6px_20px_rgba(34,197,94,0.6)]"
                >
                    {isThisPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
            </div>

            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-white truncate text-base mb-1" title={song.title}>
                        {song.title}
                    </h3>
                    <p className="text-sm text-zinc-400 truncate" title={getArtistName(song)}>
                        {getArtistName(song)}
                    </p>
                </div>

                {/* Add to Playlist Button */}
                <button
                    onClick={handlePlusClick}
                    className="text-zinc-400 hover:text-white transition p-1"
                    title="Add to Playlist"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Add to Playlist Modal Portal */}
            {showPlaylistModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(false); }}>
                    <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowPlaylistModal(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 rounded-full hover:bg-zinc-700"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4">Add to Playlist</h3>
                        {modalLoading ? (
                            <p className="text-zinc-400 text-center py-4">Loading playlists...</p>
                        ) : playlists.length === 0 ? (
                            <p className="text-zinc-400 text-center py-4">No playlists found. Create one in your Library first!</p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {playlists.map(pl => (
                                    <button
                                        key={pl.id}
                                        onClick={(e) => handleAddToPlaylist(pl.id, e)}
                                        className="w-full text-left px-4 py-3 bg-zinc-800/40 hover:bg-zinc-700 rounded-lg text-white font-medium transition-colors line-clamp-1"
                                    >
                                        {pl.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SongCard;
