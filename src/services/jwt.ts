import jwt, { JwtPayload } from 'jsonwebtoken';

export const decodeToken = (token: string): JwtPayload => {
  return jwt.decode(token) as JwtPayload;
};
