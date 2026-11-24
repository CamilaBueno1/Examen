/**
 * Domain interfaces for the Authentication module.
 */
import type { User } from '../entities';

export interface AuthRepository {
  /** Restore the current user from the persisted Supabase session. */
  restoreSession(): Promise<User | null>;

  /** End the local Supabase session. */
  signOut(): Promise<void>;

  /** Register a new user (admin flow). */
  createUser(user: Omit<User, 'id' | 'status'>): Promise<{ user: User; temporaryPassword: string }>;

  /** Authenticate with email/password. */
  signIn(email: string, password: string): Promise<User>;

  /** Verify OTP sent to email. */
  verifyOtp(email: string, otp: string): Promise<boolean>;

  /** Force password change on first login. */
  changePassword(userId: string, newPassword: string): Promise<void>;

  /** Recover password (send OTP). */
  requestPasswordReset(email: string): Promise<void>;

  /** Deactivate a profile (soft delete), preserving its assignment history. */
  deactivateUser(profileId: string): Promise<void>;
}
