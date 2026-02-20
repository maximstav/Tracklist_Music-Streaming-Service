import { useEffect, useState, useCallback } from "react";
import { getAllSongs, type Song } from "../services/songService";
import SongCard from "../components/SongCard";
import SortableSongCard from "../components/SortableSongCard";
import { usePlayer } from "../context/PlayerContext";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

const Home = () => {
  const { setQueue, currentSong } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSong, setActiveSong] = useState<Song | null>(null);

  // PointerSensor with distance threshold so short clicks (play, add-to-playlist)
  // don't trigger a drag. TouchSensor with a small delay for mobile.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const data = await getAllSongs();
        setSongs(data);
        // Only set the queue if nothing is currently playing,
        // so navigating back to Home doesn't reset mid-playback
        if (!currentSong) {
          setQueue(data);
        }
      } catch (err) {
        setError("Failed to load songs.");
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const song = songs.find((s) => s.id === event.active.id) ?? null;
      setActiveSong(song);
    },
    [songs]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveSong(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setSongs((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    []
  );

  const handleDragCancel = useCallback(() => {
    setActiveSong(null);
  }, []);

  if (loading)
    return <div className="p-8 text-white">Loading your music...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">{getGreeting()}</h1>

      {/* Drag-and-drop sortable grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={songs.map((s) => s.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {songs.map((song) => (
              <SortableSongCard key={song.id} song={song} />
            ))}
          </div>
        </SortableContext>

        {/* Floating overlay shown while dragging */}
        <DragOverlay adjustScale>
          {activeSong ? (
            <div className="opacity-90 scale-105 shadow-2xl rounded-md">
              <SongCard song={activeSong} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Home;

