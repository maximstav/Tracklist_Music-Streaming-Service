import { useEffect, useState } from "react";
import { getAllArtists, createArtist, type Artist, type CreateArtistRequest } from "../services/artistService";
import { PlusCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Artists = () => {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newArtistName, setNewArtistName] = useState("");
  const [newArtistGenre, setNewArtistGenre] = useState("");

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const data = await getAllArtists();
      setArtists(data);
      setError("");
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Authentication required. Please log out and log in again.");
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || "Failed to load artists. Make sure backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtistName.trim()) {
      setError("Artist name is required.");
      return;
    }

    try {
      const artistData: CreateArtistRequest = {
        name: newArtistName.trim(),
        genre: newArtistGenre.trim() || undefined,
      };
      await createArtist(artistData);
      setNewArtistName("");
      setNewArtistGenre("");
      setShowCreateForm(false);
      setError("");
      fetchArtists();
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Authentication required. Please log out and log in again.");
      } else {
        setError(err.response?.data?.detail || err.response?.data?.message || "Failed to create artist. Make sure backend is running.");
      }
    }
  };

  if (loading) return <div className="p-8 text-white">Loading artists...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Artists</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg font-bold transition"
        >
          <PlusCircle size={20} /> Add Artist
        </button>
      </div>

      {(!isAuthenticated || !token) && (
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500 text-yellow-500 p-4 rounded-lg">
          <p className="font-bold mb-2">⚠️ Not Authenticated</p>
          <p className="text-sm mb-3">You need to be logged in to view and add artists.</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg font-bold text-sm"
          >
            Go to Login
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-sm">
          <p className="font-bold mb-1">Error:</p>
          <p>{error}</p>
          {error.includes("Authentication") && (
            <button
              onClick={() => {
                navigate("/login");
              }}
              className="mt-2 px-3 py-1 bg-green-500 hover:bg-green-400 rounded text-xs font-bold"
            >
              Re-login
            </button>
          )}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateArtist} className="mb-6 p-4 bg-zinc-800 rounded-lg">
          <div className="mb-3">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Artist Name *
            </label>
            <input
              type="text"
              value={newArtistName}
              onChange={(e) => setNewArtistName(e.target.value)}
              placeholder="e.g., The Weeknd"
              className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 focus:border-green-500 focus:outline-none"
              autoFocus
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Genre (optional)
            </label>
            <input
              type="text"
              value={newArtistGenre}
              onChange={(e) => setNewArtistGenre(e.target.value)}
              placeholder="e.g., Pop, Rock, Hip-Hop"
              className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-white border border-zinc-600 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg font-bold"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewArtistName("");
                setNewArtistGenre("");
                setError("");
              }}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {artists.length === 0 ? (
        <div className="text-zinc-400 text-center py-12">
          <p className="mb-4">No artists in database yet.</p>
          <p>Add your first artist to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className="bg-zinc-800/40 p-6 rounded-lg hover:bg-zinc-800 transition"
            >
              <h3 className="text-xl font-bold text-white mb-2">{artist.name}</h3>
              {artist.genre && (
                <p className="text-sm text-zinc-400 mb-2">Genre: {artist.genre}</p>
              )}
              <p className="text-xs text-zinc-500">ID: {artist.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Artists;
