import { useState, useEffect } from "react";
import { createSong, finalizeSong, type CreateSongRequest } from "../services/songService";
import { getAllArtists, type Artist } from "../services/artistService";
import { getAllAlbums, createAlbum, type Album } from "../services/albumService";
import { getUploadUrl, uploadToS3 } from "../services/mediaService";
import { useNavigate } from "react-router-dom";
import { Music, UploadCloud, FileAudio, Disc, X } from "lucide-react";

const AddSong = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [selectedArtists, setSelectedArtists] = useState<number[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Album creation modal state
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumYear, setNewAlbumYear] = useState(new Date().getFullYear().toString());
  const [newAlbumArtistId, setNewAlbumArtistId] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [albumCreateProgress, setAlbumCreateProgress] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [artistsData, albumsData] = await Promise.all([
          getAllArtists(),
          getAllAlbums(),
        ]);
        setArtists(artistsData);
        setAlbums(albumsData);
      } catch (_err) {
        setError("Failed to load artists or albums.");
      }
    };
    fetchData();
  }, []);

  const handleArtistToggle = (artistId: number) => {
    setSelectedArtists((prev) =>
      prev.includes(artistId)
        ? prev.filter((id) => id !== artistId)
        : [...prev, artistId]
    );
  };

  const handleCoverFileChange = (file: File | null) => {
    // Revoke previous preview URL to avoid memory leaks
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    } else {
      setCoverFile(null);
      setCoverPreview(null);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumTitle.trim()) {
      setError("Album title is required.");
      return;
    }
    if (!newAlbumArtistId) {
      setError("Please select an artist for the album.");
      return;
    }

    setCreatingAlbum(true);
    setError("");
    setAlbumCreateProgress("");

    try {
      let coverArtS3Key: string | undefined;

      // Upload cover image to S3 if provided
      if (coverFile) {
        try {
          setAlbumCreateProgress("Getting cover upload URL...");
          const { s3Key, uploadUrl } = await getUploadUrl(coverFile, 'covers');

          setAlbumCreateProgress("Uploading cover image to S3...");
          await uploadToS3(coverFile, uploadUrl);

          coverArtS3Key = s3Key;
          setAlbumCreateProgress("Cover uploaded!");
        } catch (uploadError: any) {
          const errorMsg = uploadError.response?.data?.detail ||
            uploadError.response?.data?.message ||
            uploadError.message || "";

          const isAwsError = errorMsg.includes("credentials") ||
            errorMsg.includes("AWS") ||
            errorMsg.includes("S3") ||
            uploadError.response?.status === 500;

          if (isAwsError) {
            setAlbumCreateProgress("AWS not configured. Creating album without cover...");
            // Continue without cover — coverArtS3Key stays undefined
          } else {
            setError(`Cover upload failed: ${errorMsg || "Unknown error"}`);
            setCreatingAlbum(false);
            setAlbumCreateProgress("");
            return;
          }
        }
      }

      setAlbumCreateProgress("Creating album...");
      const newAlbum = await createAlbum({
        title: newAlbumTitle.trim(),
        releaseYear: parseInt(newAlbumYear) || new Date().getFullYear(),
        artistId: parseInt(newAlbumArtistId),
        coverArtS3Key,
      });

      // Refresh albums list
      const updatedAlbums = await getAllAlbums();
      setAlbums(updatedAlbums);

      // Select the newly created album
      setAlbumId(newAlbum.id.toString());

      // Close modal and reset form
      setShowAlbumModal(false);
      setNewAlbumTitle("");
      setNewAlbumYear(new Date().getFullYear().toString());
      setNewAlbumArtistId("");
      handleCoverFileChange(null);
      setAlbumCreateProgress("");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to create album.");
    } finally {
      setCreatingAlbum(false);
      setAlbumCreateProgress("");
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(Math.floor(audio.duration));
      };
      audio.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      };
      audio.src = objectUrl;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUploadProgress("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!albumId) {
      setError("Album is required.");
      return;
    }
    if (selectedArtists.length === 0) {
      setError("At least one artist is required.");
      return;
    }

    setLoading(true);
    try {
      let finalS3Key: string | undefined;
      let finalDuration = parseInt(duration) || 0;

      // If audio file is provided, try to upload it
      if (audioFile) {
        try {
          setUploadProgress("Getting upload URL...");
          const { s3Key: uploadedS3Key, uploadUrl } = await getUploadUrl(audioFile);

          setUploadProgress("Uploading file to S3...");
          await uploadToS3(audioFile, uploadUrl);

          finalS3Key = uploadedS3Key;
          setUploadProgress("File uploaded successfully!");

          // Try to get duration from file if not provided
          if (!finalDuration || finalDuration < 1) {
            try {
              finalDuration = await getAudioDuration(audioFile);
              setUploadProgress("Extracted duration from file.");
            } catch (_err) {
              // Duration extraction failed; user must enter manually
            }
          }
        } catch (uploadError: any) {
          // If AWS is not configured, allow creating song without file
          const errorMsg = uploadError.response?.data?.detail ||
            uploadError.response?.data?.message ||
            uploadError.message ||
            "";

          // Check for AWS credential errors
          const isAwsError = errorMsg.includes("credentials") ||
            errorMsg.includes("AWS") ||
            errorMsg.includes("Unable to load credentials") ||
            errorMsg.includes("S3") ||
            uploadError.response?.status === 500;

          if (isAwsError) {
            setUploadProgress("AWS not configured. Creating song without audio file...");
            setError("⚠️ AWS S3 is not configured. The song will be created WITHOUT audio file. To enable audio uploads, configure AWS credentials in the backend.");
            // Continue without S3 upload - finalS3Key remains undefined
          } else {
            // For other errors, show them and stop
            setError(`Upload failed: ${errorMsg || "Unknown error"}`);
            setLoading(false);
            return;
          }
        }
      }

      if (!finalDuration || finalDuration < 1) {
        setError("Duration is required. Please provide duration or upload an audio file.");
        setLoading(false);
        return;
      }

      setUploadProgress("Creating song...");
      const songData: CreateSongRequest = {
        title: title.trim(),
        duration: finalDuration,
        albumId: parseInt(albumId),
        artistIds: selectedArtists,
        s3Key: finalS3Key,
      };

      // Use finalize if we uploaded a file, otherwise use regular create
      if (finalS3Key) {
        await finalizeSong(songData);
      } else {
        await createSong(songData);
      }

      navigate("/");
    } catch (err: any) {

      // Try to extract detailed error message
      let errorMessage = "Failed to create song.";

      if (err.response) {
        // Backend returned an error response
        const data = err.response.data;
        if (data?.detail) {
          errorMessage = data.detail;
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (data?.title) {
          errorMessage = `${data.title}: ${data.detail || 'Unknown error'}`;
        } else {
          errorMessage = `Server error: ${err.response.status} ${err.response.statusText}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
        <UploadCloud className="text-green-500" size={32} />
        Add New Song
      </h1>

      <form onSubmit={handleSubmit} className="bg-zinc-900/40 p-6 md:p-8 rounded-xl border border-white/5 space-y-8 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-12 gap-8">
          {/* Column 1: Info and Associations */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Music size={20} className="text-green-500" />
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700/50 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition focus:outline-none"
                required
                placeholder="Song title"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Album *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAlbumModal(true)}
                  className="text-xs font-semibold text-green-400 hover:text-green-300 transition"
                >
                  + Create New
                </button>
              </div>
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700/50 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition focus:outline-none appearance-none"
                required
              >
                <option value="">Select an album</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Artists * <span className="text-zinc-500 font-normal">(select at least one)</span>
              </label>
              <div className="space-y-1 max-h-60 overflow-y-auto bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 custom-scrollbar">
                {artists.length === 0 ? (
                  <p className="text-zinc-400 text-sm p-2">No artists available. Create artists first.</p>
                ) : (
                  artists.map((artist) => (
                    <label
                      key={artist.id}
                      className="flex items-center gap-3 cursor-pointer hover:bg-zinc-700/50 p-2.5 rounded-md transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedArtists.includes(artist.id)}
                        onChange={() => handleArtistToggle(artist.id)}
                        className="w-4 h-4 text-green-500 bg-zinc-900 border-zinc-600 rounded focus:ring-green-500 focus:ring-opacity-25"
                      />
                      <span className="text-white font-medium">{artist.name}</span>
                      {artist.genre && (
                        <span className="text-xs text-zinc-400 ml-auto bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/50">
                          {artist.genre}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Media Upload */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <FileAudio size={20} className="text-green-500" />
              Media
            </h2>

            <div className="bg-zinc-800/30 p-5 rounded-lg border border-zinc-700/50 border-dashed">
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Audio File (MP3) <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAudioFile(file);
                    if (!title.trim()) {
                      setTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  } else {
                    setAudioFile(null);
                  }
                }}
                className="w-full text-sm text-zinc-400
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-500 file:text-black
                  hover:file:bg-green-400 file:transition-colors
                  file:cursor-pointer"
              />
              <div className="mt-3 text-xs text-zinc-500 space-y-1">
                {audioFile ? (
                  <p className="text-green-400 font-medium">Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                ) : (
                  <p>Upload an MP3 file. Duration will be extracted automatically.</p>
                )}
                <p>Can also create song without audio file for testing.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Duration (seconds) {audioFile ? <span className="text-zinc-500 font-normal">(auto-extracted if valid)</span> : "*"}
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                className={`w-full px-4 py-3 rounded-lg bg-zinc-800 text-white border border-zinc-700/50 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition focus:outline-none ${audioFile ? 'opacity-70' : ''}`}
                required={!audioFile}
                placeholder="e.g. 210"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          {uploadProgress && (
            <div className="mb-4 text-sm font-medium text-blue-400 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              {uploadProgress}
            </div>
          )}

          {error && (
            <div className="mb-4 text-sm font-medium text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-2.5 bg-transparent hover:bg-zinc-800 text-white border border-zinc-700/50 rounded-full font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-green-500 hover:bg-green-400 text-black rounded-full font-bold shadow-[0_4px_14px_rgba(34,197,94,0.39)] hover:shadow-[0_6px_20px_rgba(34,197,94,0.39)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (audioFile ? "Uploading..." : "Creating...") : "Save Song"}
            </button>
          </div>
        </div>
      </form>

      {/* Create Album Modal */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => {
                setShowAlbumModal(false);
                setError("");
              }}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 rounded-full hover:bg-zinc-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Disc className="text-green-500" />
              Create New Album
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Album Title *
                </label>
                <input
                  type="text"
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700/50 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition focus:outline-none"
                  placeholder="Enter album title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Release Year *
                  </label>
                  <input
                    type="number"
                    value={newAlbumYear}
                    onChange={(e) => setNewAlbumYear(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700/50 focus:border-green-500 transition focus:outline-none"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Artist *
                  </label>
                  <select
                    value={newAlbumArtistId}
                    onChange={(e) => setNewAlbumArtistId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700/50 focus:border-green-500 transition focus:outline-none appearance-none"
                  >
                    <option value="">Select an artist</option>
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Cover Image <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    onChange={(e) => {
                      handleCoverFileChange(e.target.files?.[0] ?? null);
                    }}
                    className="w-full text-sm text-zinc-400
                      file:mr-4 file:py-1.5 file:px-3
                      file:rounded-full file:border-0
                      file:text-xs file:font-medium
                      file:bg-zinc-700 file:text-white
                      hover:file:bg-zinc-600 file:transition-colors file:cursor-pointer"
                  />
                  {coverPreview && (
                    <div className="mt-3 relative inline-block">
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-24 h-24 object-cover rounded-md shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleCoverFileChange(null)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-1 shadow-lg transition"
                        title="Remove cover image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {albumCreateProgress && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {albumCreateProgress}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setShowAlbumModal(false);
                  setNewAlbumTitle("");
                  setNewAlbumYear(new Date().getFullYear().toString());
                  setNewAlbumArtistId("");
                  handleCoverFileChange(null);
                  setAlbumCreateProgress("");
                  setError("");
                }}
                className="px-4 py-2 hover:bg-zinc-800 text-white rounded-md font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAlbum}
                disabled={creatingAlbum}
                className="px-6 py-2 bg-green-500 hover:bg-green-400 text-black rounded-md font-bold disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {creatingAlbum ? "Creating..." : "Save Album"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddSong;
