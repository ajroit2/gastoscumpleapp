/**
 * ============================================================
 * GASTOSCUMPLE — app.js
 * Lógica principal: Supabase + UI + Cálculo de saldos
 * Tech: Vanilla JS (ES Modules), Supabase v2 vía CDN
 * ============================================================
 */

// ── 1. CONFIGURACIÓN DE SUPABASE ────────────────────────────
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL     = 'https://dnickojgwixankcmdezk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaWNrb2pnd2l4YW5rY21kZXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1ODI3MTksImV4cCI6MjA5ODE1ODcxOX0.-HEiwgKbYGVa7nsd4Gzhpe4J1ki4HH80w7ThdUL2Blo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 2. MAPEO DE NÚCLEOS FAMILIARES ───────────────────────────
const NUCLEOS = {
  nucleo1: { nombre: 'Núcleo 1', integrantes: ['Ale', 'Edu'] },
  nucleo2: { nombre: 'Núcleo 2', integrantes: ['Adri', 'Andy'] },
};

// Mapa rápido: usuario → núcleo
const USUARIO_A_NUCLEO = {};
Object.entries(NUCLEOS).forEach(([id, nucleo]) => {
  nucleo.integrantes.forEach(u => { USUARIO_A_NUCLEO[u] = id; });
});

// ── 3. VARIABLES DE ESTADO LOCAL ──────────────────────────────
let editGastoId = null;     // ID del gasto que se está editando (null si estamos en modo creación)
let listadoGastos = [];     // Caché local de los gastos cargados

// ── 4. REFERENCIAS AL DOM ────────────────────────────────────
const elems = {
  // Dashboard
  totalGeneral:   document.getElementById('total-general'),
  cuotaNucleo:    document.getElementById('cuota-nucleo'),
  pagadoN1:       document.getElementById('pagado-nucleo1'),
  saldoN1:        document.getElementById('saldo-nucleo1'),
  badgeN1:        document.getElementById('badge-nucleo1'),
  pagadoN2:       document.getElementById('pagado-nucleo2'),
  saldoN2:        document.getElementById('saldo-nucleo2'),
  badgeN2:        document.getElementById('badge-nucleo2'),

  // Formulario
  form:           document.getElementById('form-gasto'),
  selectUsuario:  document.getElementById('select-usuario'),
  inputDetalle:   document.getElementById('input-detalle'),
  inputMonto:     document.getElementById('input-monto'),
  btnGuardar:     document.getElementById('btn-guardar'),
  btnCancelar:    document.getElementById('btn-cancelar'),
  btnText:        document.querySelector('#btn-guardar .btn-text'),
  btnSpinner:     document.querySelector('#btn-guardar .btn-spinner'),
  feedback:       document.getElementById('form-feedback'),

  // Historial
  tablaLoading:   document.getElementById('tabla-loading'),
  tablaVacia:     document.getElementById('tabla-vacia'),
  tablaWrapper:   document.getElementById('tabla-wrapper'),
  tablaBody:      document.getElementById('tabla-body'),
  historialCount: document.getElementById('historial-count'),

  // Header
  conexionEstado: document.getElementById('conexion-estado'),

  // Footer
  anio:           document.getElementById('anio'),
};

// ── 5. HELPERS DE FORMATO ────────────────────────────────────

/**
 * Formatea un número como moneda argentina.
 * @param {number} valor
 * @returns {string} Ej: "$1.234,56"
 */
