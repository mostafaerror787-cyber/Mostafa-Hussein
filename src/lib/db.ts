import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AwtarDB extends DBSchema {
  songs: {
    key: string;
    value: {
      id: string;
      title: string;
      artist: string;
      audioData: Blob | File;
      audioUrl?: string;
      coverUrl: string;
      duration: string;
      genre: string;
      ownerId?: string;
      isLiked?: boolean;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<AwtarDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<AwtarDB>('awtar-offline-db', 1, {
      upgrade(db) {
        db.createObjectStore('songs', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

export const saveSongLocally = async (song: AwtarDB['songs']['value']) => {
  const db = await getDB();
  await db.put('songs', song);
};

export const getLocalSongs = async () => {
  const db = await getDB();
  return db.getAll('songs');
};

export const deleteLocalSong = async (id: string) => {
  const db = await getDB();
  await db.delete('songs', id);
};
