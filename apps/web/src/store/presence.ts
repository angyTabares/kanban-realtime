import { create } from 'zustand';

interface PresenceStore {
  activeUserIds: string[];
  setActive: (ids: string[]) => void;
  markOnline: (userId: string) => void;
  markOffline: (userId: string) => void;
  clear: () => void;
}

export const usePresence = create<PresenceStore>((set) => ({
  activeUserIds: [],

  setActive: (ids) => set({ activeUserIds: ids }),

  markOnline: (userId) =>
    set((s) =>
      s.activeUserIds.includes(userId)
        ? s
        : { activeUserIds: [...s.activeUserIds, userId] },
    ),

  markOffline: (userId) =>
    set((s) => ({
      activeUserIds: s.activeUserIds.filter((id) => id !== userId),
    })),

  clear: () => set({ activeUserIds: [] }),
}));