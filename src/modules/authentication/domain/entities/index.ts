// Guía: Describe al usuario electoral, su rol y el estado de su cuenta.

// Datos que el dominio necesita para identificar al usuario y su rol.
export interface User {
  id: string; // Identificador de autenticación de Supabase (auth.uid()).
  cedula?: string; // Cédula ecuatoriana única en el perfil remoto.
  firstName?: string;
  lastName?: string;
  phone?: string;
  email: string;
  fullName?: string;
  role: 'provincial' | 'coordinator' | 'veedor';
  status: 'PENDING' | 'ACTIVE' | 'DISABLED'; // Pendiente, activa o deshabilitada.
  jurisdictionId?: string; // Ámbito territorial asociado al rol.
}

export interface Profile {
  userId: string; // Vincula el perfil con User.id.
}
