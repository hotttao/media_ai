# 虚拟 IP 视频智能体 — Phase 1 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建完整项目脚手架，跑通注册/登录/邀请码+团队+RBAC 权限的最小闭环。

**Architecture:** Next.js 14 App Router 全栈项目，分层架构（L0-L3），Prisma ORM 连接 MySQL，NextAuth.js 做认证，本地文件系统存储上传文件。

**Tech Stack:** Next.js 14, shadcn/ui, Tailwind, Prisma, MySQL, NextAuth.js, React Hook Form, Zod, Zustand

---

## 文件结构总览

```
media_ai/
├── prisma/
│   └── schema.prisma                          # 数据库 schema
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                         # AppShell
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── teams/invite-codes/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                                    # shadcn/ui primitives
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── foundation/
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── db.ts
│   │   └── utils.ts
│   └── types/
│       └── auth.ts
├── domains/
│   ├── auth/
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   └── service.ts
│   └── team/
│       ├── types.ts
│       ├── validators.ts
│       └── service.ts
└── package.json
```

---

## 依赖安装清单

执行前先安装以下依赖（项目初始化后执行）：

```bash
# 核心依赖
npm install next-auth @prisma/client bcryptjs uuid

# shadcn/ui 相关
npm install -D tailwindcss postcss autoprefixer
npx shadcn@latest init

# 表单相关
npm install react-hook-form @hookform/resolvers zod

# 状态管理
npm install zustand

# Prisma
npm install -D prisma

# 工具
npm install clsx tailwind-merge class-variance-authority
```

---

## 任务分解

### Task 1: 项目初始化 & shadcn/ui 配置

**Files:**
- Modify: `package.json`
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Create: `components.json`
- Create: `app/layout.tsx`

- [ ] **Step 1: 检查并创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: 创建 package.json（如果不存在）或确认依赖已添加**

检查 `package.json` 中是否已有 `next`, `react`, `react-dom`。如果没有，创建完整的 package.json：

```json
{
  "name": "media-ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "14.2.x",
    "react": "^18",
    "react-dom": "^18",
    "next-auth": "^4.24.x",
    "@prisma/client": "^5.x",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.0",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "zustand": "^4.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "class-variance-authority": "^0.7.x",
    "@radix-ui/react-slot": "^1.x"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/bcryptjs": "^2.4.x",
    "@types/uuid": "^9.x",
    "prisma": "^5.x",
    "tailwindcss": "^3.4.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "eslint": "^8",
    "eslint-config-next": "14.2.x"
  }
}
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: 创建 tailwind.config.ts（Clay 设计风格）**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*',
    './components/**/*',
    './app/**/*',
    './domains/**/*',
    './foundation/**/*',
  ],
  theme: {
    extend: {
      colors: {
        // Clay Design - Warm Cream Canvas
        background: '#faf9f7',
        foreground: '#000000',
        // Oat Borders
        border: '#dad4c8',
        'border-light': '#eee9df',
        // Swatch Palette
        matcha: {
          300: '#84e7a5',
          600: '#078a52',
          800: '#02492a',
        },
        slushie: {
          500: '#3bd3fd',
          800: '#0089ad',
        },
        lemon: {
          400: '#f8cc65',
          500: '#fbbd41',
          700: '#d08a11',
          800: '#9d6a09',
        },
        ube: {
          300: '#c1b0ff',
          800: '#43089f',
          900: '#32037d',
        },
        pomegranate: {
          400: '#fc7981',
        },
        blueberry: {
          800: '#01418d',
        },
        // Warm neutrals
        'warm-silver': '#9f9b93',
        'warm-charcoal': '#55534e',
        'dark-charcoal': '#333333',
        // Badge colors
        'badge-blue-bg': '#f0f8ff',
        'badge-blue-text': '#3859f9',
      },
      fontFamily: {
        // Roobert + Space Mono from Clay design
        sans: ['Roobert', 'Arial', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'feature': '24px',
        'section': '40px',
      },
      boxShadow: {
        // Clay signature shadow
        'clay': 'rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px',
        // Hard offset for hover
        'hard': 'rgb(0,0,0) -7px 7px',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: 创建 postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: 创建 app/globals.css（Clay 全局样式）**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #faf9f7;
    --foreground: #000000;
    --border: #dad4c8;
    --border-light: #eee9df;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}

/* Clay hover animation - playful rotate + translate */
@layer utilities {
  .hover-tilt {
    @apply transition-all duration-200;
  }
  .hover-tilt:hover {
    @apply rotate-[-8deg] translate-y-[-80%];
    box-shadow: -7px 7px 0px rgb(0,0,0);
  }
}
```

