'use client';

import { useEffect, useState } from 'react';
import { config } from '@/lib/config';

export default function ApiProbe() {
  const [statusText, setStatusText] = useState<string>('');

  useEffect(() => {
    const url = `${config.apiBaseUrl}/health`;

    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        console.log('[API Health]', { url, status: res.status, data });
        setStatusText(`API ${res.ok ? 'OK' : 'DOWN'} (${res.status})`);
      })
      .catch((err) => {
        console.error('[API Health] fetch error', err);
        setStatusText('API error (check console)');
      });
  }, []);

  return (
    <div className="text-sm text-gray-600 dark:text-gray-300">
      {statusText || 'Checking API...'}
    </div>
  );
}


