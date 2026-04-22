import React, { useState } from 'react';
import { Play, Edit2, Trash2, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Song } from '../types';
import EditModal from './EditModal';

interface TrackCardProps {
  key?: string | number;
  song: Song;
  onPlay: (song: Song) => void;
  onUpdate: () => void;
  onDelete: () => void;
  isManageMode?: boolean;
  userEmail?: string | null;
}

export default function TrackCard({ song, onPlay, onUpdate, onDelete, isManageMode, userEmail, onToggleLike }: TrackCardProps & { onToggleLike?: () => void }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const isAdmin = userEmail === 'mostafaerror787@gmail.com';

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${song.title}"?`)) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/songs/${song.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete();
      } else {
        throw new Error('Failed to delete on server');
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error.message}`);
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
            src={song.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60'} 
            alt={song.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 z-10"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60';
            }}
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
            {isAdmin && (
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`p-2 backdrop-blur-md rounded-xl transition-all pointer-events-auto ${song.isLiked ? 'bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-black/50 text-white hover:text-red-500'}`}
              >
                <Heart className="w-3.5 h-3.5" fill={song.isLiked ? 'currentColor' : 'transparent'} />
              </motion.button>
            )}
            
            {isAdmin && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditOpen(true);
                }}
                className={`p-2 bg-black/50 backdrop-blur-md rounded-xl text-white hover:bg-brand transition-all pointer-events-auto ${isManageMode ? 'hidden' : ''}`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            
            {isAdmin && isManageMode && (
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
