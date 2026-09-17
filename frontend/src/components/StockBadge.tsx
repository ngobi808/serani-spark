import type { StockStatus } from '../../../shared/types';

const LABELS: Record<StockStatus, string> = {
  in_stock: '🟢 In stock',
  limited: '🟡 Limited availability',
  out_of_stock: '🔴 Out of stock',
};

export function StockBadge({ status }: { status: StockStatus }) {
  return <span className={`ss-badge ${status}`}>{LABELS[status]}</span>;
}
