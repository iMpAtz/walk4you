// API Configuration
// Use function to ensure runtime evaluation
export const getApiBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_BASE;
  if (!url) {
    throw new Error('NEXT_PUBLIC_API_BASE environment variable is not set');
  }
  return url;
};

export const config = {
  get apiBaseUrl() {
    return getApiBaseUrl();
  },
} as const;
