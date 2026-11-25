// Guía: Ejecuta las pruebas automatizadas de dominio y adaptadores con datos de prueba.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadTypeScript(relativePath, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  const resolve = (specifier) => {
    if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
    assert.ok(specifier.startsWith('@/'), specifier);
    return loadTypeScript(`src/${specifier.slice(2)}.ts`);
  };
  new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports);
  return module.exports;
}

function monitoringHarness({ flushResult = true, rows = [], databaseError } = {}) {
  const previousDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const previousDev = global.__DEV__;
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@sentry.invalid/1';
  global.__DEV__ = false;
  let canFlush = flushResult;
  const captured = [];
  const queries = [];
  const database = {
    async execAsync(query) { queries.push([query]); },
    async getFirstAsync() { return { id: '11111111-1111-4111-8111-111111111111' }; },
    async getAllAsync() { return rows; },
    async runAsync(...args) { queries.push(args); },
  };
  const sentry = {
    withScope(callback) { callback({ setTag() {} }); },
    captureException(error) { captured.push(error); return 'event-id'; },
    async flush() { return canFlush; },
    init() {},
  };
  const monitoring = loadTypeScript('src/shared/monitoring/sentry.ts', {
    'react-native': { Platform: { OS: 'android', Version: 1 } },
    '@sentry/react-native': sentry,
    'expo-constants': { expoConfig: { version: 'test' } },
    'expo-device': {
      DeviceType: { UNKNOWN: 0, PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 },
      deviceType: 1,
    },
    'expo-sqlite': {
      openDatabaseAsync: async () => {
        if (databaseError) throw databaseError;
        return database;
      },
    },
  });
  if (previousDsn === undefined) delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  else process.env.EXPO_PUBLIC_SENTRY_DSN = previousDsn;
  if (previousDev === undefined) delete global.__DEV__;
  else global.__DEV__ = previousDev;
  return {
    ...monitoring,
    captured,
    queries,
    setFlushResult(value) { canFlush = value; },
  };
}

test('Sentry: confirma el envío y no registra el mensaje original', async () => {
  const monitoring = monitoringHarness();
  const result = await monitoring.reportOperationalError(
    new Error('Cédula 1710034065 y voto'),
    'ACTA_LOCAL_SAVE_FAILED',
    'veedor/acta',
  );
  assert.deepEqual(result, { queued: false, sent: true });
  assert.equal(monitoring.captured.length, 1);
  assert.equal(monitoring.captured[0].message, 'ACTA_LOCAL_SAVE_FAILED');
  assert.equal(monitoring.queries.length, 0);
});

test('Sentry: conserva en SQLite los eventos no confirmados y respeta los reintentos', async () => {
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const monitoring = monitoringHarness({
      flushResult: false,
      rows: [{
        id: 'pending-id',
        code: 'SYNC_QUEUE_READ_FAILED',
        screen: 'sincronizacion/outbox',
        version: '1.0.0',
        fecha: '2026-01-01T00:00:00.000Z',
        intentos: 2,
      }],
    });
    const result = await monitoring.reportOperationalError(
      new Error('Datos privados que no deben enviarse'),
      'SYNC_QUEUE_READ_FAILED',
      'sincronizacion/outbox',
    );
    assert.deepEqual(result, { queued: true, sent: false });
    assert.ok(monitoring.queries.some(([query]) => String(query).includes('INSERT OR REPLACE')));

    assert.equal(await monitoring.flushPendingErrors(), 0);
    assert.ok(monitoring.queries.some(([query]) => String(query).includes('SET intentos = intentos + 1')));

    monitoring.setFlushResult(true);
    assert.equal(await monitoring.flushPendingErrors(), 1);
    assert.ok(monitoring.queries.some(([query]) => String(query).includes('DELETE FROM errores_pendientes')));
    assert.equal(errors.length, 2);
  } finally {
    console.error = originalError;
  }
});

test('Sentry: informa si no puede persistir un evento en SQLite', async () => {
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const monitoring = monitoringHarness({ databaseError: new Error('detalle interno que no debe registrarse') });
    const result = await monitoring.reportOperationalError(
      new Error('mensaje privado'),
      'PHOTO_CAPTURE_FAILED',
      'veedor/acta',
      true,
    );
    assert.deepEqual(result, { queued: false, sent: false });
    assert.equal(errors.length, 1);
    assert.match(errors[0][0], /PHOTO_CAPTURE_FAILED/);
    assert.doesNotMatch(errors[0][0], /detalle interno|mensaje privado/);
  } finally {
    console.error = originalError;
  }
});

