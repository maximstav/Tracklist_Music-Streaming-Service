import { useState } from "react";
import { searchSongs, type Song } from "../services/songService";
import SongCard from "../components/SongCard";
import { Search as SearchIcon, X, SearchX } from "lucide-react";

const Search = () => {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    try {
      const results = await searchSongs(query);
      setSongs(results);
    } catch (_err) {
      setError("Failed to search songs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Search</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1 group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-white transition-colors" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, artist, or album..."
              className="w-full pl-12 pr-12 py-3 rounded-full bg-zinc-800/60 text-white border border-zinc-700/50 focus:border-green-500 focus:bg-zinc-800 focus:outline-none transition-all duration-300 shadow-inner"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black rounded-full font-bold shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {songs.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-white">
            Found {songs.length} song{songs.length !== 1 ? "s" : ""}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}

      {!loading && query && songs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400 animate-in fade-in zoom-in duration-500">
          <div className="bg-zinc-800/50 p-6 rounded-full mb-6 relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            <SearchX size={48} className="text-zinc-500 relative z-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No results found for "{query}"</h2>
          <p className="max-w-md">Please make sure your words are spelled correctly or try using less specific keywords.</p>
        </div>
      )}
    </div>
  );
};

export default Search;
