import crypto from 'crypto';

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateRandomToken = (length = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const calculateBookingPrice = (
  pricePerHour: number,
  startAt: Date,
  endAt: Date
): number => {
  const hours = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
  return Math.round(pricePerHour * hours * 100) / 100;
};

export const isValidTimeRange = (startAt: Date, endAt: Date): boolean => {
  const now = new Date();
  return startAt < endAt && startAt >= now;
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const parseDate = (dateString: string): Date | null => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};
