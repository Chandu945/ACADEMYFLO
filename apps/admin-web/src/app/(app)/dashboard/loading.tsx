import { Skeleton } from '@/components/ui/Skeleton';
import tileStyles from '@/components/dashboard/DashboardTiles.module.css';

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton height="24px" width="120px" />
      <div className={tileStyles.grid} style={{ marginTop: 20 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={tileStyles.skeletonTile}>
            <Skeleton height="34px" width="80px" />
            <Skeleton height="16px" width="120px" />
          </div>
        ))}
      </div>
    </div>
  );
}
