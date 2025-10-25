'use client';

import NoSSR from '../../components/NoSSR';
import SymptomCheckerClient from '../../components/SymptomCheckerClient';

export default function SymptomChecker() {
  return (
    <NoSSR>
      <SymptomCheckerClient />
    </NoSSR>
  );
}