- [ ] **Step 7: 创建 components.json（shadcn/ui 配置）**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/foundation/lib/utils"
  }
}
```

- [ ] **Step 8: 创建 foundation/lib/utils.ts（工具函数）**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 9: 创建 app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Media AI - 虚拟IP带货视频智能体',
  description: '为内容创作者提供虚拟IP管理和智能视频生成能力',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 10: 运行 npm install**

```bash
cd D:/Code/media/media_ai && npm install
```

- [ ] **Step 11: 提交**

```bash
git add package.json tsconfig.json tailwind.config.ts postcss.config.js app/globals.css components.json
git commit -m "Task 1: Initialize Next.js project with shadcn/ui and Clay design"
```

---

### Task 2: Prisma Schema & 数据库配置

**Files:**
- Create: `prisma/schema.prisma`
- Create: `foundation/lib/db.ts`
- Create: `.env`

- [ ] **Step 1: 创建 prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ============================================
// 用户与团队
// ============================================

model Team {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(100)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users        User[]
  inviteCodes  InviteCode[]
  virtualIps   VirtualIp[]
  materials    Material[]
  videoTasks   VideoTask[]
  videos       Video[]

  @@map("teams")
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique @db.VarChar(255)
  passwordHash String    @map("password_hash") @db.VarChar(255)
  nickname     String?   @db.VarChar(50)
  teamId       String?   @map("team_id")
  role         Role      @default(MEMBER)
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  team         Team?        @relation(fields: [teamId], references: [id])
  inviteCodeUsed InviteCode? @relation("UsedBy")

  virtualIps   VirtualIp[]
  materials    Material[]
  ipMaterials  IpMaterial[]
  videoTasks   VideoTask[]
  videos       Video[]

  @@map("users")
}

enum Role {
  ADMIN
  MEMBER
}

model InviteCode {
  id        String    @id @default(uuid())
  teamId    String    @map("team_id")
  code      String    @unique @db.VarChar(20)
  used      Boolean   @default(false)
  usedBy    String?   @map("used_by")
  expiresAt DateTime  @map("expires_at") @db.DateTime
  createdAt DateTime  @default(now()) @map("created_at")

  team    Team  @relation(fields: [teamId], references: [id])
  user    User? @relation("UsedBy", fields: [usedBy], references: [id])

  @@map("invite_codes")
}

// ============================================
// 虚拟 IP
// ============================================

model VirtualIp {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  teamId       String   @map("team_id")
  nickname     String   @db.VarChar(50)
  avatar       String?  @db.VarChar(500)
  age          Int?
  gender       Gender?
  height       Decimal? @db.Decimal(5,2)
  weight       Decimal? @db.Decimal(5,2)
  bust         Decimal? @db.Decimal(5,2)
  waist        Decimal? @db.Decimal(5,2)
  hip          Decimal? @db.Decimal(5,2)
  education    String?  @db.VarChar(50)
  major        String?  @db.VarChar(100)
  personality  String?  @db.VarChar(200)
  catchphrase  String?  @map("catchphrase") @db.VarChar(200)
  classicAccessories String? @map("classic_accessories") @db.VarChar(500)
  classicActions     String? @map("classic_actions") @db.VarChar(500)
  platforms    Json?    @db.JSON
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user       User        @relation(fields: [userId], references: [id])
  team       Team        @relation(fields: [teamId], references: [id])
  images     IpImage[]
  ipMaterials IpMaterial[]
  videoTasks VideoTask[]
  videos     Video[]

  @@map("virtual_ips")
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

model IpImage {
  id           String   @id @default(uuid())
  ipId        String   @map("ip_id")
  avatarUrl    String?  @map("avatar_url") @db.VarChar(500)
  fullBodyUrl  String?  @map("full_body_url") @db.VarChar(500)
  threeViewUrl String?  @map("three_view_url") @db.VarChar(500)
  nineViewUrl  String?  @map("nine_view_url") @db.VarChar(500)
  createdAt   DateTime @default(now()) @map("created_at")

  ipId        String        @map("ip_id")
  ip          VirtualIp     @relation(fields: [ipId], references: [id], onDelete: Cascade)
  ipMaterials IpMaterial[]

  @@map("ip_images")
}

// ============================================
// 素材库
// ============================================

model Material {
  id          String     @id @default(uuid())
  userId     String?    @map("user_id")
  teamId     String?    @map("team_id")
  visibility Visibility @default(PERSONAL)
  type       MaterialType
  name       String     @db.VarChar(100)
  description String?   @db.Text
  url        String     @db.VarChar(500)
  tags       Json?      @db.JSON
  createdAt  DateTime   @default(now()) @map("created_at")
  updatedAt  DateTime   @updatedAt @map("updated_at")

  userId String? @map("user_id")
  teamId String? @map("team_id")
  user   User?   @relation(fields: [userId], references: [id])
  team   Team?   @relation(fields: [teamId], references: [id])

  @@map("materials")
}

enum Visibility {
  PUBLIC
  PERSONAL
  TEAM
}

enum MaterialType {
  CLOTHING
  SCENE
  ACTION
  MAKEUP
  ACCESSORY
  OTHER
}

model IpMaterial {
  id             String         @id @default(uuid())
  ipId           String         @map("ip_id")
  userId         String         @map("user_id")
  type           IpMaterialType
  name           String         @db.VarChar(100)
  description    String?        @db.Text
  tags           Json?          @db.JSON
  fullBodyUrl    String?        @map("full_body_url") @db.VarChar(500)
  threeViewUrl   String?        @map("three_view_url") @db.VarChar(500)
  nineViewUrl    String?        @map("nine_view_url") @db.VarChar(500)
  sourceImageId  String?        @map("source_image_id")
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  ipId         String    @map("ip_id")
  userId       String    @map("user_id")
  ip           VirtualIp @relation(fields: [ipId], references: [id], onDelete: Cascade)
  user         User      @relation(fields: [userId], references: [id])
  sourceImage  IpImage?  @relation(fields: [sourceImageId], references: [id])

  @@map("ip_materials")
}

enum IpMaterialType {
  MAKEUP
  ACCESSORY
  CUSTOMIZED_CLOTHING
}

// ============================================
// 工作流与视频
// ============================================

model Workflow {
  id          String   @id @default(uuid())
  code        String   @unique @db.VarChar(50)
  name        String   @db.VarChar(100)
  description String?  @db.Text
  version     String   @db.VarChar(20)
  config      Json?    @db.JSON
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  videoTasks VideoTask[]

  @@map("workflows")
}

model VideoTask {
  id          String     @id @default(uuid())
  userId      String     @map("user_id")
  teamId      String     @map("team_id")
  workflowId  String     @map("workflow_id")
  ipId        String?    @map("ip_id")
  status      TaskStatus @default(PENDING)
  params      Json?      @db.JSON
  result      Json?      @db.JSON
  error       String?    @db.Text
  startedAt   DateTime?  @map("started_at") @db.DateTime
  completedAt DateTime?  @map("completed_at") @db.DateTime
  createdAt   DateTime   @default(now()) @map("created_at")

  userId     String   @map("user_id")
  teamId     String   @map("team_id")
  workflowId String   @map("workflow_id")
  ipId       String?  @map("ip_id")
  user       User     @relation(fields: [userId], references: [id])
  team       Team     @relation(fields: [teamId], references: [id])
  workflow   Workflow @relation(fields: [workflowId], references: [id])
  ip         VirtualIp? @relation(fields: [ipId], references: [id])
  videos     Video[]

  @@map("video_tasks")
}

enum TaskStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

model Video {
  id         String   @id @default(uuid())
  taskId     String   @map("task_id")
  userId     String   @map("user_id")
  teamId     String   @map("team_id")
  ipId       String?  @map("ip_id")
  name       String?  @db.VarChar(100)
  url        String   @db.VarChar(500)
  thumbnail  String?  @db.VarChar(500)
  duration   Int?
  size       BigInt?  @db.BigInt
  createdAt  DateTime @default(now()) @map("created_at")

  taskId String     @map("task_id")
  userId String     @map("user_id")
  teamId String     @map("team_id")
  ipId   String?    @map("ip_id")
  task   VideoTask  @relation(fields: [taskId], references: [id])
  user   User       @relation(fields: [userId], references: [id])
  team   Team       @relation(fields: [teamId], references: [id])
  ip     VirtualIp? @relation(fields: [ipId], references: [id])

  @@map("videos")
}
```