function formatMoneda(valor) {
  return new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formatea una fecha ISO a string legible en español.
 * @param {string} isoString
 * @returns {string} Ej: "27 jun 2025, 14:30"
 */
function formatFecha(isoString) {
  return new Intl.DateTimeFormat('es-AR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

// ── 6. LÓGICA MATEMÁTICA DE SALDOS ──────────────────────────

/**
 * Procesa el array de gastos y calcula los saldos de cada núcleo.
 * @param {Array<{usuario: string, monto: number}>} gastos
 * @returns {{ totalGeneral, cuota, nucleo1: {pagado, saldo}, nucleo2: {pagado, saldo} }}
 */
function calcularSaldos(gastos) {
  let totalN1 = 0;
  let totalN2 = 0;

  gastos.forEach(({ usuario, monto }) => {
    const m = parseFloat(monto) || 0;
    if (USUARIO_A_NUCLEO[usuario] === 'nucleo1') totalN1 += m;
    if (USUARIO_A_NUCLEO[usuario] === 'nucleo2') totalN2 += m;
  });

  const totalGeneral = totalN1 + totalN2;
  const cuota        = totalGeneral / 2;

  return {
    totalGeneral,
    cuota,
    nucleo1: { pagado: totalN1, saldo: totalN1 - cuota },
    nucleo2: { pagado: totalN2, saldo: totalN2 - cuota },
  };
}

/**
 * Determina el texto del badge según el saldo.
 * @param {number} saldo
 * @returns {{ clase: string, texto: string }}
 */
function estadoBadge(saldo) {
  if (saldo > 0)  return { clase: 'positivo', texto: 'A favor ↑' };
  if (saldo < 0)  return { clase: 'negativo', texto: 'Debe aportar ↓' };
  return { clase: '', texto: 'Al día ✓' };
}

// ── 7. ACTUALIZACIÓN DEL DOM ─────────────────────────────────

/**
 * Actualiza las cards del dashboard con los saldos calculados.
 * @param {object} saldos — resultado de calcularSaldos()
 */
function actualizarDashboard(saldos) {
  const { totalGeneral, cuota, nucleo1, nucleo2 } = saldos;

  elems.totalGeneral.textContent = formatMoneda(totalGeneral);
  elems.cuotaNucleo.textContent  = formatMoneda(cuota);

  // Núcleo 1
  elems.pagadoN1.textContent = formatMoneda(nucleo1.pagado);
  elems.saldoN1.textContent  = formatMoneda(nucleo1.saldo);
  const bn1 = estadoBadge(nucleo1.saldo);
  elems.saldoN1.className  = `saldo-valor ${bn1.clase}`;
  elems.badgeN1.textContent = bn1.texto;
  elems.badgeN1.className  = `saldo-badge ${bn1.clase}`;

  // Núcleo 2
  elems.pagadoN2.textContent = formatMoneda(nucleo2.pagado);
  elems.saldoN2.textContent  = formatMoneda(nucleo2.saldo);
  const bn2 = estadoBadge(nucleo2.saldo);
  elems.saldoN2.className  = `saldo-valor ${bn2.clase}`;
  elems.badgeN2.textContent = bn2.texto;
  elems.badgeN2.className  = `saldo-badge ${bn2.clase}`;
}

/**
 * Renderiza todas las filas de la tabla del historial.
 * @param {Array} gastos — array de registros de Supabase
 */
function renderTabla(gastos) {
  // Actualizar contador
  const n = gastos.length;
  elems.historialCount.textContent = `${n} ${n === 1 ? 'registro' : 'registros'}`;

  if (n === 0) {
    elems.tablaWrapper.hidden = true;
    elems.tablaVacia.hidden   = false;
    return;
  }

  elems.tablaVacia.hidden   = true;
  elems.tablaWrapper.hidden = false;

  elems.tablaBody.innerHTML = gastos.map(g => {
    const nucleoId  = USUARIO_A_NUCLEO[g.usuario] || 'nucleo1';
    const nucleoNum = nucleoId === 'nucleo1' ? '1' : '2';
    const nucleoClass = nucleoId === 'nucleo1' ? 'n1' : 'n2';
    const userClass   = g.usuario.toLowerCase();

    return `
      <tr data-id="${g.id}">
        <td><span class="fecha-texto">${formatFecha(g.fecha)}</span></td>
        <td><span class="badge-usuario badge-${userClass}">${g.usuario}</span></td>
        <td><span class="badge-nucleo ${nucleoClass}">Núcleo ${nucleoNum}</span></td>
        <td>${escapeHtml(g.detalle)}</td>
        <td class="col-monto">${formatMoneda(parseFloat(g.monto))}</td>
        <td class="col-acciones">
          <div class="acciones-wrapper">
            <button type="button" class="btn-icon btn-edit" title="Editar gasto">✏️</button>
            <button type="button" class="btn-icon btn-delete" title="Eliminar gasto">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Escapa caracteres HTML para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── 8. LECTURA DESDE SUPABASE ────────────────────────────────

/**
 * Carga todos los gastos desde la tabla `gastos` y actualiza la UI.
 * Ordenado por fecha descendente (más reciente primero).
 */
async function cargarGastos() {
  try {
    const { data: dataGastos, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;

    // Actualizar caché local
    listadoGastos = dataGastos || [];

    // Actualizar saldos en dashboard
    const saldos = calcularSaldos(listadoGastos);
    actualizarDashboard(saldos);

    // Ocultar loading y renderizar tabla
    elems.tablaLoading.hidden = true;
    renderTabla(listadoGastos);

    // Marcar como conectado
    setConexionEstado('conectado');

  } catch (err) {
    console.error('[GastosCumple] Error al cargar gastos:', err);
    elems.tablaLoading.hidden = true;
    elems.tablaVacia.hidden   = false;
    elems.tablaVacia.querySelector('p').textContent = 'Error al cargar los datos.';
    setConexionEstado('error');
  }
}

// ── 9. ESCRITURA / MODIFICACIÓN / BORRADO EN SUPABASE ──────────

/**
 * Inserta un nuevo gasto en la tabla `gastos`.
 * @param {string} usuario
 * @param {string} detalle
 * @param {number} monto
 * @returns {Promise<boolean>} true si fue exitoso
 */
async function guardarGasto(usuario, detalle, monto) {
  const { error } = await supabase
    .from('gastos')
    .insert([{ usuario, detalle, monto }]);

  if (error) {
    console.error('[GastosCumple] Error al guardar gasto:', error);
    return false;
  }
  return true;
}

/**
 * Actualiza un gasto existente en Supabase.
 * @param {number} id
 * @param {string} usuario
 * @param {string} detalle
 * @param {number} monto
 * @returns {Promise<boolean>}
 */
async function actualizarGasto(id, usuario, detalle, monto) {
  const { error } = await supabase
    .from('gastos')
    .update({ usuario, detalle, monto })
    .eq('id', id);

  if (error) {
    console.error(`[GastosCumple] Error al actualizar gasto con ID ${id}:`, error);
    return false;
  }
  return true;
}

/**
 * Elimina un gasto de Supabase.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function eliminarGasto(id) {
  const { error } = await supabase
    .from('gastos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`[GastosCumple] Error al eliminar gasto con ID ${id}:`, error);
    return false;
  }
  return true;
}

// ── 10. MANEJO DEL FORMULARIO E INTERACCIONES ─────────────────

/**
 * Muestra u oculta el estado de carga del botón.
 * @param {boolean} loading
 */
function setBtnLoading(loading) {
  elems.btnGuardar.disabled  = loading;
  if (elems.btnCancelar) elems.btnCancelar.disabled = loading;
  elems.btnText.hidden       = loading;
  elems.btnSpinner.hidden    = !loading;
}

/**
 * Muestra un mensaje de feedback al usuario.
 * @param {string} mensaje
 * @param {'exito'|'error'} tipo
 */
function mostrarFeedback(mensaje, tipo) {
  elems.feedback.textContent  = mensaje;
  elems.feedback.className    = `form-feedback ${tipo}`;
  elems.feedback.hidden       = false;
  // Auto-ocultar después de 4 segundos
  setTimeout(() => { elems.feedback.hidden = true; }, 4000);
}

/**
 * Activa el modo edición para un gasto específico.
 * @param {number} id
 */
function activarEdicionGasto(id) {
  const gasto = listadoGastos.find(g => g.id == id);
  if (!gasto) return;

  editGastoId = id;

  // Llenar campos
  elems.selectUsuario.value = gasto.usuario;
  elems.inputDetalle.value   = gasto.detalle;
  elems.inputMonto.value     = gasto.monto;

  // Actualizar UI del formulario
  elems.btnText.textContent  = 'Actualizar Gasto';
  elems.btnCancelar.hidden    = false;

  // Hacer scroll suave hacia el formulario
  document.querySelector('.section-form').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Cancela el modo de edición y limpia el formulario.
 */
function cancelarEdicionGasto() {
  editGastoId = null;
  elems.form.reset();

  // Restaurar UI del formulario
  elems.btnText.textContent  = 'Guardar Gasto';
  elems.btnCancelar.hidden    = true;
}

// Listener del formulario
elems.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuario = elems.selectUsuario.value.trim();
  const detalle = elems.inputDetalle.value.trim();
  const monto   = parseFloat(elems.inputMonto.value);

  // Validaciones básicas
  if (!usuario) {
    mostrarFeedback('⚠️ Seleccioná quién pagó.', 'error');
    elems.selectUsuario.focus();
    return;
  }
  if (!detalle) {
    mostrarFeedback('⚠️ Ingresá el detalle del gasto.', 'error');
    elems.inputDetalle.focus();
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    mostrarFeedback('⚠️ Ingresá un monto válido mayor a $0.', 'error');
    elems.inputMonto.focus();
    return;
  }

  setBtnLoading(true);
  
  let exito = false;
  if (editGastoId) {
    // Modo Edición
    exito = await actualizarGasto(editGastoId, usuario, detalle, monto);
  } else {
    // Modo Creación
    exito = await guardarGasto(usuario, detalle, monto);
  }

  setBtnLoading(false);

  if (exito) {
    mostrarFeedback(
      editGastoId 
        ? `✅ Gasto actualizado con éxito.` 
        : `✅ Gasto de ${formatMoneda(monto)} guardado para ${usuario}.`, 
      'exito'
    );
    cancelarEdicionGasto();
    // Recargar tabla y dashboard
    await cargarGastos();
  } else {
    mostrarFeedback('❌ Hubo un error al procesar el gasto. Intentá de nuevo.', 'error');
  }
});

// Listener del botón Cancelar
elems.btnCancelar.addEventListener('click', cancelarEdicionGasto);

// Delegación de eventos en la tabla para Editar y Eliminar
elems.tablaBody.addEventListener('click', async (e) => {
  const btnIcon = e.target.closest('.btn-icon');
  if (!btnIcon) return;

  const tr = btnIcon.closest('tr');
  const id = tr.dataset.id;

  if (btnIcon.classList.contains('btn-edit')) {
    activarEdicionGasto(id);
  } 
  else if (btnIcon.classList.contains('btn-delete')) {
    const gasto = listadoGastos.find(g => g.id == id);
    const detalleGasto = gasto ? `"${gasto.detalle}" por ${formatMoneda(gasto.monto)}` : 'este gasto';

    if (confirm(`¿Estás seguro de que querés eliminar ${detalleGasto}?`)) {
      setConexionEstado('conectando');
      const exito = await eliminarGasto(id);
      if (exito) {
        mostrarFeedback('🗑️ Gasto eliminado correctamente.', 'exito');
        // Si estábamos editando el mismo que borramos, reseteamos el form
        if (editGastoId == id) {
          cancelarEdicionGasto();
        }
        await cargarGastos();
      } else {
        mostrarFeedback('❌ Error al eliminar el gasto.', 'error');
        setConexionEstado('conectado');
      }
    }
  }
});

// ── 11. SUSCRIPCIÓN REALTIME ─────────────────────────────────

/**
 * Activa la suscripción Realtime de Supabase para que la app
 * se actualice automáticamente cuando otro usuario carga, edita o borra un gasto.
 */
function activarRealtime() {
  supabase
    .channel('gastos-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'gastos' },
      (payload) => {
        console.log('[GastosCumple] Cambio en tiempo real:', payload);
        cargarGastos(); // Recargar todo al detectar cambios
      }
    )
    .subscribe((status) => {
      console.log('[GastosCumple] Realtime status:', status);
    });
}

// ── 12. ESTADO DE CONEXIÓN ───────────────────────────────────

/**
 * Actualiza el badge de conexión en el header.
 * @param {'conectado'|'error'|'conectando'} estado
 */
function setConexionEstado(estado) {
  const textos = {
    conectado:  'Conectado',
    error:      'Sin conexión',
    conectando: 'Conectando…',
  };
  elems.conexionEstado.className    = `header-badge ${estado}`;
  elems.conexionEstado.querySelector('.badge-text').textContent = textos[estado] || estado;
}

// ── 13. INICIALIZACIÓN ───────────────────────────────────────

/**
 * Punto de entrada principal de la aplicación.
 */
async function init() {
  // Año en el footer
  elems.anio.textContent = new Date().getFullYear();

  // Cargar datos iniciales
  await cargarGastos();

  // Activar actualizaciones en tiempo real
  activarRealtime();
}

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
