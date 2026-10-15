/**
 * Sorkalam Authentication and Role-Based Access Control (RBAC)
 * Roles:
 * - student: search, explore journeys, save words, create collections
 * - researcher: student permissions + contribute literary evidence, export datasets
 * - scholar: researcher permissions + verify and peer-review contributions
 * - admin: full permissions over corpus, users and settings
 */

export type UserRole = "student" | "researcher" | "scholar" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution?: string;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 1,
  researcher: 2,
  scholar: 3,
  admin: 4,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Mock token encoding / decoding for local runtime
export function generateToken(user: AuthUser): string {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    institution: user.institution,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  };
  return `sorkalam_jwt_${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

export function verifyToken(token: string): AuthUser | null {
  try {
    if (!token || !token.startsWith("sorkalam_jwt_")) return null;
    const base64 = token.replace("sorkalam_jwt_", "");
    const decoded = JSON.parse(Buffer.from(base64, "base64url").toString());
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      id: decoded.sub,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      institution: decoded.institution,
    };
  } catch {
    return null;
  }
}
