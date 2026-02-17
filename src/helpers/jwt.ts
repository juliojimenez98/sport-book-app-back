import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { TokenPayload, UserRoleInfo } from '../interfaces';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret_change_in_production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_change_in_production';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface DecodedToken extends JwtPayload {
  userId: number;
  email: string;
  roles: UserRoleInfo[];
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: ACCESS_EXPIRES_IN as string,
  };
  return jwt.sign(payload, ACCESS_SECRET, options);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRES_IN as string,
  };
  return jwt.sign(payload, REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): DecodedToken | null => {
  try {
    return jwt.verify(token, ACCESS_SECRET) as DecodedToken;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): DecodedToken | null => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as DecodedToken;
  } catch {
    return null;
  }
};

export const getRefreshTokenExpiry = (): Date => {
  const expiresIn = REFRESH_EXPIRES_IN;
  const now = new Date();
  
  // Parse expiry string (e.g., '7d', '24h', '60m')
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) {
    // Default to 7 days if invalid format
    now.setDate(now.getDate() + 7);
    return now;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      now.setDate(now.getDate() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
  }

  return now;
};
