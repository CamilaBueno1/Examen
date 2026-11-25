import { create } from 'zustand';

import type { User } from '../domain/entities';

type SessionUser = Pick<User, 'id' | 'email' | 'role' | 'status' | 'jurisdictionId' | 'firstName' | 'fullName'>;

interface SessionState {
  user: SessionUser | null;
  hydrated: boolean;
  restoreError: string | null;
  farewellName: string | null;
  setUser: (user: SessionUser | null) => void;
  beginRestore: () => void;
  setRestoreError: (message: string | null) => void;
  triggerFarewell: (name: string) => void;
  clearFarewell: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  hydrated: false,
  restoreError: null,
  farewellName: null,
  setUser: (user) =>
    set({
      user: user && {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        jurisdictionId: user.jurisdictionId,
        firstName: user.firstName,
        fullName: user.fullName,
      },
      hydrated: true,
      restoreError: null,
    }),
  beginRestore: () => set({ hydrated: false, restoreError: null }),
  setRestoreError: (message) => set({ hydrated: true, restoreError: message }),
  triggerFarewell: (name) =>
    set({
      user: null,
      hydrated: true,
      restoreError: null,
      farewellName: name.trim() || 'Compañero',
    }),
  clearFarewell: () => set({ farewellName: null }),
}));
