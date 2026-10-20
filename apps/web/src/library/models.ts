import type { Game } from '../catalog/models';

export const playStatuses = [
  { value: 'want-to-play', label: 'Want to play' },
  { value: 'playing', label: 'Playing' },
  { value: 'completed', label: 'Completed' },
  { value: 'stopped-playing', label: 'Stopped playing' },
] as const;
export type PlayStatus = (typeof playStatuses)[number]['value'];
export interface LibraryEntry {
  game: Game;
  status: PlayStatus;
}
export interface LibraryResult {
  items: LibraryEntry[];
}

export interface LibraryView {
  ready: boolean;
  statuses: ReadonlyMap<number, PlayStatus>;
  saving: ReadonlySet<number>;
  errors: ReadonlyMap<number, string>;
}
