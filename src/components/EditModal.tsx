import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Camera, Music, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song } from '../types';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deleteLocalSong, saveSongLocally, getDB } from '../lib/db';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state when song prop changes
  useEffect(() => {
    if (isOpen) {
      setTitle(song.title);
      setArtist(song.artist);
      setCoverUrl(song.coverUrl);
    }
  }, [song.id, isOpen]);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      // 1. Update Firestore
      const songRef = doc(db, 'songs', song.id);
      await updateDoc(songRef, {
        title,
        artist,
        coverUrl,
        updatedAt: serverTimestamp()
      });

      // 2. Update IndexedDB (Keep the same audioData)
      const idb = await getDB();
      const localSong = await idb.get('songs', song.id);
      if (localSong) {
        await saveSongLocally({
          ...localSong,
          title,
          artist,
          coverUrl
        });
      }

      onUpdate();
      onClose();
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
      // 1. Delete from Firestore
      await deleteDoc(doc(db, 'songs', song.id));
      // 2. Delete from IndexedDB
      await deleteLocalSong(song.id);
      
      onDelete();
      onClose();
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

            <div className="space-y-6">
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
