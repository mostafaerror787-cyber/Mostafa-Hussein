import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Camera, Music, User, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song } from '../types';

interface EditModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function EditModal({ song, isOpen, onClose, onUpdate, onDelete }: EditModalProps) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [coverUrl, setCoverUrl] = useState(song.coverUrl);
  const [audioUrl, setAudioUrl] = useState(song.audioUrl || '');
  const [genre, setGenre] = useState(song.genre || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const handleAudioReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage('Preparing upload...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setStatusMessage('Uploading to server...');
      setUploadProgress(50);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Replacement failed');
      }

      const result = await response.json();
      const downloadUrl = result.url;

      setUploadProgress(100);
      setAudioUrl(downloadUrl);
      setGenre('Local Update');
      setStatusMessage('Update complete!');
    } catch (err: any) {
      console.error('Replacement upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setStatusMessage('');
      }, 1000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTitle(song.title);
      setArtist(song.artist);
      setCoverUrl(song.coverUrl);
      setAudioUrl(song.audioUrl || '');
      setGenre(song.genre || '');
    }
  }, [song.id, isOpen]);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist,
          coverUrl,
          audioUrl,
          genre
        })
      });

      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete();
        onClose();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }} 
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">Edit Track</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Replace Audio File Section */}
              <div className="p-5 bg-slate-950 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-brand" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Replace Audio Source</span>
                  </div>
                  {isUploading && (
                    <span className="text-[9px] font-bold text-brand animate-pulse">{statusMessage}</span>
                  )}
                </div>

                {isUploading ? (
                  <div className="h-10 bg-slate-900 rounded-xl flex items-center px-4 relative overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="absolute inset-0 bg-brand/20 border-r border-brand/50"
                    />
                    <span className="relative z-10 text-[10px] font-medium text-slate-400">Uploading... {uploadProgress}%</span>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:border-brand/40 hover:bg-slate-800/40 transition-all group">
                    <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-brand/20 transition-colors">
                      <Save className="w-4 h-4 text-slate-500 group-hover:text-brand" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-300 group-hover:text-white">Replace Audio File</p>
                      <p className="text-[9px] text-slate-600">Select new MP3 or WAV file</p>
                    </div>
                    <input type="file" accept="audio/*" className="hidden" onChange={handleAudioReplace} />
                  </label>
                )}
              </div>

              {/* Cover Preview & Edit */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 relative group">
                  <img 
                    src={coverUrl || undefined} 
                    alt="Cover" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white w-6 h-6" />
                  </div>
                </div>
                <input 
                  type="text" 
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Cover Image URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-xs font-medium text-slate-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand/50"
                />
              </div>

              {/* Title & Artist */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Title</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 pl-14 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                    <Music className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Artist</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 pl-14 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Audio Source URL</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 pl-14 text-sm font-medium text-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                    <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4">
                <button 
                  onClick={handleUpdate}
                  disabled={isLoading || isDeleting}
                  className="w-full flex items-center justify-center gap-2 bg-brand hover:opacity-90 text-white py-4 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-brand/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
