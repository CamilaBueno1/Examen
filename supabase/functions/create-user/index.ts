import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidCedula(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{10}$/.test(value)) return false;
  const province = Number(value.slice(0, 2));
  if (province < 1 || province > 24 || Number(value[2]) > 5) return false;
  const sum = [...value.slice(0, 9)].reduce((total, digit, index) => {
    const number = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (number > 9 ? number - 9 : number);
  }, 0);
  return (10 - (sum % 10)) % 10 === Number(value[9]);
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function createTemporaryPassword() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => alphabet[byte & 63]).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { error: 'METHOD_NOT_ALLOWED' });

  const authorization = request.headers.get('Authorization');
  if (!authorization) return response(401, { error: 'AUTH_REQUIRED' });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return response(500, { error: 'SERVER_CONFIGURATION_ERROR' });

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  async function rollbackUser(authId: string, profileId?: string) {
    if (profileId) {
      const { error } = await admin.from('profile').delete().eq('id', profileId);
      if (error) console.error('create-user profile rollback failed');
    }
    const { error } = await admin.auth.admin.deleteUser(authId);
    if (error) console.error('create-user auth rollback failed');
  }

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return response(401, { error: 'AUTH_REQUIRED' });

  let input: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response(400, { error: 'INVALID_INPUT' });
    }
    input = body as Record<string, unknown>;
  } catch {
    return response(400, { error: 'INVALID_INPUT' });
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const role = input.role;
  const jurisdictionId = typeof input.jurisdictionId === 'string' ? input.jurisdictionId : '';
  const firstName = input.firstName;
  const lastName = input.lastName;
  const phone = input.phone;
  if (!isValidCedula(input.cedula)
      || !text(firstName, 2, 100)
      || !text(lastName, 2, 100)
      || !text(phone, 7, 20)
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !jurisdictionId
      || (role !== 'coordinator' && role !== 'veedor')) {
    return response(400, { error: 'INVALID_INPUT' });
  }

  const { data: actor, error: actorError } = await admin
    .from('profile')
    .select('id, rol, activo, estado_cuenta')
    .eq('auth_uid', authData.user.id)
    .maybeSingle();
  if (actorError) {
    console.error('create-user actor profile lookup failed', {
      code: actorError.code,
      message: actorError.message,
      details: actorError.details,
      hint: actorError.hint,
    });
    return response(500, { error: 'ACTOR_PROFILE_LOOKUP_FAILED' });
  }
  if (!actor || !actor.activo || actor.estado_cuenta !== 'ACTIVE') {
    return response(403, { error: 'PERMISO_REVOCADO' });
  }

  const dbRole = role === 'coordinator' ? 'coordinador_recinto' : 'veedor';
  let recintoId = jurisdictionId;
  let jrvId: string | null = null;
  if (role === 'coordinator') {
    if (actor.rol !== 'provincial') return response(403, { error: 'PERMISO_REVOCADO' });
    const { data: recinto, error } = await admin
      .from('recinto')
      .select('id')
      .eq('id', recintoId)
      .eq('provincia', 'Pichincha')
      .eq('canton', 'Rumiñahui')
      .maybeSingle();
    if (error) return response(500, { error: 'TERRITORY_LOOKUP_FAILED' });
    if (!recinto) return response(403, { error: 'PERMISO_REVOCADO' });
  } else {
    if (actor.rol !== 'coordinador_recinto') return response(403, { error: 'PERMISO_REVOCADO' });
    jrvId = jurisdictionId;
    const { data: mesa, error } = await admin
      .from('jrv')
      .select('id, recinto_id')
      .eq('id', jrvId)
      .maybeSingle();
    if (error) return response(500, { error: 'TERRITORY_LOOKUP_FAILED' });
    if (!mesa) return response(403, { error: 'PERMISO_REVOCADO' });
    const { data: asignacion, error: assignmentError } = await admin
      .from('asignacion_coordinador_recinto')
      .select('id')
      .eq('coordinador_id', actor.id)
      .eq('recinto_id', mesa.recinto_id)
      .is('hasta', null)
      .maybeSingle();
    if (assignmentError) return response(500, { error: 'ASSIGNMENT_LOOKUP_FAILED' });
    if (!asignacion) return response(403, { error: 'PERMISO_REVOCADO' });
    recintoId = mesa.recinto_id;
  }

  const { data: duplicate, error: duplicateError } = await admin
    .from('profile')
    .select('id')
    .eq('cedula', input.cedula)
    .maybeSingle();
  if (duplicateError) {
    console.error('create-user cedula lookup failed', {
      code: duplicateError.code,
      message: duplicateError.message,
      details: duplicateError.details,
      hint: duplicateError.hint,
    });
    return response(500, { error: 'CEDULA_LOOKUP_FAILED' });
  }
  if (duplicate) return response(409, { error: 'CEDULA_ALREADY_REGISTERED' });

  const temporaryPassword = createTemporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  });
  if (createError || !created.user) return response(409, { error: 'ACCOUNT_CREATION_FAILED' });

  const { data: profile, error: profileError } = await admin
    .from('profile')
    .insert({
      auth_uid: created.user.id,
      cedula: input.cedula,
      nombres: firstName.trim(),
      apellidos: lastName.trim(),
      telefono: phone.trim(),
      email,
      rol: dbRole,
      activo: false,
      estado_cuenta: 'PENDING',
    })
    .select('id, cedula, nombres, apellidos, telefono, email, rol, activo, estado_cuenta')
    .single();

  if (profileError || !profile) {
    await rollbackUser(created.user.id);
    return response(409, { error: 'PROFILE_CREATION_FAILED' });
  }

  const assignment = role === 'coordinator'
    ? await admin.rpc('crear_coordinador_asignacion', {
      p_coordinador_id: profile.id,
      p_recinto_id: recintoId,
      p_actor_id: actor.id,
      p_motivo: 'Alta jerárquica o reemplazo',
    })
    : await admin.rpc('crear_veedor_asignacion', {
      p_veedor_id: profile.id,
      p_jrv_id: jrvId,
      p_actor_id: actor.id,
      p_motivo: 'Alta jerárquica o reemplazo',
    });

  if (assignment.error) {
    await rollbackUser(created.user.id, profile.id);
    return response(409, { error: 'ASSIGNMENT_CREATION_FAILED' });
  }

  return response(201, {
    user: { id: created.user.id, email: created.user.email },
    profile,
    temporaryPassword,
  });
});
