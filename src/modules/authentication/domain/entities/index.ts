export interface User {
  id: string; // UUID from Supabase auth (auth.uid())
  cedula?: string; // Ecuadorian ID, must be unique
  firstName?: string;
  lastName?: string;
  phone?: string;
  email: string;
  fullName?: string;
  role: 'provincial' | 'coordinator' | 'veedor';
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  jurisdictionId?: string; // province or recinto depending on role
}

export interface Profile {
  userId: string; // FK to User.id
  // Additional profile fields can be added here
}
