import React, { useState } from 'react';
import { Play, Edit2, Trash2, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Song } from '../types';
import EditModal from './EditModal';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deleteLocalSong, getDB, saveSongLocally } from '../lib/db';

interface TrackCardProps {
  key?: string | number;
  song: Song;
  onPlay: (song: Song) => void;
  onUpdate: () => void;
  onDelete: () => void;
  isManageMode?: boolean;
}

export default function TrackCard({ song, onPlay, onUpdate, onDelete, isManageMode }: TrackCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiking(true);
    try {
      const newStatus = !song.isLiked;
      
      // 1. Update Firestore
      const songRef = doc(db, 'songs', song.id);
      await updateDoc(songRef, { isLiked: newStatus });

      // 2. Update Local DB
      const idb = await getDB();
      const localSong = await idb.get('songs', song.id);
      if (localSong) {
        await saveSongLocally({ ...localSong, isLiked: newStatus });
      }
    } catch (err) {
      console.error('Like toggle failed:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${song.title}"?`)) return;
    
    // Optimistic UI: Remove from list immediately
    onDelete();
    
    setIsDeleting(true);
    try {
      // Background calls
      await deleteDoc(doc(db, 'songs', song.id));
      await deleteLocalSong(song.id);
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert(`Delete failed on server: ${error.message || 'Check your connection'}`);
      // Re-fetching or let the next snapshot naturally restore it if the delete failed
      onUpdate(); 
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        className={`group bg-slate-900/40 hover:bg-slate-900 p-4 rounded-[2rem] transition-all duration-300 border border-slate-900 hover:border-slate-800 cursor-pointer relative ${isDeleting ? 'opacity-50 grayscale' : ''}`}
        onClick={() => !isDeleting && onPlay(song)}
      >
        <div className="relative aspect-square mb-4 rounded-3xl overflow-hidden shadow-sm bg-slate-950 flex items-center justify-center">
          <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover:opacity-40 blur-2xl transition-opacity duration-500" />
          <img 
            src={song.coverUrl || undefined} 
            alt={song.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 z-10"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] z-20">
            <motion.div 
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-xl shadow-brand/20"
            >
              <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
            </motion.div>
          </div>

          <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity z-30 ${isManageMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleLike}
              disabled={isLiking}
              className={`p-2 backdrop-blur-md rounded-xl transition-all pointer-events-auto ${song.isLiked ? 'bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-black/50 text-white hover:text-red-500'}`}
            >
              <Heart className="w-3.5 h-3.5" fill={song.isLiked ? 'currentColor' : 'transparent'} />
            </motion.button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditOpen(true);
              }}
              className={`p-2 bg-black/50 backdrop-blur-md rounded-xl text-white hover:bg-brand transition-all pointer-events-auto ${isManageMode ? 'hidden' : ''}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            
            {isManageMode && (
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 backdrop-blur-md rounded-xl text-white transition-all pointer-events-auto bg-red-600 shadow-lg shadow-red-900/40 scale-110"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="px-1">
          <h3 className="text-sm font-bold text-white mb-1 truncate group-hover:text-brand transition-colors">{song.title}</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{song.artist}</p>
        </div>
      </motion.div>

      <EditModal 
        song={song} 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </>
  );
}
