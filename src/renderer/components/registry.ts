import { CardBlock } from './CardBlock';
import { CardsListBlock } from './CardsListBlock';
import { TableBlock } from './TableBlock';
import { FlowBlock } from './FlowBlock';

export const ALLOWED_COMPONENTS = {
  'card': CardBlock,
  'cards.list': CardsListBlock,
  'table': TableBlock,
  'flow': FlowBlock,
} as const;

export type ComponentType = keyof typeof ALLOWED_COMPONENTS;
