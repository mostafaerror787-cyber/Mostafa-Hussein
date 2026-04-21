import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import TrackCard from './components/TrackCard';
import UploadModal from './components/UploadModal';
import { Song } from './types';
import { Plus, Bell, LogIn, LogOut, Search as SearchIcon, Wifi, WifiOff, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle, signOut, db } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { getLocalSongs, deleteLocalSong } from './lib/db';

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLikedView, setIsLikedView] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

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

  const handleNext = () => {
    if (!currentSongId || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSongId);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSongId(songs[nextIndex].id);
  };

  const handlePrevious = () => {
    if (!currentSongId || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentSongId);
    const previousIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSongId(songs[previousIndex].id);
  };

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSongs([]);
      return;
    }

    if (isOnline) {
      const q = query(
        collection(db, 'songs'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedSongs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Song[];
        setSongs(fetchedSongs);
      });

      return () => unsubscribe();
    } else {
      // Offline mode: Load from IndexedDB
      getLocalSongs().then(localTracks => {
        setSongs(localTracks as any);
      });
    }
  }, [user, isOnline]);

  useEffect(() => {
    if (songs.length > 0 && user) {
      const targets = songs.filter(s => 
        s.title.toLowerCase().includes('b.b king') || 
        s.title.toLowerCase().includes('wegz-elbaght') ||
        s.title.toLowerCase() === 'we' ||
        s.title.toLowerCase().includes(' we ')
      );
      
      targets.forEach(async (target) => {
        try {
          await deleteDoc(doc(db, 'songs', target.id));
          await deleteLocalSong(target.id);
          handleRemoveSong(target.id);
          console.log(`Auto-deleted: ${target.title}`);
        } catch (e) {
          console.error(`Failed auto-delete: ${target.title}`, e);
        }
      });
    }
  }, [songs.length, !!user]);

  const handleUploadComplete = () => {
    // onSnapshot will handle the update
    setIsUploadOpen(false);
  };

  const handleRemoveSong = (songId: string) => {
    setSongs(prev => prev.filter(s => s.id !== songId));
    if (currentSongId === songId) setCurrentSongId(null);
  };

  const filteredSongs = songs
    .filter(song => !isLikedView || song.isLiked)
    .filter(song => 
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(false)} 
        isLikedView={isLikedView}
        onViewChange={setIsLikedView}
      />

      <main 
        className="flex-1 overflow-y-auto h-screen pb-32 relative z-10 custom-scrollbar transition-colors duration-1000"
        style={{ 
          background: `radial-gradient(circle at 50% 0%, rgba(var(--brand-color-rgb), 0.4) 0%, rgba(0,0,0,1) 60%), #000` 
        }}
      >
        {/* Header */}
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
                  className="text-sm font-bold text-brand hover:opacity-80 transition-colors"
                >
                  Upload Song
                </button>
                <div className="flex items-center gap-3 ml-4 border-l border-slate-800 pl-4">
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">{user.displayName}</p>
                    <button onClick={() => signOut()} className="text-[10px] text-slate-500 font-bold hover:text-red-500 transition-colors">Sign Out</button>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shadow-sm">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} referrerPolicy="no-referrer" alt="profile" className="w-full h-full object-cover" />
                  </div>
                </div>
              </>
            ) : (
              <button 
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-brand/20 hover:opacity-90 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        <section className="px-8 pt-10">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-1">
                {isLikedView ? 'Liked Songs' : 'My Songs'}
              </h2>
              {!user && <p className="text-slate-500 text-sm font-medium italic">Sign in to sync your music permanently</p>}
              {user && (
                <p className="text-slate-400 text-sm font-medium">
                  {isLikedView ? `You have liked ${filteredSongs.length} songs` : `You have ${songs.length} songs ready to play`}
                </p>
              )}
            </div>
            {user && (
               <div className="flex gap-2 bg-slate-900 p-1 rounded-xl">
                 <button className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-brand shadow-sm">My Music</button>
                 <button 
                  onClick={() => setIsManageMode(!isManageMode)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isManageMode ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-500 hover:text-white'}`}
                 >
                   {isManageMode ? 'Done Managing' : 'Manage Tracks'}
                 </button>
               </div>
            )}
          </div>

          {!user ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-900 text-brand rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-brand/10">
                <SearchIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Build your library</h3>
              <p className="text-slate-500 max-w-xs text-sm leading-relaxed">Sign in and upload your songs to listen anytime, anywhere, even offline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
              <AnimatePresence>
                {filteredSongs.map((song) => (
                  <TrackCard 
                    key={song.id} 
                    song={song} 
                    onPlay={(s) => setCurrentSongId(s.id)} 
                    onUpdate={() => {}} // snapshot handles it or we could force refresh
                    onDelete={() => handleRemoveSong(song.id)}
                    isManageMode={isManageMode}
                  />
                ))}
              </AnimatePresence>
              
              {isOnline && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setIsUploadOpen(true)}
                  className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-900 flex items-center justify-center cursor-pointer group hover:border-brand/40 hover:bg-slate-900/50 transition-all"
                >
                  <div className="text-center p-4">
                    <Plus className="mx-auto mb-3 text-slate-700 group-hover:text-brand transition-colors" />
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest group-hover:text-brand">Add Song</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </section>
      </main>

      <Player 
        currentSong={currentSong} 
        onDelete={() => currentSong && handleRemoveSong(currentSong.id)}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUpload={handleUploadComplete}
      />
    </div>
  );
}
