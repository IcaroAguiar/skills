// Dados ilustrativos compartilhados pelas telas. Tudo fictício: sem pessoas reais, sem dados de clientes.
import type { StatusBadgeTone } from '@acme/ui';

export const person = { name: 'Pessoa Exemplo', role: 'Papel · Organização' };

export type Situation = 'Rascunho' | 'Em análise' | 'Aprovado';
export const situationTone: Record<Situation, StatusBadgeTone> = { Rascunho: 'draft', 'Em análise': 'underReview', Aprovado: 'approved' };

export type Item = { id: string; code: string; title: string; situation: Situation; updated: string; next: string };
export const items: Item[] = [
  { id: 'i1', code: 'ORG-2026-0142', title: 'Primeiro item de exemplo com um título realista', situation: 'Em análise', updated: '17/10/2026', next: 'Aguardar a análise' },
  { id: 'i2', code: 'ORG-2026-0118', title: 'Segundo item de exemplo', situation: 'Aprovado', updated: '15/10/2026', next: '—' },
  { id: 'i3', code: '—', title: 'Terceiro item, ainda em rascunho', situation: 'Rascunho', updated: '18/10/2026', next: 'Completar o cadastro' },
];