const { RegisterActaUseCase } = loadTypeScript('src/modules/actas/domain/usecases/RegisterActaUseCase.ts');
const { consultarMesas, consultarOrganizaciones } = loadTypeScript('src/modules/territorio/domain/usecases/consultarMesas.ts');
const { consultarActasLocales } = loadTypeScript('src/modules/actas/domain/usecases/consultarActasLocales.ts');
const { gestionarAsignaciones } = loadTypeScript('src/modules/territorio/domain/usecases/gestionarAsignaciones.ts');
const { resetPassword } = loadTypeScript('src/modules/authentication/domain/usecases/resetPassword.ts');
const { primerAcceso } = loadTypeScript('src/modules/authentication/domain/usecases/firstAccess.ts');
const { RegisterUser, cedulaEcuatorianaValida, telefonoEcuatorianoValido } = loadTypeScript('src/modules/authentication/domain/usecases/registerUser.ts');
const { evaluarSeguridadClave } = loadTypeScript('src/modules/authentication/domain/usecases/passwordSecurity.ts');
const { revisarActas } = loadTypeScript('src/modules/actas/domain/usecases/revisarActas.ts');
const { enviarPendientes } = loadTypeScript('src/modules/sincronizacion/domain/usecases/enviarPendientes.ts');
const { calcularAvanceJrv } = loadTypeScript('src/modules/seguimiento/domain/usecases/calcularAvanceJrv.ts');
const { calcularMetricasGrises, leerEvidencia } = loadTypeScript('src/modules/actas/domain/usecases/leerEvidencia.ts');

function authAdapterForTest({ user, network, auth = {}, from, onClear = () => {} }) {
  const { SupabaseAuthAdapter } = loadTypeScript(
    'src/modules/authentication/data/adapters/supabase/authAdapter.ts',
    {
      '@/shared/data/supabaseClient': { supabase: { auth, from } },
      '@supabase/supabase-js': require('@supabase/supabase-js'),
      '@react-native-community/netinfo': { fetch: async () => network },
      '../sqlite/authDao': {
        SqliteAuthDao: class {
          async loadUser() { return user; }
          async clearUser() { user = null; onClear(); }
        },
      },
    },
  );
  return new SupabaseAuthAdapter();
}

test('sesión offline: restaura una cuenta activa sin consultar Supabase y mantiene bloqueada una pendiente', async () => {
  const network = { isConnected: false };
  const active = { id: 'veedor-1', status: 'ACTIVE' };
  assert.equal(await authAdapterForTest({ network, user: active }).restoreSession(), active);
  assert.equal(await authAdapterForTest({ network, user: { ...active, status: 'PENDING' } }).restoreSession(), null);
  const fresh = authAdapterForTest({ network });
  assert.equal(await fresh.restoreSession(), null);
  await assert.rejects(fresh.signIn('veedor@example.test', 'test-password'), /Conéctate a internet/);
});

test('fallo de DNS con conexión indeterminada: recupera solo el perfil activo de la misma sesión', async () => {
  const error = { message: 'java.net.UnknownHostException: Unable to resolve host' };
  const network = { isConnected: true, isInternetReachable: null };
  const active = { id: 'veedor-1', status: 'ACTIVE' };
  const auth = {
    getSession: async () => ({ data: { session: { user: { id: active.id } } }, error: null }),
    signInWithPassword: async () => ({ error }),
  };
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ error }) };
  const matching = authAdapterForTest({ network, user: active, auth, from: () => query });
  assert.equal(await matching.restoreSession(), active);
  const different = authAdapterForTest({ network, user: { ...active, id: 'otro' }, auth, from: () => query });
  assert.equal(await different.restoreSession(), null);
  await assert.rejects(matching.signIn('veedor@example.test', 'test-password'), /Conéctate a internet/);
});

