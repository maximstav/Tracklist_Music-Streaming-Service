import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Song } from "../services/songService";
import SongCard from "./SongCard";

interface SortableSongCardProps {
    song: Song;
}

const SortableSongCard = ({ song }: SortableSongCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: song.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
        scale: isDragging ? 1.05 : 1,
        rotate: isDragging ? "2deg" : "0deg",
        boxShadow: isDragging ? "0 25px 50px -12px rgba(0, 0, 0, 0.7)" : "none",
        zIndex: isDragging ? 50 : "auto",
        cursor: isDragging ? "grabbing" : "grab",
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <SongCard song={song} />
        </div>
    );
};

export default SortableSongCard;
