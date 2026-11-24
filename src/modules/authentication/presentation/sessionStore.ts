import { create } from 'zustand';

import type { User } from '../domain/entities';

type SessionUser = Pick<User, 'id' | 'email' | 'role' | 'status' | 'jurisdictionId'>;

interface SessionState {
  user: SessionUser | null;
  hydrated: boolean;
  restoreError: string | null;
  setUser: (user: SessionUser | null) => void;
  beginRestore: () => void;
  setRestoreError: (message: string | null) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  hydrated: false,
  restoreError: null,
  setUser: (user) => set({
    user: user && {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      jurisdictionId: user.jurisdictionId,
    },
    hydrated: true,
    restoreError: null,
  }),
  beginRestore: () => set({ hydrated: false, restoreError: null }),
  setRestoreError: (message) => set({ hydrated: true, restoreError: message }),
}));