test('cerrar sesión offline elimina el perfil local aunque falle la revocación remota', async () => {
  const adapter = authAdapterForTest({
    user: { id: 'veedor-1', status: 'ACTIVE' },
    network: { isConnected: false },
    auth: { signOut: async () => ({ error: { message: 'Network request failed' } }) },
  });
  await adapter.signOut();
  assert.equal(await adapter.restoreSession(), null);
});
const input = {
  autorId: 'veedor-A', jrvId: 'jrv-A', recinto: 'Recinto', numeroJrv: 1,
  recintoLat: null, recintoLon: null, dignidad: 'prefectura',
  capturedAt: '2026-11-23T15:00:00Z', lat: 0, lon: 0,
  accuracy: 12, fotoPath: 'file:///acta.jpg', calidadFoto: 'buena',
  votos: Array.from({ length: 5 }, (_, n) => ({ organizacionId: `org-${n}`, actaId: '', votos: n })),
  votosBlancos: 2, votosNulos: 1, totalSufragantes: 13,
};

test('acta válida: guarda el registro íntegro por el contrato', async () => {
  const registro = new RegisterActaUseCase({
    async guardarRegistro(actual) {
      assert.deepEqual(actual, input);
      return { id: 'acta-test', status: 'PENDING', version: 1 };
    },
  });
  assert.equal((await registro.execute(input)).status, 'PENDING');
});

test('acta inválida: rechaza totales, duplicados y coordenadas fuera de rango', async () => {
  const registro = new RegisterActaUseCase({ async guardarRegistro() { assert.fail('No debe persistir'); } });
  await assert.rejects(registro.execute({ ...input, totalSufragantes: 1 }), /suma/);
  await assert.rejects(registro.execute({ ...input, votos: Array(5).fill(input.votos[0]) }), /distintas/);
  await assert.rejects(registro.execute({ ...input, lat: 91 }), /coordenadas/);
  await assert.rejects(registro.execute({ ...input, fotoPath: '' }), /fotografía/);
  await assert.rejects(registro.execute({ ...input, accuracy: NaN }), /ubicación/);
});

