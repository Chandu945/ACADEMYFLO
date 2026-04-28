'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Props = {
  /** BFF export endpoint, e.g. /api/admin/academies/export */
  href: string;
  /** Query params to forward — usually the same filters the page is showing */
  params: Record<string, string | undefined>;
  /** Disabled when there's nothing to export (loading or empty results) */
  disabled?: boolean;
};

export function ExportCsvButton({ href, params, disabled }: Props) {
  const onClick = () => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) search.set(k, v);
    }
    const url = search.size > 0 ? `${href}?${search.toString()}` : href;
    // Use window.location to trigger the browser's download flow — the
    // Content-Disposition: attachment header on the response makes the
    // browser save instead of navigate. Opening in a new tab can briefly
    // show a blank page on some browsers; same-tab navigation just downloads.
    window.location.href = url;
  };

  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled}>
      <Download size={16} style={{ marginRight: 6 }} />
      Export CSV
    </Button>
  );
}
