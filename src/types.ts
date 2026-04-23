export interface Player {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  health: number;
  team: 'red' | 'blue';
}

export interface GameState {
  players: Player[];
}

export interface BulletData {
  id: string;
  origin: [number, number, number];
  direction: [number, number, number];
  timestamp: number;
}

export interface HitData {
  victimId: string;
  damage: number;
}
