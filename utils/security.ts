// Simulated AES-256 Encryption for display purposes
// In production, use 'crypto' module
export const maskPII = (data: string): string => {
  if (!data || data.length < 4) return '****';
  return data.substring(0, 2) + '****' + data.substring(data.length - 2);
};

export const generateHash = (data: string): string => {
  // Simple DJB2 hash for visual simulation of a log hash
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const generateReferenceId = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TX-${timestamp}-${random}`;
};