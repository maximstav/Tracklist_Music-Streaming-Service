import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Library,
  PlusSquare,
  LogOut,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Mic2,
  ListMusic
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { getArtistName } from "../services/songService";
import { useEffect, useState } from "react";
import { useAlbumCover } from "../hooks/useAlbumCover";
import { getMyPlaylists, type Playlist } from "../services/playlistService";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, logout } = useAuth();
  const {
    currentSong,
    isPlaying,
    pause,
    resume,
    nextSong,
    previousSong,
    seek,
    currentTime,
    duration,
    volume,
    setVolume
  } = usePlayer();

  const location = useLocation();
  const navigate = useNavigate();
  const [localTime, setLocalTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const { coverUrl } = useAlbumCover(currentSong?.albumId);

  // Sync local time with player time unless seeking
  useEffect(() => {
    if (!isSeeking) {
      setLocalTime(currentTime);
    }
  }, [currentTime, isSeeking]);

  useEffect(() => {
    if (isAuthenticated) {
      getMyPlaylists().then(data => setPlaylists(data)).catch(console.error);
    } else {
      setPlaylists([]);
    }
  }, [isAuthenticated, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTime(Number(e.target.value));
  };

  const handleSeekStart = () => setIsSeeking(true);

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const time = Number((e.target as HTMLInputElement).value);
    seek(time);
    setIsSeeking(false);
  };

  const NavLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-4 px-4 py-3 text-sm font-medium transition-colors rounded-md ${isActive
          ? "text-white bg-zinc-800/70 shadow-sm"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
          }`}
      >
        <Icon size={22} />
        {label}
      </Link>
    );
  };

  return (
    <div className={`flex h-screen w-full bg-black text-white font-sans overflow-hidden ${currentSong ? 'pb-24' : ''}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 flex flex-col border-r border-white/5 relative z-20 shadow-2xl shrink-0">
        <div className="p-6 mb-2">
          <h1 className="text-2xl font-bold flex items-center gap-3 tracking-tight">
            <MusicIcon size={32} className="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            Tracklist
          </h1>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar pb-4 gap-6">
          <nav className="flex flex-col gap-1.5 px-4">
            <NavLink to="/" icon={Home} label="Home" />
            <NavLink to="/search" icon={Search} label="Search" />
            <NavLink to="/library" icon={Library} label="Your Library" />
          </nav>

          <nav className="flex flex-col gap-1.5 px-4 border-t border-white/5 pt-6">
            <NavLink to="/add-song" icon={PlusSquare} label="Add Song" />
            <NavLink to="/artists" icon={Mic2} label="Artists" />
          </nav>

          {/* Playlists Section */}
          {isAuthenticated && playlists.length > 0 && (
            <div className="px-4 mt-2">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-3">
                Playlists
              </h3>
              <div className="flex flex-col gap-1">
                {playlists.map(playlist => (
                  <Link
                    key={playlist.id}
                    to={`/playlist/${playlist.id}`}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md truncate ${location.pathname === `/playlist/${playlist.id}`
                      ? "text-white bg-zinc-800/60"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                      }`}
                  >
                    <ListMusic size={18} className="shrink-0 text-zinc-500" />
                    <span className="truncate">{playlist.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 bg-zinc-950 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/40 rounded-md transition w-full"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-8 relative pb-32">
        {children}
      </main>

      {/* Player Bar */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/70 backdrop-blur-xl border-t border-white/10 px-6 py-3 h-24 flex items-center justify-between z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          {/* Song Info */}
          <div className="flex items-center w-[30%] min-w-[180px]">
            {coverUrl && (
              <img
                src={coverUrl}
                alt="Album Cover"
                className={`h-14 w-14 rounded-md object-cover mr-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)] bg-zinc-800 transition-all duration-500 ${isPlaying ? 'scale-105 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''}`}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="overflow-hidden">
              <div className="text-sm font-semibold hover:underline cursor-pointer truncate text-white">
                {currentSong.title}
              </div>
              <div className="text-xs text-zinc-400 hover:underline cursor-pointer truncate">
                {getArtistName(currentSong)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center w-[40%] max-w-[722px]">
            <div className="flex items-center gap-6 mb-2">
              <button className="text-zinc-400 hover:text-white"><Shuffle size={16} /></button>
              <button onClick={previousSong} className="text-zinc-400 hover:text-white"><SkipBack size={20} fill="currentColor" /></button>

              <button
                onClick={() => isPlaying ? pause() : resume()}
                className="bg-white rounded-full p-2 text-black hover:scale-105 transition"
              >
                {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
              </button>

              <button onClick={nextSong} className="text-zinc-400 hover:text-white"><SkipForward size={20} fill="currentColor" /></button>
              <button className="text-zinc-400 hover:text-white"><Repeat size={16} /></button>
            </div>

            <div className="flex items-center w-full gap-3 text-xs text-zinc-400 group/progress">
              <span className="w-10 text-right">{formatTime(localTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={localTime}
                onChange={handleSeekChange}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all group-hover/progress:h-2"
                style={{
                  background: `linear-gradient(to right, #22c55e ${duration ? (localTime / duration) * 100 : 0}%, #52525b ${duration ? (localTime / duration) * 100 : 0}%)`
                }}
              />
              <span className="w-10">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-end w-[30%] min-w-[180px] gap-2 group/volume">
            <ListMusic size={20} className="text-zinc-400 mr-2" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all group-hover/volume:h-2"
              style={{
                background: `linear-gradient(to right, #22c55e ${volume * 100}%, #52525b ${volume * 100}%)`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for the Logo
const MusicIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export default Layout;
