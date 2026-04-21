import React, { useState } from 'react';
import { Home, Search, Library, PlusSquare, Heart, Music2, ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <motion.button
    whileHover={{ x: 4 }}
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 w-full text-left transition-all duration-200 rounded-xl leading-none ${
      active 
        ? 'bg-slate-900 text-brand font-bold' 
        : 'text-slate-500 hover:text-white hover:bg-slate-900'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-sm font-medium">{label}</span>
  </motion.button>
);

export default function Sidebar({ isOpen, toggle, isLikedView, onViewChange, userEmail }: { 
  isOpen: boolean; 
  toggle: () => void;
  isLikedView: boolean;
  onViewChange: (isLiked: boolean) => void;
  userEmail?: string | null;
}) {
  const [isMainOpen, setIsMainOpen] = useState(true);
  const [isPlaylistsOpen, setIsPlaylistsOpen] = useState(true);

  const isAdmin = userEmail === 'mostafaerror787@gmail.com';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside 
          initial={{ x: -260 }}
          animate={{ x: 0 }}
          exit={{ x: -260 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col h-screen p-6 gap-8 shadow-sm relative z-50"
        >
          <div className="flex items-center justify-between px-2">
            <div 
              onClick={() => {
                onViewChange(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20 cursor-pointer hover:scale-105 transition-transform"
            >
              <Music2 className="text-white w-6 h-6" />
            </div>
            <button onClick={toggle} className="p-2 hover:bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {/* Main Section */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <SidebarItem 
                  icon={Home} 
                  label="All Songs" 
                  active={!isLikedView} 
                  onClick={() => {
                    onViewChange(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                />
                <SidebarItem icon={Search} label="Search" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()} />
                <SidebarItem 
                  icon={Library} 
                  label="Song Library" 
                  onClick={() => {
                    onViewChange(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                />
              </div>
            </div>

            {/* Playlists Section */}
            {isAdmin && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <SidebarItem icon={PlusSquare} label="Create Playlist" onClick={() => alert('Playlist creation coming soon!')} />
                  <SidebarItem 
                    icon={Heart} 
                    label="Liked Songs" 
                    active={isLikedView}
                    onClick={() => {
                      onViewChange(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                  />
                </div>
              </div>
            )}
          </div>

      <div className="mt-auto pt-6 border-t border-slate-900">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <p className="text-sm text-white font-bold mb-1">Upgrade to Pro</p>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">Enjoy ad-free music and high-quality audio.</p>
          <button className="w-full py-2.5 bg-brand text-white text-[11px] font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand/20 uppercase tracking-widest">
            Learn More
          </button>
        </div>
      </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