- [ ] **Step 2: 创建 .env（本地开发配置）**

```env
DATABASE_URL="mysql://root:password@localhost:3306/media_ai"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: 创建 foundation/lib/db.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 4: 运行 prisma generate**

```bash
npx prisma generate
```

- [ ] **Step 5: 推送 schema 到数据库（确保 MySQL 已运行）**

```bash
npx prisma db push
```

如果数据库不存在，先在 MySQL 中创建：
```bash
mysql -u root -p -e "CREATE DATABASE media_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

- [ ] **Step 6: 提交**

```bash
git add prisma/schema.prisma foundation/lib/db.ts .env
git commit -m "Task 2: Add Prisma schema and MySQL database configuration"
```

---

### Task 3: NextAuth.js 认证配置

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `foundation/types/auth.ts`
- Create: `foundation/lib/auth.ts`
- Create: `domains/auth/types.ts`

- [ ] **Step 1: 创建 foundation/types/auth.ts**

```typescript
export type Role = 'ADMIN' | 'MEMBER'

export interface SessionUser {
  id: string
  email: string
  nickname: string | null
  teamId: string | null
  role: Role
}

export interface InviteCodeInfo {
  code: string
  teamId: string
  teamName: string
  expiresAt: Date
}
```

- [ ] **Step 2: 创建 foundation/lib/auth.ts**

