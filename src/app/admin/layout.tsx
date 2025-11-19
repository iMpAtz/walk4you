'use client';

import { ReactNode } from 'react';
import { withAuth } from '@/contexts/AuthContext';

function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default withAuth(AdminLayout, 'ADMIN');

