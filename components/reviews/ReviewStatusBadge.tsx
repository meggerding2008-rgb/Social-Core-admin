import type { ReviewStatus } from '@/lib/reviews/types';
import { reviewStatusLabel } from '@/lib/reviews/types';

const STYLES: Record<ReviewStatus, string> = {
  concept: 'border-brand-border bg-brand-white text-brand-accent',
  gepland: 'border-brand-accent/40 bg-brand-mist text-brand-navy',
  verzonden: 'border-brand-navy/30 bg-brand-mist text-brand-navy',
  geannuleerd: 'border-brand-border bg-brand-mist text-brand-accent',
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={`inline-flex rounded-[8px] border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {reviewStatusLabel(status)}
    </span>
  );
}
