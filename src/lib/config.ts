declare global {
  interface Window {
    __NEXT_PUBLIC_API_BASE__?: string;
  }
}

export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return window.__NEXT_PUBLIC_API_BASE__ || '';
  }

  return (globalThis as any).process?.env?.NEXT_PUBLIC_API_BASE ?? '';
};

export const config = {
  get apiBaseUrl() {
    return getApiBase();
  },
} as const;
