/** Grupos musculares - valor canónico + label PT */
export const GRUPOS_MUSCULARES = [
  { value: 'peito',       label: 'Peito'       },
  { value: 'costas',      label: 'Costas'      },
  { value: 'ombros',      label: 'Ombros'      },
  { value: 'biceps',      label: 'Bíceps'      },
  { value: 'triceps',     label: 'Tríceps'     },
  { value: 'abdominais',  label: 'Abdominais'  },
  { value: 'quadriceps',  label: 'Quadríceps'  },
  { value: 'posterior',   label: 'Posterior'   },
  { value: 'gluteos',     label: 'Glúteos'     },
  { value: 'gemeos',      label: 'Gémeos'      },
  { value: 'cardio',      label: 'Cardio'      },
  { value: 'full_body',   label: 'Full Body'   },
];

/** Mapeia valores da BD/seed para o valor canónico do filtro */
const GRUPO_ALIASES = {
  peito:       'peito',
  peitoral:    'peito',
  costas:      'costas',
  ombros:      'ombros',
  ombro:       'ombros',
  biceps:      'biceps',
  triceps:     'triceps',
  abdominais:  'abdominais',
  core:        'abdominais',
  quadriceps:  'quadriceps',
  posterior:   'posterior',
  isquiotibiais: 'posterior',
  isquios:     'posterior',
  gluteos:     'gluteos',
  gemeos:      'gemeos',
  cardio:      'cardio',
  full_body:   'full_body',
  'full body': 'full_body',
  fullbody:    'full_body',
};

/** Estados de sessão - valor API + label PT */
export const ESTADOS_SESSAO = [
  { value: 'agendada',  label: 'Agendada'  },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

export function normalizarGrupoMuscular(valor) {
  if (!valor) return '';
  const chave = String(valor).toLowerCase().trim().replace(/_/g, ' ');
  const snake = chave.replace(/\s+/g, '_');
  return GRUPO_ALIASES[chave] || GRUPO_ALIASES[snake] || snake;
}

export function labelGrupoMuscular(valor) {
  const norm = normalizarGrupoMuscular(valor);
  const item = GRUPOS_MUSCULARES.find((g) => g.value === norm);
  if (item) return item.label;
  if (!valor) return '-';
  return String(valor).replace(/_/g, ' ');
}

/** Opções do filtro: lista canónica + grupos extra presentes nos exercícios */
export function buildOpcoesFiltroGrupos(exercicios) {
  const opcoes = [{ value: '', label: 'Grupo muscular' }];
  const vistos = new Set(['']);

  GRUPOS_MUSCULARES.forEach((g) => {
    opcoes.push(g);
    vistos.add(g.value);
  });

  (exercicios || []).forEach((ex) => {
    const norm = normalizarGrupoMuscular(ex.grupoMuscular);
    if (norm && !vistos.has(norm)) {
      vistos.add(norm);
      opcoes.push({ value: norm, label: labelGrupoMuscular(ex.grupoMuscular) });
    }
  });

  return opcoes;
}

export function filtrarPorGrupoMuscular(exercicios, filtroGrupo) {
  if (!filtroGrupo) return exercicios;
  return exercicios.filter(
    (ex) => normalizarGrupoMuscular(ex.grupoMuscular) === filtroGrupo
  );
}

export function ordenarExercicios(exercicios) {
  return exercicios.slice().sort((a, b) => {
    const ordemA = a.ordem != null ? a.ordem : 9999;
    const ordemB = b.ordem != null ? b.ordem : 9999;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return (a.id || 0) - (b.id || 0);
  });
}

export function labelEstadoSessao(valor) {
  const item = ESTADOS_SESSAO.find((e) => e.value === valor);
  return item ? item.label : valor || '-';
}

export function badgeClassEstadoSessao(estado) {
  const map = {
    agendada:  'sess-badge sess-badge--agendada',
    concluida: 'sess-badge sess-badge--concluida',
    cancelada: 'sess-badge sess-badge--cancelada',
  };
  return map[estado] || 'sess-badge';
}
