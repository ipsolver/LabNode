import jwt from 'jsonwebtoken';

export type JwtPayload = {
  userId: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if(!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '15m',
  });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '30d',
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}