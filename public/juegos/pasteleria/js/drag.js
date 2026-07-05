/* Sistema genérico de interacción con Pointer Events:
   - drag & drop con clon fantasma (elementos [data-drag] hacia [data-drop])
   - fallback tap-tap: tap en el origen lo selecciona, tap en el destino ejecuta
   - taps simples sobre [data-tap] / [data-drop]
   Callbacks (los provee ui.js):
     puedeArrastrar(dragId) -> bool
     puedeSoltar(dragId, dropId) -> bool
     alSoltar(dragId, dropId) -> bool  (true = éxito; false = rebote)
     alTocar(id) -> void               (tap simple sin selección activa)
     alSeleccionar(dragId|null) -> void
*/

const UMBRAL_PX = 8;

export function initDrag(raiz, cbs) {
  let activo = null; // { dragId, el, x0, y0, pointerId, fantasma, arrastrando }
  let seleccion = null; // dragId seleccionado para tap-tap

  function limpiarZonas() {
    raiz.querySelectorAll('.drop-activa').forEach((z) => z.classList.remove('drop-activa', 'drop-hover'));
  }

  function marcarZonas(dragId) {
    raiz.querySelectorAll('[data-drop]').forEach((z) => {
      if (cbs.puedeSoltar(dragId, z.dataset.drop)) z.classList.add('drop-activa');
    });
  }

  function setSeleccion(dragId) {
    if (seleccion) {
      const prev = raiz.querySelector(`[data-drag="${CSS.escape(seleccion)}"]`);
      if (prev) prev.classList.remove('seleccionada');
    }
    seleccion = dragId;
    limpiarZonas();
    if (dragId) {
      const el = raiz.querySelector(`[data-drag="${CSS.escape(dragId)}"]`);
      if (el) el.classList.add('seleccionada');
      marcarZonas(dragId);
    }
    cbs.alSeleccionar && cbs.alSeleccionar(dragId);
  }

  function crearFantasma(el, x, y) {
    const rect = el.getBoundingClientRect();
    const f = el.cloneNode(true);
    f.classList.add('drag-fantasma');
    f.classList.remove('seleccionada');
    f.style.width = rect.width + 'px';
    f.style.height = rect.height + 'px';
    f.style.left = '0';
    f.style.top = '0';
    f.dataset.ox = String(x - rect.left);
    f.dataset.oy = String(y - rect.top);
    f.dataset.x0 = String(rect.left);
    f.dataset.y0 = String(rect.top);
    moverFantasma(f, x, y);
    document.body.appendChild(f);
    return f;
  }

  function moverFantasma(f, x, y) {
    const ox = parseFloat(f.dataset.ox);
    const oy = parseFloat(f.dataset.oy);
    f.style.transform = `translate3d(${x - ox}px, ${y - oy}px, 0) scale(1.1)`;
  }

  function zonaBajo(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('[data-drop]') : null;
  }

  function terminarDrag(exito, x, y) {
    if (!activo) return;
    const { fantasma, el } = activo;
    if (fantasma) {
      if (exito) {
        fantasma.remove();
      } else {
        /* rebote animado al origen */
        const ox = parseFloat(fantasma.dataset.ox);
        const oy = parseFloat(fantasma.dataset.oy);
        const x0 = parseFloat(fantasma.dataset.x0);
        const y0 = parseFloat(fantasma.dataset.y0);
        fantasma.style.transition = 'transform 200ms cubic-bezier(.3,1.4,.5,1), opacity 200ms';
        fantasma.style.transform = `translate3d(${x0}px, ${y0}px, 0) scale(1)`;
        void ox; void oy;
        setTimeout(() => fantasma.remove(), 220);
      }
    }
    el.classList.remove('drag-origen');
    limpiarZonas();
    activo = null;
  }

  raiz.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    /* multi-touch: mientras hay un drag en curso, cualquier otro puntero se ignora
       (no se reemplaza ni se anula `activo`, que dejaría el fantasma huérfano) */
    if (activo) return;
    const dragEl = e.target.closest('[data-drag]');
    if (dragEl && cbs.puedeArrastrar(dragEl.dataset.drag)) {
      activo = { dragId: dragEl.dataset.drag, el: dragEl, x0: e.clientX, y0: e.clientY, pointerId: e.pointerId, fantasma: null, arrastrando: false };
      try { dragEl.setPointerCapture(e.pointerId); } catch { /* ok */ }
    } else {
      activo = null;
    }
  });

  raiz.addEventListener('pointermove', (e) => {
    if (!activo || e.pointerId !== activo.pointerId) return;
    const dx = e.clientX - activo.x0;
    const dy = e.clientY - activo.y0;
    if (!activo.arrastrando && Math.hypot(dx, dy) >= UMBRAL_PX) {
      activo.arrastrando = true;
      activo.fantasma = crearFantasma(activo.el, e.clientX, e.clientY);
      activo.el.classList.add('drag-origen');
      if (seleccion) setSeleccion(null);
      marcarZonas(activo.dragId);
    }
    if (activo.arrastrando) {
      moverFantasma(activo.fantasma, e.clientX, e.clientY);
      const zona = zonaBajo(e.clientX, e.clientY);
      raiz.querySelectorAll('.drop-hover').forEach((z) => z.classList.remove('drop-hover'));
      if (zona && zona.classList.contains('drop-activa')) zona.classList.add('drop-hover');
    }
  });

  function alSoltarPointer(e) {
    /* pointerup de OTRO dedo distinto al que arrastra: no toca el drag activo */
    if (activo && e.pointerId !== activo.pointerId) return;
    if (activo && e.pointerId === activo.pointerId && activo.arrastrando) {
      const zona = zonaBajo(e.clientX, e.clientY);
      let exito = false;
      if (zona && cbs.puedeSoltar(activo.dragId, zona.dataset.drop)) {
        exito = cbs.alSoltar(activo.dragId, zona.dataset.drop) === true;
      }
      terminarDrag(exito, e.clientX, e.clientY);
      return;
    }
    /* TAP (sin drag) */
    if (activo) { activo.el.classList.remove('drag-origen'); }
    const objetivo = e.target.closest('[data-drag],[data-drop],[data-tap]');
    const eraDrag = activo != null;
    activo = null;
    if (!objetivo) {
      if (seleccion) setSeleccion(null);
      return;
    }
    /* Con selección activa: intentar soltar sobre dropzone */
    if (seleccion) {
      const drop = objetivo.closest('[data-drop]');
      if (drop && cbs.puedeSoltar(seleccion, drop.dataset.drop)) {
        const id = seleccion;
        setSeleccion(null);
        cbs.alSoltar(id, drop.dataset.drop);
        return;
      }
      /* tap sobre el mismo seleccionado = deseleccionar */
      const drag = objetivo.closest('[data-drag]');
      if (drag && drag.dataset.drag === seleccion) {
        setSeleccion(null);
        return;
      }
      setSeleccion(null);
      /* y sigue como tap normal */
    }
    /* Tap sobre un draggable válido = seleccionar */
    if (eraDrag) {
      const drag = objetivo.closest('[data-drag]');
      if (drag && cbs.puedeArrastrar(drag.dataset.drag)) {
        setSeleccion(drag.dataset.drag);
        return;
      }
    }
    /* Tap simple */
    const conTap = objetivo.closest('[data-tap]');
    if (conTap) cbs.alTocar(conTap.dataset.tap);
  }

  raiz.addEventListener('pointerup', alSoltarPointer);
  raiz.addEventListener('pointercancel', (e) => {
    if (activo && e.pointerId === activo.pointerId) terminarDrag(false, e.clientX, e.clientY);
  });

  return {
    deseleccionar() { setSeleccion(null); },
    get seleccion() { return seleccion; },
  };
}
