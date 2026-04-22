import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: { isOpen: boolean, onClose: () => void, onUploadSuccess: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setError('File is too large. Maximum size is 100MB.');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid audio file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage('Preparing upload...');
    setError(null);
    setIsSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setStatusMessage('Uploading audio file...');
      setUploadProgress(30);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Upload failed: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const audioUrl = result.url;
      
      setUploadProgress(70);
      setStatusMessage('Saving metadata...');

      const songMetadata = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        ownerId: 'anonymous',
        duration: '3:30',
        genre: 'Local Upload',
        coverUrl: `https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400`,
        audioUrl: audioUrl,
        isLiked: false
      };
      
      const saveResponse = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songMetadata)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save song metadata');
      }

      setUploadProgress(100);
      setIsSuccess(true);
      onUploadSuccess();
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Upload failure:', err);
      setError(`Upload error: ${err.message}`);
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
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Upload Song</h2>
                {isSuccess ? (
                  <p className="text-brand text-sm font-bold flex items-center gap-2 mt-1">
                    <CheckCircle2 className="w-4 h-4" /> Cloud sync complete!
                  </p>
                ) : (
                  <p className="text-slate-500 text-sm mt-1">Add to your personal library</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium"><AlertCircle className="w-5 h-5 shrink-0" /> {error} </div>}

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {!isUploading ? (
                  <>
                    <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <div className="border-2 border-dashed border-slate-800 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-6 hover:border-brand/50 hover:bg-slate-800/20 transition-all cursor-pointer group shadow-inner" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center group-hover:scale-105 group-hover:bg-brand group-hover:text-white transition-all shadow-lg shadow-black/40"><Upload className="w-10 h-10 text-slate-700 group-hover:text-white" /></div>
                      <div className="text-center">
                        <p className="text-xl text-slate-200 font-bold mb-1">Select audio file</p>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Supported formats: MP3, WAV, M4A</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-16 flex flex-col items-center gap-8">
                    <div className="relative">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-32 h-32 border-4 border-slate-800 border-t-brand rounded-full shadow-[0_0_20px_rgba(30,215,96,0.1)]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-white tracking-tighter">{uploadProgress}%</span>
                      </div>
                    </div>
                    <div className="w-full max-w-sm h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-brand rounded-full shadow-[0_0_15px_rgba(30,215,96,0.5)]"
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-white font-bold text-lg tracking-tight">
                        {statusMessage || 'Transmitting data...'}
                      </p>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Processing your track</p>
                    </div>
                  </div>
                )
              }
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

