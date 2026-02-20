import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { getPlayUrl } from "../services/songService";
import type { Song } from "../services/songService";

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playSong: (song: Song) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextSong: () => void;
  previousSong: () => void;
  queue: Song[];
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<Song[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSong = useCallback(async (song: Song) => {
    // Check if song has an audio file
    if (!song.hasAudio) {
      alert("This song doesn't have an audio file. Please upload an audio file when creating the song.");
      return;
    }

    try {
      setIsLoading(true);
      const playUrl = await getPlayUrl(song.id);

      if (audioRef.current) {
        audioRef.current.src = playUrl;
        audioRef.current.load();
        await audioRef.current.play();
        setIsPlaying(true);
        setCurrentSong(song);
      }
    } catch (error: any) {
      setIsLoading(false);

      // More detailed error message
      const errorMsg = error.response?.data?.detail || error.message || "Unknown error";
      if (errorMsg.includes("S3") || errorMsg.includes("credentials") || errorMsg.includes("AWS")) {
        alert("Cannot play song: AWS S3 is not configured or the file doesn't exist. Please configure AWS or upload an audio file.");
      } else {
        alert(`Failed to play song: ${errorMsg}`);
      }
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Auto-play next song if available
      if (queue.length > 0 && currentSong) {
        const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
        if (currentIndex < queue.length - 1) {
          playSong(queue[currentIndex + 1]);
        }
      }
    };
    const handleLoadedData = () => setIsLoading(false);
    const handleLoadStart = () => setIsLoading(true);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("loadstart", handleLoadStart);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("loadstart", handleLoadStart);
    };
  }, [currentSong, queue, playSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (audioRef.current && currentSong) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const nextSong = useCallback(() => {
    if (queue.length > 0 && currentSong) {
      const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
      if (currentIndex < queue.length - 1) {
        playSong(queue[currentIndex + 1]);
      }
    }
  }, [queue, currentSong, playSong]);

  const previousSong = useCallback(() => {
    if (queue.length > 0 && currentSong) {
      const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
      if (currentIndex > 0) {
        playSong(queue[currentIndex - 1]);
      }
    }
  }, [queue, currentSong, playSong]);

  const addToQueue = (song: Song) => {
    setQueue((prev) => [...prev, song]);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        volume,
        playSong,
        pause,
        resume,
        stop,
        seek,
        setVolume,
        nextSong,
        previousSong,
        queue,
        setQueue,
        addToQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
