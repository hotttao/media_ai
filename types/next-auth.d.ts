import { SessionUser } from '@/foundation/types/auth'

declare module 'next-auth' {
  interface Session {
    user: SessionUser
  }

  interface User extends SessionUser {}
}

declare module 'next-auth/jwt' {
  interface JWT extends SessionUser {}
}
