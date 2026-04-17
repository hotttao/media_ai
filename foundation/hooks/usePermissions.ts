import { useSession } from 'next-auth/react'
import { Role } from '@/foundation/types/auth'

type Permission =
  | 'team:manage_members'
  | 'team:read'
  | 'material:create'
  | 'material:read'
  | 'material:update'
  | 'material:delete'
  | 'ip:create'
  | 'ip:read'
  | 'ip:update'
  | 'ip:delete'
  | 'task:create'
  | 'task:read'
  | 'task:delete'
  | 'workflow:read'
  | 'video:read'
  | 'video:delete'

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    'team:manage_members',
    'team:read',
    'material:create',
    'material:read',
    'material:update',
    'material:delete',
    'ip:create',
    'ip:read',
    'ip:update',
    'ip:delete',
    'task:create',
    'task:read',
    'task:delete',
    'workflow:read',
    'video:read',
    'video:delete',
  ],
  MEMBER: [
    'team:read',
    'material:create',
    'material:read',
    'material:update',
    'material:delete', // only own
    'ip:create',
    'ip:read',
    'ip:update',
    'ip:delete', // only own
    'task:create',
    'task:read',
    'task:delete', // only own
    'workflow:read',
    'video:read',
    'video:delete', // only own
  ],
}

export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role as Role | undefined

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false
    return rolePermissions[role].includes(permission)
  }

  const isAdmin = role === 'ADMIN'
  const isMember = role === 'MEMBER'

  return {
    hasPermission,
    isAdmin,
    isMember,
    role,
  }
}