```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { team: true },
        })

        if (!user) {
          throw new Error('Invalid email or password')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          teamId: user.teamId,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.nickname = user.nickname
        token.teamId = user.teamId
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.nickname = token.nickname as string | null
        session.user.teamId = token.teamId as string | null
        session.user.role = token.role as 'ADMIN' | 'MEMBER'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
}
```

- [ ] **Step 3: 扩展 NextAuth Session 类型**

创建 `types/next-auth.d.ts`：

```typescript
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
```

- [ ] **Step 4: 创建 NextAuth API route**

创建 `app/api/auth/[...nextauth]/route.ts`：

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

- [ ] **Step 5: 创建 API route 测试**

创建 `app/api/auth/register/route.ts`（注册需要邀请码）：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db } from '@/foundation/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nickname, inviteCode } = body

    // Validate input
    if (!email || !password || !inviteCode) {
      return NextResponse.json(
        { error: 'Email, password, and invite code are required' },
        { status: 400 }
      )
    }

    // Find and validate invite code
    const invite = await db.inviteCode.findUnique({
      where: { code: inviteCode },
      include: { team: true },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      )
    }

    if (invite.used) {
      return NextResponse.json(
        { error: 'Invite code has already been used' },
        { status: 400 }
      )
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Invite code has expired' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user and mark invite code as used
    const [user] = await db.$transaction([
      db.user.create({
        data: {
          id: uuid(),
          email,
          passwordHash,
          nickname: nickname || email.split('@')[0],
          teamId: invite.teamId,
          role: 'MEMBER',
        },
      }),
      db.inviteCode.update({
        where: { id: invite.id },
        data: { used: true, usedBy: email },
      }),
    ])

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        teamId: user.teamId,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: 创建邀请码生成 API**

创建 `app/api/teams/invite-codes/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { db } from '@/foundation/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'

// Generate a random 8-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// POST - Create a new invite code (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create invite codes' }, { status: 403 })
    }

    const body = await request.json()
    const { teamId } = body

    if (!teamId || teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
    }

    // Check if user is admin of this team
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || user.role !== 'ADMIN' || user.teamId !== teamId) {
      return NextResponse.json({ error: 'Not authorized for this team' }, { status: 403 })
    }

    // Create invite code, valid for 7 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const inviteCode = await db.inviteCode.create({
      data: {
        id: uuid(),
        teamId,
        code: generateInviteCode(),
        expiresAt,
      },
      include: {
        team: true,
      },
    })

    return NextResponse.json({
      id: inviteCode.id,
      code: inviteCode.code,
      teamName: inviteCode.team.name,
      expiresAt: inviteCode.expiresAt,
    })
  } catch (error) {
    console.error('Create invite code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List invite codes for a team (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can view invite codes' }, { status: 403 })
    }

    const inviteCodes = await db.inviteCode.findMany({
      where: { teamId: session.user.teamId },
      orderBy: { createdAt: 'desc' },
      include: { team: true },
    })

    return NextResponse.json(inviteCodes)
  } catch (error) {
    console.error('List invite codes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 7: 提交**

```bash
git add app/api/auth/ foundation/lib/auth.ts foundation/types/auth.ts types/next-auth.d.ts
git commit -m "Task 3: Configure NextAuth.js with credentials provider and team invite codes"
```

---

### Task 4: 认证页面 UI

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `components/auth/LoginForm.tsx`
- Create: `components/auth/RegisterForm.tsx`

- [ ] **Step 1: 创建 shadcn/ui Button 组件**

先添加基础 UI 组件：

```bash
npx shadcn@latest add button -y
```

- [ ] **Step 2: 创建 components/auth/LoginForm.tsx**

```tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <p className="text-center text-sm text-warm-silver">
        No account?{' '}
        <a href="/register" className="text-foreground underline hover:opacity-80">
          Create one with invite code
        </a>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: 创建 app/(auth)/login/page.tsx**

```tsx
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-feature border border-border shadow-clay p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome Back</h1>
            <p className="text-sm text-warm-silver mt-2">
              Sign in to your Media AI account
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建 components/auth/RegisterForm.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const nickname = formData.get('nickname') as string
    const inviteCode = formData.get('inviteCode') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname, inviteCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      // Redirect to login page after successful registration
      router.push('/login?registered=true')
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname">Nickname (optional)</Label>
        <Input
          id="nickname"
          name="nickname"
          type="text"
          placeholder="Your display name"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          minLength={8}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="inviteCode">Invite Code</Label>
        <Input
          id="inviteCode"
          name="inviteCode"
          type="text"
          placeholder="XXXXXXXX"
          required
          disabled={isLoading}
          className="uppercase"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-warm-silver">
        Already have an account?{' '}
        <a href="/login" className="text-foreground underline hover:opacity-80">
          Sign in
        </a>
      </p>
    </form>
  )
}
```

- [ ] **Step 5: 创建 app/(auth)/register/page.tsx**

```tsx
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-feature border border-border shadow-clay p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Join Your Team</h1>
            <p className="text-sm text-warm-silver mt-2">
              Create your account with an invite code
            </p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 添加必要的 shadcn/ui 组件**

```bash
npx shadcn@latest add input label -y
```

- [ ] **Step 7: 提交**

```bash
git add app/\(auth\)/ components/auth/
git commit -m "Task 4: Add authentication pages - login and register with invite codes"
```

---

### Task 5: AppShell 布局 & Sidebar & TopBar

**Files:**
- Create: `components/layout/AppShell.tsx`
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/TopBar.tsx`
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: 创建 components/layout/Sidebar.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/foundation/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Virtual IPs', href: '/ips', icon: '👤' },
  { name: 'Materials', href: '/materials', icon: '📦' },
  { name: 'Workflows', href: '/workflows', icon: '⚡' },
  { name: 'Tasks', href: '/tasks', icon: '📋' },
  { name: 'Videos', href: '/videos', icon: '🎬' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight">Media AI</h1>
        <p className="text-xs text-warm-silver mt-1">Virtual IP Video Agent</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-card text-sm font-medium transition-colors',
                isActive
                  ? 'bg-matcha-600 text-white'
                  : 'text-foreground hover:bg-oat-light hover:tilt'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-warm-silver">
          <p>Virtual IP Video Agent</p>
          <p className="mt-1">v0.1.0</p>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: 创建 components/layout/TopBar.tsx**

```tsx
'use client'

import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium">
          {session?.user?.teamId ? 'Team Workspace' : 'Personal Workspace'}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm">
          <p className="font-medium">{session?.user?.nickname || session?.user?.email}</p>
          <p className="text-warm-silver text-xs">{session?.user?.role === 'ADMIN' ? 'Admin' : 'Member'}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Sign Out
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: 创建 components/layout/AppShell.tsx**

```tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
```

- [ ] **Step 4: 创建 app/(app)/layout.tsx**

```tsx
import { AppShell } from '@/components/layout/AppShell'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
```

- [ ] **Step 5: 创建 app/(app)/dashboard/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {session.user.nickname || session.user.email}
        </h1>
        <p className="text-warm-silver mt-1">
          Here&apos;s what&apos;s happening with your video generation today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Virtual IPs" value="0" icon="👤" />
        <StatCard title="Pending Tasks" value="0" icon="📋" />
        <StatCard title="Videos" value="0" icon="🎬" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-feature border border-border shadow-clay p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction href="/ips/new" title="Create Virtual IP" description="Define a new virtual character" />
          <QuickAction href="/workflows" title="Generate Video" description="Start a video workflow" />
          <QuickAction href="/materials" title="Upload Materials" description="Add new assets to your library" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-card border border-border shadow-clay p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-warm-silver">{title}</p>
          <p className="text-3xl font-semibold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function QuickAction({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a
      href={href}
      className="block p-4 rounded-card border border-border hover:border-matcha-600 hover:tilt transition-all"
    >
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-warm-silver mt-1">{description}</p>
    </a>
  )
}
```

- [ ] **Step 6: 添加 SessionProvider wrapper（确保客户端组件可访问 session）**

确保 `AppShell` 中的 `SessionProvider` 正确包裹。确认 TopBar 已添加 'use client' 指令。

- [ ] **Step 7: 提交**

```bash
git add components/layout/ app/\(app\)/layout.tsx app/\(app\)/dashboard/
git commit -m "Task 5: Add AppShell layout with Sidebar, TopBar and dashboard page"
```

---

### Task 6: RBAC 权限中间件

**Files:**
- Create: `foundation/hooks/usePermissions.ts`
- Create: `middleware.ts`

- [ ] **Step 1: 创建 foundation/hooks/usePermissions.ts**

```typescript
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
```

- [ ] **Step 2: 创建 middleware.ts（路由保护）**

创建 `middleware.ts` 在项目根目录：

```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // If authenticated, allow access
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

// Define which routes require authentication
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ips/:path*',
    '/materials/:path*',
    '/workflows/:path*',
    '/tasks/:path*',
    '/videos/:path*',
    '/api/:path*',
  ],
}
```

不过滤 `/api/auth/*` 和 `/login`, `/register` 等公开路径。

- [ ] **Step 3: 提交**

```bash
git add foundation/hooks/usePermissions.ts middleware.ts
git commit -m "Task 6: Add RBAC middleware and permission hooks"
```

---

### Task 7: 团队管理（管理员创建团队 & 邀请码管理 UI）

**Files:**
- Create: `domains/team/types.ts`
- Create: `domains/team/service.ts`
- Create: `components/team/InviteCodeManager.tsx`
- Create: `app/(app)/team/settings/page.tsx`

- [ ] **Step 1: 创建 domains/team/types.ts**

```typescript
export interface Team {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface InviteCode {
  id: string
  code: string
  teamId: string
  teamName: string
  used: boolean
  expiresAt: Date
  createdAt: Date
}
```

- [ ] **Step 2: 创建 domains/team/service.ts**

```typescript
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createTeam(name: string, ownerEmail: string) {
  return db.team.create({
    data: {
      id: uuid(),
      name,
      users: {
        create: {
          id: uuid(),
          email: ownerEmail,
          passwordHash: '', // Will be updated when user registers
          role: 'ADMIN',
        },
      },
    },
    include: { users: true },
  })
}

export async function createInviteCode(teamId: string) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  return db.inviteCode.create({
    data: {
      id: uuid(),
      teamId,
      code: generateInviteCode(),
      expiresAt,
    },
    include: { team: true },
  })
}

export async function getTeamInviteCodes(teamId: string) {
  return db.inviteCode.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: { team: true },
  })
}

export async function getTeamMembers(teamId: string) {
  return db.user.findMany({
    where: { teamId },
    select: {
      id: true,
      email: true,
      nickname: true,
      role: true,
      createdAt: true,
    },
  })
}
```

- [ ] **Step 3: 创建组件需要先添加 shadcn/ui card**

```bash
npx shadcn@latest add card badge table dialog -y
```

- [ ] **Step 4: 创建 components/team/InviteCodeManager.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/foundation/hooks/usePermissions'

interface InviteCode {
  id: string
  code: string
  teamName: string
  used: boolean
  expiresAt: string
  createdAt: string
}

export function InviteCodeManager() {
  const { isAdmin } = usePermissions()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)

  async function fetchCodes() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/teams/invite-codes')
      if (response.ok) {
        const data = await response.json()
        setCodes(data)
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function createCode() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/teams/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: 'current-team' }),
      })
      if (response.ok) {
        const code = await response.json()
        setNewCode(code.code)
        fetchCodes()
      }
    } catch (error) {
      console.error('Failed to create code:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-warm-silver">Only admins can manage invite codes.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Codes</CardTitle>
        <CardDescription>Generate codes to invite new team members</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={createCode} disabled={isLoading}>
            Generate New Code
          </Button>
          <Button variant="outline" onClick={fetchCodes} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {newCode && (
          <div className="p-4 bg-matcha-300 text-white rounded-card">
            <p className="text-sm font-medium">New invite code:</p>
            <p className="text-2xl font-mono font-bold mt-1">{newCode}</p>
            <p className="text-sm mt-2 opacity-80">Share this code with your team member</p>
          </div>
        )}

        {codes.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono">{code.code}</TableCell>
                  <TableCell>
                    <Badge variant={code.used ? 'secondary' : 'default'}>
                      {code.used ? 'Used' : 'Available'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(code.expiresAt) < new Date() ? (
                      <span className="text-red-500">Expired</span>
                    ) : (
                      new Date(code.expiresAt).toLocaleDateString()
                    )}
                  </TableCell>
                  <TableCell>{new Date(code.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: 创建 app/(app)/team/settings/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/foundation/lib/auth'
import { InviteCodeManager } from '@/components/team/InviteCodeManager'

export default async function TeamSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Team Settings</h1>
        <p className="text-warm-silver mt-1">Manage your team and invite new members</p>
      </div>

      <InviteCodeManager />
    </div>
  )
}
```

- [ ] **Step 6: 提交**

```bash
git add domains/team/ components/team/ app/\(app\)/team/
git commit -m "Task 7: Add team invite code management UI"
```

---

## 自检清单

完成所有 Task 后，检查：

### 1. Spec 覆盖
| Spec Section | Task |
|---|---|
| Auth 模块（注册/登录/邀请码/团队） | Task 3, 4, 7 |
| RBAC 中间件 | Task 6 |
| MySQL + Prisma | Task 2 |
| Next.js + shadcn/ui + Clay 设计 | Task 1 |
| 布局（AppShell/Sidebar/TopBar） | Task 5 |

### 2. 占位符扫描
- 无 "TODO" / "TBD" / "implement later"
- 所有 API route 有实际错误处理
- 所有表单有实际提交逻辑

### 3. 类型一致性
- `foundation/types/auth.ts` 中 `Role` = `'ADMIN' | 'MEMBER'` 与 Prisma schema `enum Role` 一致
- `usePermissions.ts` 中 permission 检查与 `domains/auth/service.ts` 中的权限矩阵一致
- NextAuth session 类型扩展正确

### 4. 目录结构
所有文件位于正确层级（L0-L3），无跨层依赖

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-virtual-ip-video-agent-phase1.md`**

Phase 1 共 7 个 Task，涵盖项目脚手架、认证、RBAC 最小闭环。

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
