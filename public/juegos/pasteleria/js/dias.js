/* Tabla de dificultad de la campaña + configuración de Hora Pico. */

export const DIAS = [
  {
    dia: 1, duracionS: 90, pedidosMax: 6, clientesSimultaneos: 1, spawnIntervaloS: 1.2,
    pacienciaBaseS: 35, hornoPuestos: 2, itemsPorPedido: [1, 1], ventanaPerfectaS: 2.5,
    objetivo: 60, probVip: 0, desbloqueos: ['vainilla', 'chispas_choc'], picoFinal: null,
    tituloDesbloqueo: 'Tutorial', textoDesbloqueo: 'Aprende lo básico: masa de vainilla y chispas de chocolate.',
  },
  {
    dia: 2, duracionS: 90, pedidosMax: 8, clientesSimultaneos: 2, spawnIntervaloS: 9,
    pacienciaBaseS: 32, hornoPuestos: 2, itemsPorPedido: [1, 1], ventanaPerfectaS: 2.5,
    objetivo: 90, probVip: 0, desbloqueos: ['chocolate'], picoFinal: null,
    tituloDesbloqueo: 'Masa de chocolate', textoDesbloqueo: 'Nueva masa en la mesa: chocolate. Fíjate bien qué masa pide cada cliente.',
  },
  {
    dia: 3, duracionS: 100, pedidosMax: 9, clientesSimultaneos: 2, spawnIntervaloS: 8.5,
    pacienciaBaseS: 30, hornoPuestos: 2, itemsPorPedido: [1, 1], ventanaPerfectaS: 2.5,
    objetivo: 120, probVip: 0, desbloqueos: ['glaseado_rosa'], picoFinal: null,
    tituloDesbloqueo: 'Glaseado rosa', textoDesbloqueo: 'Se activa la fila de decoración: glasea la galleta DESPUÉS de hornearla.',
  },
  {
    dia: 4, duracionS: 110, pedidosMax: 11, clientesSimultaneos: 3, spawnIntervaloS: 7.5,
    pacienciaBaseS: 27, hornoPuestos: 3, itemsPorPedido: [1, 2], ventanaPerfectaS: 2.0,
    objetivo: 160, probVip: 0, desbloqueos: ['redvelvet', 'chispas_colores'], picoFinal: null,
    tituloDesbloqueo: 'Red velvet + chispas de colores', textoDesbloqueo: 'Masa red velvet (paga más), chispas de colores y un tercer puesto de horno.',
  },
  {
    dia: 5, duracionS: 120, pedidosMax: 13, clientesSimultaneos: 3, spawnIntervaloS: 6.5,
    pacienciaBaseS: 24, hornoPuestos: 3, itemsPorPedido: [1, 2], ventanaPerfectaS: 2.0,
    objetivo: 210, probVip: 0.08, desbloqueos: ['glaseado_choc', 'sprinkles', 'vip'],
    picoFinal: { ultimosS: 30, spawnS: 4.5 },
    tituloDesbloqueo: 'Glaseado de chocolate, sprinkles y clientes VIP',
    textoDesbloqueo: 'Los VIP llevan corona, pagan el doble y tienen menos paciencia. ¡Ojo con el pico final!',
  },
];

export const HORA_PICO = {
  vidas: 3,
  spawnInicialS: 8, spawnMinS: 3.5, spawnDecayS: 0.15,
  pacienciaInicialS: 26, pacienciaMinS: 14, pacienciaDecayS: 0.2,
  ventanaPerfectaS: 1.8, probVip: 0.1, hornoPuestos: 3, itemsPorPedido: [1, 2],
};

/* Tramos de horneado comunes */
export const CRUDA_MS = 4000;
export const PASADA_MS = 2000;
