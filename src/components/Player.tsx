import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, ListMusic, MonitorSpeaker, Edit2, Heart, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song, RepeatMode } from '../types';
import { getDB, saveSongLocally } from '../lib/db';
import EditModal from './EditModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PlayerProps {
  currentSong: Song | null;
  onDelete: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export default function Player({ currentSong, onDelete, onNext, onPrevious }: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [dominantColor, setDominantColor] = useState('rgba(30, 41, 59, 1)');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSong?.coverUrl) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = currentSong.coverUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      // We want a vibrant but not too bright version for the background
      setDominantColor(`rgba(${r}, ${g}, ${b}, 1)`);
    };
  }, [currentSong?.coverUrl]);

  const handleToggleLike = async (e: React.MouseEvent) => {
    if (!currentSong) return;
    e.stopPropagation();
    setIsLiking(true);
    try {
      const newStatus = !currentSong.isLiked;
      const songRef = doc(db, 'songs', currentSong.id);
      await updateDoc(songRef, { isLiked: newStatus });

      const idb = await getDB();
      const localSong = await idb.get('songs', currentSong.id);
      if (localSong) {
        await saveSongLocally({ ...localSong, isLiked: newStatus });
      }
    } catch (err) {
      console.error('Like toggle failed:', err);
    } finally {
      setIsLiking(false);
    }
  };

  useEffect(() => {
    if (!currentSong) return;

    let objectUrl: string | null = null;
    setError(null);

    const loadAudio = async () => {
      try {
        // Clear previous state
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setAudioUrl(null);
        setError(null);

        // 1. Check local IndexedDB first
        const db = await getDB();
        const localSong = await db.get('songs', currentSong.id);
        
        if (localSong && localSong.audioData instanceof Blob) {
          console.log("Playing from local cache:", currentSong.title);
          objectUrl = URL.createObjectURL(localSong.audioData);
          setAudioUrl(objectUrl);
          setIsPlaying(true);
        } else if (currentSong.audioUrl && (currentSong.audioUrl.startsWith('http') || currentSong.audioUrl.startsWith('https'))) {
          // 2. Fallback to Cloud Storage URL if local is missing
          console.log("Playing from cloud URL:", currentSong.title);
          setAudioUrl(currentSong.audioUrl);
          setIsPlaying(true);
          
          // Background fetch to cache for offline use
          if (navigator.onLine) {
            fetch(currentSong.audioUrl, { mode: 'cors' })
              .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.blob();
              })
              .then(blob => {
                saveSongLocally({
                  id: currentSong.id,
                  title: currentSong.title,
                  artist: currentSong.artist,
                  audioData: blob,
                  coverUrl: currentSong.coverUrl,
                  audioUrl: currentSong.audioUrl,
                  duration: currentSong.duration,
                  genre: currentSong.genre,
                  ownerId: currentSong.ownerId
                });
              }).catch(err => console.warn('Background cache failed:', err));
          }
        } else {
          setAudioUrl(null);
          setError('No valid audio source found for this track.');
          setIsPlaying(false);
        }
      } catch (err: any) {
        console.error('Playback loading error:', err);
        setError(`Error loading audio: ${err.message || 'Unknown error'}`);
        setIsPlaying(false);
      }
    };

    loadAudio();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.error('Playback failed:', err);
          setError(`Playback failed: ${err.message || 'Browser blocked audio or file is invalid'}`);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, audioUrl]);

  const cycleRepeatMode = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all') {
      onNext?.();
    } else {
      setIsPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setDuration(total);
      setProgress((current / total) * 100);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-8 md:p-16 lg:p-24"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div 
                animate={{ backgroundColor: dominantColor }}
                className="absolute inset-0 opacity-20"
              />
              <div 
                className="absolute inset-0 bg-cover bg-center blur-[120px] opacity-30 scale-125"
                style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/60 to-slate-950" />
            </div>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(false)}
              className="absolute top-8 left-8 md:top-12 md:left-12 p-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl text-white shadow-2xl z-[110] transition-colors hover:bg-slate-800"
            >
              <ChevronDown className="w-6 h-6" />
            </motion.button>

            <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 relative z-10">
              <motion.div 
                layoutId="player-cover"
                onClick={() => setIsExpanded(false)}
                className="w-full max-w-sm aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/5 cursor-pointer hover:scale-[1.02] transition-transform"
              >
                <img 
                  src={currentSong.coverUrl || undefined} 
                  alt={currentSong.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              <div className="flex-1 max-w-xl w-full">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">{currentSong.title}</h2>
                    <p className="text-base text-slate-500 font-bold uppercase tracking-[0.2em]">{currentSong.artist}</p>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.8 }}
                    onClick={handleToggleLike}
                    disabled={isLiking}
                    className={`p-4 rounded-2xl transition-all ${currentSong.isLiked ? 'bg-red-600/20 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-slate-900 text-slate-500 hover:text-white'}`}
                  >
                    <Heart className="w-8 h-8" fill={currentSong.isLiked ? 'currentColor' : 'transparent'} />
                  </motion.button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <div 
                      className="h-2 bg-slate-900 rounded-full relative overflow-hidden group cursor-pointer"
                      onClick={(e) => {
                        if (audioRef.current) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const clickedProgress = x / rect.width;
                          audioRef.current.currentTime = clickedProgress * audioRef.current.duration;
                        }
                      }}
                    >
                      <div 
                        style={{ width: `${progress}%` }}
                        className="absolute top-0 left-0 h-full bg-brand rounded-full group-hover:opacity-80 transition-all duration-300 shadow-[0_0_20px_rgba(var(--brand-color-rgb),0.3)]" 
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600 font-mono font-bold tabular-nums">{formatTime(currentTime)}</span>
                      <span className="text-xs text-slate-600 font-mono font-bold tabular-nums">{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button className="text-slate-600 hover:text-slate-400 transition-colors">
                      <Shuffle className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-10">
                      <button 
                        onClick={() => onPrevious?.()}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <SkipBack className="w-10 h-10 fill-current" />
                      </button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-2xl shadow-white/10"
                      >
                        {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current translate-x-1" />}
                      </button>
                      <button 
                        onClick={() => onNext?.()}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <SkipForward className="w-10 h-10 fill-current" />
                      </button>
                    </div>
                    <button 
                      onClick={cycleRepeatMode}
                      className={`transition-colors ${repeatMode !== 'off' ? 'text-brand' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      {repeatMode === 'one' ? <Repeat1 className="w-6 h-6" /> : <Repeat className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-24 bg-slate-950 border-t border-slate-900 px-8 flex items-center justify-between fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <audio 
          ref={audioRef} 
          src={audioUrl || undefined} 
          crossOrigin="anonymous"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onTimeUpdate}
          onEnded={handleEnded}
          onError={(e) => {
            const target = e.currentTarget;
            console.error('Audio element error:', target.error);
            let msg = 'Playback error';
            if (target.error?.code === 1) msg = 'Playback aborted';
            if (target.error?.code === 2) msg = 'Network error';
            if (target.error?.code === 3) msg = 'Audio decoding failed';
            if (target.error?.code === 4) msg = 'Audio source not supported or CORS blocked';
            setError(msg);
            setIsPlaying(false);
          }}
        />

        {/* Song Info */}
        <div 
          className="flex items-center gap-4 w-1/4 cursor-pointer group"
          onClick={() => setIsExpanded(true)}
        >
          <motion.div 
            layoutId="player-cover"
            animate={{ boxShadow: `0 0 30px ${dominantColor.replace('1)', '0.3)')}` }}
            className="w-14 h-14 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-sm group-hover:scale-105 transition-transform"
          >
            <img 
              src={currentSong.coverUrl || undefined} 
              alt={currentSong.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <div className="min-w-0 flex items-center gap-3">
            <div className="truncate">
              <h4 className="text-sm font-bold text-white leading-tight truncate group-hover:text-brand transition-colors">{currentSong.title}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{currentSong.artist}</p>
              {error && <p className="text-[10px] text-red-500 font-bold animate-pulse mt-0.5">{error}</p>}
            </div>
            <div className="flex items-center gap-1">
              <motion.button 
                whileTap={{ scale: 0.8 }}
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`p-1.5 rounded-lg transition-all ${currentSong.isLiked ? 'text-red-500' : 'text-slate-600 hover:text-white'}`}
              >
                <Heart className="w-3.5 h-3.5" fill={currentSong.isLiked ? 'currentColor' : 'transparent'} />
              </motion.button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditOpen(true);
                }}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-brand transition-colors shrink-0"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl px-8">
          <div className="flex items-center gap-8">
            <button className="text-slate-600 hover:text-slate-400 transition-colors">
              <Shuffle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onPrevious?.()}
              className="text-slate-400 hover:text-brand transition-colors"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-11 h-11 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/5"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
            </button>
            <button 
              onClick={() => onNext?.()}
              className="text-slate-400 hover:text-brand transition-colors"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={cycleRepeatMode}
              className={`transition-colors ${repeatMode !== 'off' ? 'text-brand' : 'text-slate-600 hover:text-slate-400'}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-3 w-full">
            <span className="text-[10px] text-slate-500 font-mono tabular-nums">{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1 bg-slate-900 rounded-full relative overflow-hidden group cursor-pointer"
              onClick={(e) => {
                if (audioRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const clickedProgress = x / rect.width;
                  audioRef.current.currentTime = clickedProgress * audioRef.current.duration;
                }
              }}
            >
              <div 
                style={{ width: `${progress}%` }}
                className="absolute top-0 left-0 h-full bg-brand rounded-full group-hover:opacity-80 transition-all duration-300 shadow-[0_0_10px_rgba(var(--brand-color-rgb),0.5)]" 
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Extra volume controls */}
        <div className="w-1/4 flex items-center gap-4 justify-end">
          <div className="flex items-center gap-3 group">
            <Volume2 className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            <div className="w-24 h-1 bg-slate-900 rounded-full relative overflow-hidden cursor-pointer">
              <div className="absolute top-0 left-0 h-full w-[70%] bg-slate-700 group-hover:bg-brand transition-colors" />
            </div>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-900 pl-4">
            <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded-lg transition-all"><MonitorSpeaker className="w-4 h-4" /></button>
            <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-900 rounded-lg transition-all"><ListMusic className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <EditModal 
        song={currentSong} 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        onUpdate={() => {}} // snapshot handles it
        onDelete={onDelete}
      />
    </>
  );
}
