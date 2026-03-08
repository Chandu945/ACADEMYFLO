import { Skeleton } from '@/components/ui/Skeleton';

export default function AcademiesLoading() {
  return (
    <div>
      <Skeleton height="24px" width="120px" />
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height="48px" width="100%" />
        ))}
      </div>
    </div>
  );
}
