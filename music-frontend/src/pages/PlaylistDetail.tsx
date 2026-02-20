import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlaylist, addSongToPlaylist, removeSongFromPlaylist, type Playlist } from "../services/playlistService";
import { getAllSongs, type Song } from "../services/songService";
import { Trash2, Plus, Music, Play, X } from "lucide-react";
import SongCard from "../components/SongCard";
import { usePlayer } from "../context/PlayerContext";
import { useAlbumCover } from "../hooks/useAlbumCover";

/** Sub-component so we can call useAlbumCover per row (hooks need stable call order) */
const SongRow = ({
  song,
  index,
  onRemove,
}: {
  song: Song;
  index: number;
  onRemove: (songId: number) => void;
}) => {
  const { coverUrl } = useAlbumCover(song.albumId);
  const [imgError, setImgError] = useState(false);
  const { playSong } = usePlayer();

  useEffect(() => {
    setImgError(false);
  }, [coverUrl]);

  const showImage = coverUrl && !imgError;

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-800/20 hover:bg-zinc-800/70 transition-colors duration-200 rounded-lg group">
      <div className="w-10 flex justify-center items-center">
        <span className="text-zinc-400 group-hover:hidden tabular-nums">{index + 1}</span>
        <button onClick={() => playSong(song)} className="text-white hidden group-hover:block transition-transform hover:scale-110">
          <Play size={16} fill="currentColor" />
        </button>
      </div>
      <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md">
        {showImage ? (
          <img
            src={coverUrl}
            alt={song.albumTitle || song.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music size={16} className="text-zinc-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{song.title}</p>
        <p className="text-sm text-zinc-400 truncate">
          {song.artistNames?.join(", ") || "Unknown Artist"}
        </p>
      </div>
      <button
        onClick={() => onRemove(song.id)}
        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition p-2 hover:scale-110"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};

const PlaylistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setQueue, playSong } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddSong, setShowAddSong] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [playlistData, allSongsData] = await Promise.all([
        getPlaylist(Number(id)),
        getAllSongs(),
      ]);
      setPlaylist(playlistData);
      setAllSongs(allSongsData);

      // Get songs that are in the playlist
      if (playlistData.songIds && playlistData.songIds.length > 0) {
        const playlistSongs = allSongsData.filter((song) =>
          playlistData.songIds?.includes(song.id)
        );
        setSongs(playlistSongs);
      } else {
        setSongs([]);
      }
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Failed to load playlist.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async (songId: number) => {
    if (!id) return;

    try {
      const updatedPlaylist = await addSongToPlaylist(Number(id), songId);
      setPlaylist(updatedPlaylist);
      fetchData(); // Refresh to get updated song list
      setShowAddSong(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Failed to add song to playlist.");
    }
  };

  const handleRemoveSong = async (songId: number) => {
    if (!id) return;

    try {
      const updatedPlaylist = await removeSongFromPlaylist(Number(id), songId);
      setPlaylist(updatedPlaylist);
      fetchData(); // Refresh to get updated song list
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Failed to remove song from playlist.");
    }
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setQueue(songs);
      playSong(songs[0]);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading playlist...</div>;
  if (error && !playlist) return <div className="p-8 text-red-500">{error}</div>;
  if (!playlist) return <div className="p-8 text-white">Playlist not found</div>;

  const availableSongs = allSongs.filter(
    (song) => !playlist.songIds?.includes(song.id)
  );

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate("/library")}
          className="text-zinc-400 hover:text-white mb-4"
        >
          ← Back to Library
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">{playlist.name}</h1>
        <p className="text-zinc-400">
          {songs.length} song{songs.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        {songs.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="px-6 py-3 bg-green-500 hover:bg-green-400 rounded-lg font-bold transition"
          >
            Play All
          </button>
        )}
        <button
          onClick={() => setShowAddSong(!showAddSong)}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold transition"
        >
          <Plus size={20} /> Add Songs
        </button>
      </div>

      {showAddSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setShowAddSong(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 rounded-full hover:bg-zinc-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">Add Songs to Playlist</h3>
            {availableSongs.length === 0 ? (
              <p className="text-zinc-400">All songs are already in this playlist.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableSongs.map((song) => (
                  <div key={song.id} className="relative group/add">
                    <SongCard song={song} />
                    <button
                      onClick={() => handleAddSong(song.id)}
                      className="absolute top-2 right-2 bg-green-500 hover:bg-green-400 text-black shadow-[0_4px_15px_rgba(34,197,94,0.4)] rounded-full p-2.5 transition-transform hover:scale-110 z-10"
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 animate-in fade-in zoom-in duration-500">
          <div className="bg-zinc-800/50 p-6 rounded-full mb-6">
            <Music size={48} className="text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white mb-2">This playlist is empty</p>
          <p className="mb-6">Find some songs and add them here to get started.</p>
          <button
            onClick={() => setShowAddSong(true)}
            className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
          >
            Find Songs
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              index={index}
              onRemove={handleRemoveSong}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaylistDetail;

