/** Objetivos de plano - valor API + label PT */
export const OBJETIVOS_PLANO = [
  { value: 'emagrecimento', label: 'Emagrecimento' },
  { value: 'hipertrofia',   label: 'Hipertrofia'   },
  { value: 'resistencia',   label: 'Resistência'   },
  { value: 'flexibilidade', label: 'Flexibilidade' },
  { value: 'saude_geral',   label: 'Saúde Geral'   },
];

export function labelObjetivoPlano(valor) {
  const item = OBJETIVOS_PLANO.find((o) => o.value === valor);
  return item ? item.label : valor || '-';
}
