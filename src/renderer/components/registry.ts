import { CardBlock } from './CardBlock';
import { CardsListBlock } from './CardsListBlock';
import { TableBlock } from './TableBlock';
import { FlowBlock } from './FlowBlock';
import { HeroBlock } from './HeroBlock';
import { ContentBlock } from './ContentBlock';
import { CTABlock } from './CTABlock';
import { StepsBlock } from './StepsBlock';

export const ALLOWED_COMPONENTS = {
  'card': CardBlock,
  'cards.list': CardsListBlock,
  'table': TableBlock,
  'flow': FlowBlock,
  'hero': HeroBlock,
  'content': ContentBlock,
  'cta': CTABlock,
  'steps': StepsBlock,
} as const;

export type ComponentType = keyof typeof ALLOWED_COMPONENTS;
