import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import TrackCard from './components/TrackCard';
import UploadModal from './components/UploadModal';
import { Song } from './types';
import { INITIAL_SONGS } from './data/songs';
import { Plus, LogIn, Search as SearchIcon, Wifi, WifiOff, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLikedView, setIsLikedView] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<{ email: string; displayName: string; photoURL?: string } | null>(() => {
    const saved = localStorage.getItem('music_app_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  // Simple local "mock" admin to keep UI familiar
  const isAdmin = user?.email === 'mostafaerror787@gmail.com';
  const currentSong = songs.find(s => s.id === currentSongId) || null;

  useEffect(() => {
    if (!currentSong?.coverUrl) {
      document.documentElement.style.setProperty('--brand-color', '#2563eb');
      document.documentElement.style.setProperty('--brand-color-rgb', '37, 99, 235');
      return;
    }

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
      
      // Update global theme
      document.documentElement.style.setProperty('--brand-color', `rgb(${r}, ${g}, ${b})`);
      document.documentElement.style.setProperty('--brand-color-rgb', `${r}, ${g}, ${b}`);
    };
  }, [currentSong?.coverUrl]);

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs');
      if (!res.ok) throw new Error('Backend unreachable');
      const data = await res.json();
      
      // Use server data as truth, falling back to INITIAL_SONGS for missing IDs
      const combined = [...data];
      
      // Add any initial songs that aren't on the server yet
      INITIAL_SONGS.forEach((s: Song) => {
        if (!combined.find(c => c.id === s.id)) {
          combined.push(s);
        }
      });
      
      setSongs(combined);
    } catch (err) {
      console.warn("Using static fallback songs:", err);
      setSongs(INITIAL_SONGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    fetchSongs();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const handleRemoveSong = async (id: string) => {
    try {
      const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSongs(prev => prev.filter(s => s.id !== id));
        if (currentSongId === id) setCurrentSongId(null);
      }
    } catch (err) {
      console.error("Failed to delete song:", err);
    }
  };

  const handleToggleLike = async (id: string, currentlyLiked: boolean) => {
    try {
      const res = await fetch(`/api/songs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLiked: !currentlyLiked })
      });
      if (res.ok) {
        const updatedSong = await res.json();
        setSongs(prev => prev.map(s => s.id === id ? updatedSong : s));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = 
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (isLikedView) return matchesSearch && song.isLiked;
    return matchesSearch;
  });

  const handleNext = () => {
    if (!currentSongId || filteredSongs.length === 0) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === currentSongId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % filteredSongs.length;
    setCurrentSongId(filteredSongs[nextIndex].id);
  };

  const handlePrevious = () => {
    if (!currentSongId || filteredSongs.length === 0) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === currentSongId);
    const previousIndex = currentIndex === -1 ? filteredSongs.length - 1 : (currentIndex - 1 + filteredSongs.length) % filteredSongs.length;
    setCurrentSongId(filteredSongs[previousIndex].id);
  };

  const mockLogin = () => {
    const mockUserData = {
      email: 'mostafaerror787@gmail.com',
      displayName: 'Mostafa Error',
      photoURL: 'https://ui-avatars.com/api/?name=Mostafa+Error'
    };
    setUser(mockUserData);
    localStorage.setItem('music_app_session', JSON.stringify(mockUserData));
  };

  const mockLogout = () => {
    setUser(null);
    setIsManageMode(false);
    localStorage.removeItem('music_app_session');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex bg-black min-h-screen text-slate-100 font-sans selection:bg-brand/30 selection:text-white overflow-hidden">
      <AnimatePresence>
        {isSidebarOpen && (
          <Sidebar 
            activeView={isLikedView ? 'liked' : 'library'} 
            onViewChange={(v) => setIsLikedView(v === 'liked')} 
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      
      <main 
        className="flex-1 overflow-y-auto h-screen pb-32 relative z-10 custom-scrollbar transition-colors duration-1000"
        style={{ 
          background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-color-rgb), 0.4) 0%, rgba(0,0,0,1) 60%), #000` 
        }}
      >
        <header className="sticky top-0 z-40 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b border-white/5 transition-colors duration-1000"
          style={{ backgroundColor: `rgba(var(--brand-color-rgb), 0.05)` }}
        >
          <div className="flex items-center gap-6 w-full max-w-2xl">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-sm"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-full w-full transition-all focus-within:ring-2 focus-within:ring-brand/20 focus-within:bg-slate-800 focus-within:shadow-sm">
              <SearchIcon className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search your library..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm w-full placeholder:text-slate-500 text-left font-medium text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              {isOnline ? (
                <><Wifi className="w-3 h-3 text-green-500" /> <span className="text-[10px] font-bold text-slate-500 uppercase">Online</span></>
              ) : (
                <><WifiOff className="w-3 h-3 text-red-500" /> <span className="text-[10px] font-bold text-slate-500 uppercase">Offline Mode</span></>
              )}
            </div>

            {user ? (
              <>
                <button 
                  onClick={() => setIsUploadOpen(true)}
                  className="text-sm font-bold text-brand hover:underline transition-all"
                >
                  + Upload Song
                </button>
                <div className="flex items-center gap-3 ml-4 border-l border-slate-800 pl-4">
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-white truncate max-w-[100px]">{user.displayName}</p>
                    <button onClick={mockLogout} className="text-[10px] text-slate-500 font-bold hover:text-red-500 transition-colors">Sign Out</button>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shadow-sm flex-shrink-0">
                    <img src={user.photoURL} referrerPolicy="no-referrer" alt="profile" className="w-full h-full object-cover" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsUploadOpen(true)}
                  className="text-sm font-bold text-brand hover:underline transition-all"
                >
                  + Upload Song
                </button>
                <button 
                  onClick={mockLogin}
                  className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-brand/20 hover:opacity-90 transition-all ml-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In (Local)
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="px-8 pt-10">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-1">
                {isLikedView ? 'Liked Songs' : 'Discovery Library'}
              </h2>
              {isLikedView ? (
                <p className="text-slate-400 text-sm font-medium">
                  You have liked {filteredSongs.length} songs
                </p>
              ) : (
                <p className="text-slate-400 text-sm font-medium">
                  {songs.length} songs ready to play
                </p>
              )}
            </div>
            {isAdmin && (
               <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
                 <button className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-brand shadow-sm">Admin Panel</button>
                 <button 
                  onClick={() => setIsManageMode(!isManageMode)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isManageMode ? 'bg-red-500/10 text-red-500' : 'text-slate-400 hover:text-white'}`}
                >
                  {isManageMode ? 'Manage Mode: ON' : 'Manage Tracks'}
                </button>
               </div>
            )}
          </div>

          <div className="pb-12">
            <AnimatePresence mode="popLayout">
              {songs.length === 0 && !loading && (
                <motion.div 
                  key="empty-library-msg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-20 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 bg-slate-900 text-brand rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-brand/10">
                    <SearchIcon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Library is empty</h3>
                  <p className="text-slate-500 max-w-xs text-sm leading-relaxed">Upload your favorite tracks to share them with the community.</p>
                </motion.div>
              )}
              
              <div key="songs-grid" className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                {filteredSongs.map((song) => (
                  <TrackCard 
                    key={song.id} 
                    song={song} 
                    onPlay={(s) => setCurrentSongId(s.id)} 
                    onUpdate={() => fetchSongs()} 
                    onDelete={() => handleRemoveSong(song.id)}
                    onToggleLike={() => handleToggleLike(song.id, song.isLiked)}
                    isManageMode={isManageMode}
                    userEmail={user?.email || null}
                  />
                ))}
                
                {isOnline && (
                  <motion.div 
                    key="add-song-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsUploadOpen(true)}
                    className="aspect-square bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-slate-900/50 hover:border-brand/40 group transition-all"
                  >
                    <div className="text-center p-4">
                      <Plus className="mx-auto mb-3 text-slate-700 group-hover:text-brand transition-colors" />
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest group-hover:text-brand">Add Song</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {currentSong && (
          <Player 
            currentSong={currentSong} 
            onUpdate={() => fetchSongs()}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onDelete={() => handleRemoveSong(currentSong.id)}
          />
        )}
      </AnimatePresence>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadSuccess={() => fetchSongs()}
      />
    </div>
  );
}
