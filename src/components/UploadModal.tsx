import React, { useState, useRef } from 'react';
import { Upload, X, Music, CheckCircle2, AlertCircle, Link as LinkIcon, Search, DownloadCloud, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc as firestoreDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveSongLocally } from '../lib/db';
import { GoogleGenAI, Type } from "@google/genai";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
}

type Tab = 'file' | 'link' | 'youtube';

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchYouTube = async () => {
    if (!query.trim()) return;
    setIsUploading(true);
    setError(null);
    setYoutubeResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = activeTab === 'youtube' 
        ? `Search YouTube for "${query}" and return the top 4 results. For each result, provide: title, artist/channel, coverUrl (thumbnail), and a mock duration. Return only JSON as an array of objects.`
        : `Extract music track metadata from this URL: "${query}". Return only JSON as an array with ONE object containing: title, artist, coverUrl, and duration.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                artist: { type: Type.STRING },
                coverUrl: { type: Type.STRING },
                duration: { type: Type.STRING }
              },
              required: ["title", "artist", "coverUrl"]
            }
          }
        }
      });

      const results = JSON.parse(response.text);
      setYoutubeResults(results);
    } catch (err: any) {
      console.error(err);
      setError(`Search error: ${err.message || 'Please try again'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const importSong = async (song: any) => {
    if (!auth.currentUser) return;
    setImportingId(song.title);
    setIsUploading(true);
    setError(null);

    try {
      // Use proxy to bypass CORS
      const targetUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
      const proxyUrl = `/api/download?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Could not access the original audio file');
      const audioBlob = await response.blob();

      // Upload to Firebase Storage for cloud persistence
      const storageRef = ref(storage, `songs/${auth.currentUser.uid}/${Date.now()}-${song.title}.mp3`);
      const uploadResult = await uploadBytes(storageRef, audioBlob);
      const audioUrl = await getDownloadURL(uploadResult.ref);

      const songData = {
        title: song.title,
        artist: song.artist,
        ownerId: auth.currentUser.uid,
        duration: song.duration || '4:10',
        genre: activeTab === 'youtube' ? 'YouTube' : 'Web Link',
        coverUrl: song.coverUrl,
        audioUrl: audioUrl,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'songs'), songData);
      
      // Clean data for IndexedDB (No FieldValue)
      await saveSongLocally({
        id: docRef.id,
        title: song.title,
        artist: song.artist,
        audioData: audioBlob,
        coverUrl: song.coverUrl,
        audioUrl: audioUrl,
        duration: song.duration || '4:10',
        genre: songData.genre,
        ownerId: auth.currentUser.uid
      });

      onUpload();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(`Save error: ${err.message || 'Could not add song'}`);
    } finally {
      setIsUploading(false);
      setImportingId(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid audio file');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      if (!auth.currentUser) throw new Error('You must be signed in first');

      // Upload to Firebase Storage
      const storageRef = ref(storage, `songs/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const audioUrl = await getDownloadURL(uploadResult.ref);

      const songMetadata = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: auth.currentUser.displayName || 'Unknown Artist',
        ownerId: auth.currentUser.uid,
        duration: '3:30',
        genre: 'Local Upload',
        coverUrl: `https://picsum.photos/seed/${file.name}/400/400`,
        audioUrl: audioUrl,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'songs'), songMetadata);
      await saveSongLocally({
        id: docRef.id,
        title: songMetadata.title,
        artist: songMetadata.artist,
        audioData: file,
        coverUrl: songMetadata.coverUrl,
        audioUrl: audioUrl,
        duration: songMetadata.duration,
        genre: songMetadata.genre,
        ownerId: auth.currentUser.uid
      });
      onUpload();
      onClose();
    } catch (err: any) {
      setError(`Upload error: ${err.message || 'An unknown error occurred'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Add Music</h2>
                <p className="text-slate-500 text-sm">Choose your preferred method to build your library</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-8">
              <button onClick={() => setActiveTab('file')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'file' ? 'bg-slate-800 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                <Upload className="w-4 h-4" /> Upload File
              </button>
              <button onClick={() => setActiveTab('youtube')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'youtube' ? 'bg-slate-800 text-red-500 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                <Youtube className="w-4 h-4" /> YouTube
              </button>
              <button onClick={() => setActiveTab('link')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'link' ? 'bg-slate-800 text-brand shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                <LinkIcon className="w-4 h-4" /> Link
              </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium"><AlertCircle className="w-5 h-5 shrink-0" /> {error} </div>}

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {activeTab === 'file' && (
                !isUploading ? (
                  <>
                    <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <div className="border-2 border-dashed border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-brand/50 hover:bg-slate-800/30 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center group-hover:scale-105 group-hover:bg-brand group-hover:text-white transition-all"><Upload className="w-8 h-8 text-slate-700 group-hover:text-white" /></div>
                      <div className="text-center">
                        <p className="text-slate-300 font-bold">Upload from your device</p>
                        <p className="text-slate-500 text-xs mt-1 font-medium italic">MP3, WAV (Max 20MB)</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-20 flex flex-col items-center gap-6">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-20 h-20 border-4 border-slate-800 border-t-brand rounded-full" />
                    <p className="text-slate-300 font-bold">Uploading...</p>
                  </div>
                )
              )}

              {(activeTab === 'youtube' || activeTab === 'link') && (
                <div className="space-y-6">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder={activeTab === 'youtube' ? "Search YouTube for song or artist..." : "Paste song link here..."}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 pl-14 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/10 focus:bg-slate-900 transition-all text-white placeholder:text-slate-600"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchYouTube()}
                    />
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <button 
                        onClick={searchYouTube}
                        disabled={isUploading || !query}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'youtube' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:opacity-90'} disabled:bg-slate-800 disabled:text-slate-600`}
                      >
                      {activeTab === 'youtube' ? 'Search' : 'Get Info'}
                    </button>
                  </div>

                  {isUploading && !importingId && (
                    <div className="py-10 flex flex-col items-center gap-4">
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className={`w-12 h-12 rounded-full flex items-center justify-center ${activeTab === 'youtube' ? 'bg-red-900/20 text-red-500' : 'bg-brand/20 text-brand'}`}>
                        <Search className="w-6 h-6" />
                      </motion.div>
                      <p className="text-xs font-bold text-slate-500">Searching...</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {youtubeResults.map((song, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx} 
                        className="bg-slate-950 border border-slate-900 p-4 rounded-3xl flex items-center gap-4 group"
                      >
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md shrink-0 bg-slate-900 relative">
                           <img src={song.coverUrl || undefined} className="w-full h-full object-cover" alt="thumb" referrerPolicy="no-referrer" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Youtube className="text-white w-6 h-6" />
                           </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white truncate mb-0.5">{song.title}</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase truncate mb-3">{song.artist}</p>
                          <button 
                            disabled={isUploading}
                            onClick={() => importSong(song)}
                            className="flex items-center justify-center gap-2 bg-slate-900 text-white border border-slate-800 w-full py-2 rounded-xl text-[10px] font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm"
                          >
                            {importingId === song.title ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <DownloadCloud className="w-3 h-3" />
                            )}
                            Import to Library
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 pt-8 border-t border-slate-800">
              <div className="flex items-center gap-2 text-slate-600 text-[10px] uppercase tracking-wider font-bold"><CheckCircle2 className="w-3 h-3 text-brand" /> Offline Support</div>
              <div className="flex items-center gap-2 text-slate-600 text-[10px] uppercase tracking-wider font-bold"><CheckCircle2 className="w-3 h-3 text-brand" /> Cloud Sync</div>
              <div className="flex items-center gap-2 text-slate-600 text-[10px] uppercase tracking-wider font-bold"><CheckCircle2 className="w-3 h-3 text-brand" /> Free Forever</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

