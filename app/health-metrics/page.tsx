'use client';

import NoSSR from '../../components/NoSSR';
import HealthMetricsClient from '../../components/HealthMetricsClient';

export default function HealthMetrics() {
  return (
    <NoSSR>
      <HealthMetricsClient />
    </NoSSR>
  );
}
