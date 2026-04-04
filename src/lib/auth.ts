import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'valoris-secret-key-change-in-production'

export type UserPayload = {
  id: string
  email: string
  role: string
  entityId: string | null
  firstName: string
  lastName: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('valoris-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}

export const ROLES = {
  ADMIN: 'ADMIN',
  FPA_DIRECTOR: 'FPA_DIRECTOR',
  FPA_ANALYST: 'FPA_ANALYST',
  PRODUCTION_MANAGER: 'PRODUCTION_MANAGER',
  SUPPLY_MANAGER: 'SUPPLY_MANAGER',
  SUBSIDIARY_MANAGER: 'SUBSIDIARY_MANAGER',
  LOCAL_FINANCE_MANAGER: 'LOCAL_FINANCE_MANAGER',
} as const
