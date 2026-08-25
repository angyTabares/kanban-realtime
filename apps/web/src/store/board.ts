import { create } from 'zustand';
import { BoardFull } from '../lib/types';

interface BoardState {
  current: BoardFull | null;
  setBoardState: (b: BoardFull) => void;
  clear: () => void;
}

export const useBoardState = create<BoardState>((set) => ({
  current: null,
  setBoardState: (b) => set({ current: b }),
  clear: () => set({ current: null }),
}));