export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: string;
  genre: string;
  ownerId?: string;
  isLiked?: boolean;
  audioUrl?: string;
  createdAt?: any;
}

export type PlaybackState = 'playing' | 'paused' | 'stopped';
export type RepeatMode = 'off' | 'all' | 'one';
