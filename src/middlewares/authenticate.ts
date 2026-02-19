import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../helpers/jwt';
import { AuthenticatedRequest, TokenPayload } from '../interfaces';
import { unauthorized } from './errorHandler';

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw unauthorized('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      throw unauthorized('Invalid or expired access token');
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
    } as TokenPayload;

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication - doesn't fail if no token
// If a token IS sent but is invalid/expired, returns 401 so the frontend can refresh
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);

      if (decoded) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          roles: decoded.roles,
        } as TokenPayload;
      } else {
        // Token was sent but is invalid/expired — return 401 so frontend can refresh
        throw unauthorized('Invalid or expired access token');
      }
    }

    // No token sent at all — continue as guest
    next();
  } catch (error) {
    next(error);
  }
};
