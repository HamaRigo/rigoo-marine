import { Card, CardContent, Skeleton, Grid } from '@mui/material';

/**
 * Skeleton loader for a single card
 */
export function SkeletonCard({ height = 200 }) {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="rectangular" height={height} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
        <Skeleton variant="text" sx={{ fontSize: '0.875rem' }} />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for card grid layouts
 */
export function SkeletonCardGrid({ count = 6 }) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index} >
          <SkeletonCard />
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * Skeleton loader for table/list rows
 */
export function SkeletonTableRows({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Grid container spacing={2} key={index} sx={{ mb: 2, p: 2, alignItems: 'center' }}>
          <Grid size={4} >
            <Skeleton variant="text" />
          </Grid>
          <Grid size={3} >
            <Skeleton variant="text" />
          </Grid>
          <Grid size={3} >
            <Skeleton variant="text" />
          </Grid>
          <Grid size={2} >
            <Skeleton variant="text" />
          </Grid>
        </Grid>
      ))}
    </>
  );
}

export default SkeletonCard;
