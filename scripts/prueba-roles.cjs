const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadTypeScript(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  const resolve = (specifier) => {
    assert.ok(specifier.startsWith('@/'), specifier);
    return loadTypeScript(`src/${specifier.slice(2)}.ts`);
  };
  new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports);
  return module.exports;
}

const { RegisterActaUseCase } = loadTypeScript('src/modules/actas/domain/usecases/RegisterActaUseCase.ts');
const { consultarMesas, consultarOrganizaciones } = loadTypeScript('src/modules/territorio/domain/usecases/consultarMesas.ts');
const { consultarActasLocales } = loadTypeScript('src/modules/actas/domain/usecases/consultarActasLocales.ts');
const { gestionarAsignaciones } = loadTypeScript('src/modules/territorio/domain/usecases/gestionarAsignaciones.ts');
const { resetPassword } = loadTypeScript('src/modules/authentication/domain/usecases/resetPassword.ts');
const { primerAcceso } = loadTypeScript('src/modules/authentication/domain/usecases/firstAccess.ts');
const { RegisterUser, cedulaEcuatorianaValida } = loadTypeScript('src/modules/authentication/domain/usecases/registerUser.ts');
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
});

test('catálogo: conserva las JRV devueltas y exige cinco organizaciones reales', async () => {
  const mesas = [{ id: 'mesa-asignada' }];
  assert.deepEqual(await consultarMesas({ consultar: async () => mesas })(), mesas);
  const organizaciones = input.votos.map(({ organizacionId: id }) => ({ id }));
  assert.deepEqual(await consultarOrganizaciones({ listarOrganizaciones: async () => organizaciones })(), organizaciones);
  await assert.rejects(consultarOrganizaciones({ listarOrganizaciones: async () => organizaciones.slice(1) })(), /cinco/);
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
    async asignar(...params) { assert.deepEqual(params, ['jrv-A', 'veedor-A', 'Reemplazo']); },
  });
  assert.throws(() => useCase.asignar('jrv-A', 'veedor-A', '  '), /motivo/);
  await useCase.asignar('jrv-A', 'veedor-A', ' Reemplazo ');
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
});
