import { CardBlock } from './CardBlock';
import { CardsListBlock } from './CardsListBlock';
import { TableBlock } from './TableBlock';
import { FlowBlock } from './FlowBlock';
import { HeroBlock } from './HeroBlock';
import { ContentBlockEnhanced as ContentBlock } from './ContentBlockEnhanced';
import { CTABlock } from './CTABlock';
import { StepsBlock } from './StepsBlock';
import { FeaturesBlock } from './FeaturesBlock';
import { TeamBlock } from './TeamBlock';
import { StatsBlock } from './StatsBlock';
import { TestimonialsBlock } from './TestimonialsBlock';
import { FAQBlock } from './FAQBlock';

export const ALLOWED_COMPONENTS = {
  'card': CardBlock,
  'cards.list': CardsListBlock,
  'table': TableBlock,
  'flow': FlowBlock,
  'hero': HeroBlock,
  'content': ContentBlock,
  'cta': CTABlock,
  'steps': StepsBlock,
  'features': FeaturesBlock,
  'team': TeamBlock,
  'stats': StatsBlock,
  'testimonials': TestimonialsBlock,
  'faq': FAQBlock,
} as const;

export type ComponentType = keyof typeof ALLOWED_COMPONENTS;
