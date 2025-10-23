import { Badge } from '@/components/ui/badge';
import { OPPORTUNITY_STAGE_LABELS, OPPORTUNITY_STAGE_COLORS, type OpportunityStage } from '../types/opportunity.types';

interface OpportunityStageBadgeProps {
  stage: OpportunityStage;
}

export function OpportunityStageBadge({ stage }: OpportunityStageBadgeProps) {
  return (
    <Badge className={OPPORTUNITY_STAGE_COLORS[stage]}>
      {OPPORTUNITY_STAGE_LABELS[stage]}
    </Badge>
  );
}
