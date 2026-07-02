import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

export function getUserEmailFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    return decoded.email || null;
  } catch {
    return null;
  }
}

export { JWT_SECRET };