test('actas descargadas: una cuenta solo recupera su listado y su foto persistente', async () => {
  const listados = new Map();
  const archivos = new Map();
  class File {
    constructor(dir, nombre) { this.uri = `${dir}/${nombre}`; }
    get exists() { return archivos.has(this.uri); }
    get size() { return archivos.get(this.uri)?.length ?? 0; }
    copy(destino) { archivos.set(destino.uri, archivos.get(this.uri)); }
    delete() { archivos.delete(this.uri); }
    static async downloadFileAsync(_url, destino) { archivos.set(destino.uri, 'foto'); return destino; }
  }
  const dependencies = {
    'expo-file-system': { File, Paths: { document: 'document', cache: 'cache' } },
    'react-native': { Platform: { OS: 'android' } },
    'expo-sqlite': { openDatabaseAsync: async () => ({
      async execAsync() {},
      async runAsync(_sql, [cuenta, datos]) { listados.set(cuenta, { datos }); },
      async getFirstAsync(_sql, [cuenta]) { return listados.get(cuenta) ?? null; },
    }) },
  };
  const cargar = () => loadTypeScript('src/modules/actas/data/adapters/sqlite/revisionActasCache.ts', dependencies).revisionActasCache;
  const cuenta = 'veedor-a:veedor';
  const actas = [{ id: 'acta-a', foto_id: 'foto-a', conteos: [{ votos: 3 }] }];
  const cache = cargar();
  await cache.guardar(cuenta, actas);
  const uri = await cache.guardarFoto(cuenta, 'foto-a', 'https://example.test/signed');
  assert.match(uri, /^document\//);
  const reiniciada = cargar();
  assert.deepEqual(await reiniciada.leer(cuenta), actas);
  assert.match(reiniciada.foto(cuenta, 'foto-a'), /^document\//);
  assert.equal(await reiniciada.leer('veedor-b:veedor'), null);
  assert.equal(reiniciada.foto('veedor-b:veedor', 'foto-a'), undefined);
  assert.equal([...archivos.keys()].some((archivo) => archivo.startsWith('cache/')), false);
});

const organizacionesConCandidaturas = input.votos.map(({ organizacionId: id }) => ({
  id,
  nombre: id,
  candidaturas: [
    { dignidad: 'alcaldia', nombre: 'Candidatura de prueba A' },
    { dignidad: 'prefectura', nombre: 'Candidatura de prueba B' },
  ],
}));

test('catálogo: exige cinco organizaciones y candidaturas de las dos dignidades', async () => {
  const mesas = [{ id: 'mesa-asignada' }];
  assert.deepEqual(await consultarMesas({ consultar: async () => mesas })(), mesas);
  const organizaciones = organizacionesConCandidaturas;
  assert.deepEqual(await consultarOrganizaciones({ listarOrganizaciones: async () => organizaciones })(), organizaciones);
  await assert.rejects(consultarOrganizaciones({ listarOrganizaciones: async () => organizaciones.slice(1) })(), /cinco/);
  const incompleto = [{ ...organizaciones[0], candidaturas: [] }, ...organizaciones.slice(1)];
  await assert.rejects(consultarOrganizaciones({ listarOrganizaciones: async () => incompleto })(), /candidatura/);
});

test('precarga del veedor: guarda las JRV y organizaciones antes de abrir el formulario offline', async () => {
  const mesas = [{ id: 'mesa-asignada' }];
  const organizaciones = organizacionesConCandidaturas;
  const cache = new Map();
  let consultas = 0;
  let version = 1;
  let fallo;
  const { cargarCatalogoVeedor, cargarOrganizaciones } = loadTypeScript('src/modules/territorio/mesasProvider.ts', {
    './data/adapters/supabase/mesasAdapter': {
      async comprobarCuentaActiva(id) { assert.equal(id, 'veedor-A'); },
      async consultarVersionCatalogo() { return version; },
      mesasAdapter: {
        async consultar() {
          consultas++;
          if (fallo) throw fallo;
          return mesas;
        },
        async listarOrganizaciones() { consultas++; return organizaciones; },
      },
    },
    './data/adapters/sqlite/catalogoAutorizado': {
      catalogoAutorizado: {
        async guardar(autor, recurso, datos, version) { cache.set(`${autor}/${recurso}`, { datos, version }); },
        async leerEntrada(autor, recurso) { return cache.get(`${autor}/${recurso}`); },
        async leer(autor, recurso) { return cache.get(`${autor}/${recurso}`)?.datos; },
      },
    },
    './domain/usecases/consultarMesas': { consultarMesas, consultarOrganizaciones },
    './domain/usecases/gestionarAsignaciones': { gestionarAsignaciones },
  });
  assert.deepEqual(await cargarCatalogoVeedor('veedor-A', false), mesas);
  assert.deepEqual(await cargarCatalogoVeedor('veedor-A', true), mesas);
  assert.deepEqual(await cargarOrganizaciones('veedor-A', true), organizaciones);
  assert.equal(consultas, 2);
  await cargarOrganizaciones('veedor-A', false);
  assert.equal(consultas, 2);
  version++;
  await cargarOrganizaciones('veedor-A', false);
  assert.equal(consultas, 3);
  fallo = new Error('fetch failed: java.net.UnknownHostException');
  assert.deepEqual(await cargarCatalogoVeedor('veedor-A', false), mesas);
  fallo = new Error('PERMISO_REVOCADO');
  await assert.rejects(cargarCatalogoVeedor('veedor-A', false), /PERMISO_REVOCADO/);
});

test('historial local: consulta con el usuario activo como filtro', async () => {
  const consultar = consultarActasLocales({ async consultarPorAutor(autorId) {
    assert.equal(autorId, 'veedor-A');
    return [{ id: 'acta-test' }];
  } });
  assert.deepEqual(await consultar('veedor-A'), [{ id: 'acta-test' }]);
});

test('asignaciones: exige motivo y envía los identificadores seleccionados', async () => {
  const useCase = gestionarAsignaciones({
    async historial() { return []; },
    async asignar(...params) { assert.deepEqual(params, ['jrv-A', 'veedor-A', 'Reemplazo', 'asignación-vigente']); },
  });
  assert.throws(() => useCase.asignar('jrv-A', 'veedor-A', '  '), /motivo/);
  await useCase.asignar('jrv-A', 'veedor-A', ' Reemplazo ', 'asignación-vigente');
});

test('recuperación: delega el código y la nueva clave al repositorio', async () => {
  await resetPassword({
    async resetWithCode(...params) {
      assert.deepEqual(params, ['cuenta@example.test', '123456', 'clave-ficticia']);
    },
  })('cuenta@example.test', '123456', 'clave-ficticia');
});

test('primer acceso: solicita el código y conserva el vínculo con la cuenta', async () => {
  const correo = 'cuenta@example.test';
  const flujo = primerAcceso({
    async enviarCodigoInicial(email) { assert.equal(email, correo); },
    async completarPrimerAcceso(...params) {
      assert.deepEqual(params, ['autor-prueba', correo, '123456', 'clave-ficticia']);
    },
  });
  await flujo.enviar(correo);
  await flujo.completar('autor-prueba', correo, '123456', 'clave-ficticia');
});

test('alta jerárquica: valida cédula y normaliza los datos antes de crear la cuenta', async () => {
  assert.equal(cedulaEcuatorianaValida('1710034065'), true);
  assert.equal(cedulaEcuatorianaValida('1710034066'), false);
  assert.equal(cedulaEcuatorianaValida('2510034065'), false);

  const register = new RegisterUser({
    async createUser(user) {
      assert.equal(user.email, 'cuenta@example.test');
      assert.equal(user.firstName, 'Camila');
      return {
        user: { id: 'perfil-test', status: 'PENDING', ...user },
        temporaryPassword: 'clave-temporal-generada-en-servidor',
      };
    },
  });
  const result = await register.execute({
    cedula: '1710034065',
    firstName: ' Camila ',
    lastName: ' Bueno ',
    phone: '099 000 0000',
    email: ' CUENTA@example.test ',
    role: 'coordinator',
    jurisdictionId: 'recinto-test',
  });
  assert.equal(result.user.status, 'PENDING');
  assert.equal(result.temporaryPassword, 'clave-temporal-generada-en-servidor');
  await assert.rejects(register.execute({
    cedula: '1710034066',
    firstName: 'Camila',
    lastName: 'Bueno',
    phone: '0990000000',
    email: 'cuenta@example.test',
    role: 'veedor',
    jurisdictionId: 'jrv-test',
  }), /cédula/i);

  // Rechaza teléfonos con dígitos de más (ej. 14 dígitos) o sin prefijo ecuatoriano
  await assert.rejects(register.execute({
    cedula: '1710034065',
    firstName: 'Camila',
    lastName: 'Bueno',
    phone: '09853929011111',
    email: 'cuenta@example.test',
    role: 'veedor',
    jurisdictionId: 'jrv-test',
  }), /10 dígitos/i);

  for (const ok of ['1710034065', '1723456784', '1715243687', '1750123455', '1720458916', '0102345675', '0912345675', '1803456787']) {
    assert.equal(cedulaEcuatorianaValida(ok), true, `Debió aceptar cédula ${ok}`);
  }
  assert.equal(telefonoEcuatorianoValido('0985392901'), true);
  assert.equal(telefonoEcuatorianoValido('+593 99 123 4567'), true);
  assert.equal(telefonoEcuatorianoValido('09853929011111'), false);
  assert.equal(telefonoEcuatorianoValido('1234567890'), false);

  assert.equal(evaluarSeguridadClave('12345678').esSegura, false);
  assert.equal(evaluarSeguridadClave('solo-minusculas').esSegura, false);
  assert.equal(evaluarSeguridadClave('Veedor2026').esSegura, true);
  assert.equal(evaluarSeguridadClave('Veedor2026@Ec').nivel, 'muy_segura');
});

test('revisión de actas: valida cuadratura y motivo al corregir, sin flujo de aprobación', async () => {
  const servicio = revisarActas({
    listar: async () => [],
    historial: async () => [],
    foto: async (ruta) => ruta,
    validarEvidencia: async (id) => assert.equal(id, 'foto-1'),
    corregir: async (id, version, datos) => {
      assert.equal(id, 'acta-1');
      assert.equal(version, 2);
      assert.equal(datos.motivo, 'Error de suma en mesa');
      return 3;
    },
  });
  assert.equal('aprobar' in servicio, false);
  const actaRemota = { id: 'acta-1', version: 2 };
  await servicio.validarEvidencia({
    ...actaRemota, foto_id: 'foto-1', storage_path: 'ruta-privada', evidencia: 'EN_REVISION',
  });
  assert.throws(() => servicio.validarEvidencia({
    ...actaRemota, foto_id: 'foto-1', storage_path: 'ruta-privada', evidencia: 'EVIDENCIA_RESPALDADA',
  }), /pendiente de validación/);
  const votosValidos = Array.from({ length: 5 }, (_, i) => ({ id: `org-${i}`, votos: 10 }));
  assert.equal(
    await servicio.corregir(actaRemota, {
      votos: votosValidos,
      blancos: 2,
      nulos: 3,
      sufragantes: 55,
      motivo: ' Error de suma en mesa ',
    }),
    3,
  );
  assert.throws(
    () => servicio.corregir(actaRemota, { votos: votosValidos, blancos: 2, nulos: 3, sufragantes: 99, motivo: 'Motivo' }),
    /conteos/,
  );
});

test('sincronización y avance JRV: detiene estados terminales, notifica fallos y distingue reportada de respaldada', async () => {
  const fallos = [];
  const estados = [];
  const sincronizar = enviarPendientes(
    {
      pendientes: async () => [{ id: 'op-1', autorId: 'v-1', datos: { fotoPath: 'file:///f.jpg' }, estado: 'PENDING', intentos: 0 }],
      cambiarEstado: async (_op, nuevoEstado, suma) => { estados.push({ nuevoEstado, suma }); },
    },
    {
      recibir: async () => { throw new Error('PERMISO_REVOCADO'); },
      evidencia: async () => 'EVIDENCIA_RESPALDADA',
    },
  );
  await sincronizar('v-1', () => true, () => {}, (_err, codigo) => fallos.push(codigo));
  assert.deepEqual(estados, [{ nuevoEstado: 'PERMISO_REVOCADO', suma: true }]);
  assert.deepEqual(fallos, ['PERMISO_REVOCADO']);

  assert.deepEqual(
    calcularAvanceJrv({
      alcaldia: { resultadoRecibido: true, evidenciaRespaldada: true },
      prefectura: { resultadoRecibido: true, evidenciaRespaldada: false },
    }),
    { reportada: true, respaldada: false },
  );
});

test('calidad de foto: acepta acta nítida sobre papel claro y rechaza foto borrosa, oscura o con reflejo', () => {
  const w = 320;
  const h = 420;
  const nitida = new Float32Array(w * h).fill(210);
  // Simula recuadros y trazos finos de texto oscuro sobre papel claro
  for (let y = 55; y < 365; y += 16) {
    for (let x = 45; x < 275; x++) {
      nitida[y * w + x] = 35;
      if (x % 9 === 0) {
        for (let dy = 2; dy < 11; dy++) nitida[(y + dy) * w + x] = 40;
      }
    }
  }

  // Desenfoque por promedio móvil de radio 4 (simula foto movida o fuera de foco)
  const borrosa = new Float32Array(w * h);
  const r = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          s += nitida[yy * w + xx];
          n++;
        }
      }
      borrosa[y * w + x] = s / n;
    }
  }

  // Pantalla oscura con mancha de reflejo saturada arriba (como foto a monitor/laptop)
  const pantallaOscura = new Float32Array(w * h).fill(28);
  for (let y = 40; y < 95; y++) {
    for (let x = 90; x < 230; x++) pantallaOscura[y * w + x] = 254;
  }

  const evaluador = leerEvidencia({
    leerPosicion: async () => null,
    tamanoDeFoto: () => 850_000,
  });

  const evalNitida = evaluador.inspeccionarFoto('file:///ok.jpg', 3000, 4000, calcularMetricasGrises(nitida, w, h));
  assert.equal(evalNitida.calidad, 'buena');

  const evalBorrosa = evaluador.inspeccionarFoto('file:///blur.jpg', 3000, 4000, calcularMetricasGrises(borrosa, w, h));
  assert.equal(evalBorrosa.calidad, 'dudosa');
  assert.match(evalBorrosa.motivo, /borrosa|desenfocada/i);

  const evalOscura = evaluador.inspeccionarFoto('file:///dark.jpg', 3000, 4000, calcularMetricasGrises(pantallaOscura, w, h));
  assert.equal(evalOscura.calidad, 'dudosa');
  assert.match(evalOscura.motivo, /oscura|reflejo/i);
});
