import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const article = await prisma.article.findUnique({ where: { id } })
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'articles')
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${id}.jpg`
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    const photoUrl = `/uploads/articles/${filename}`
    await prisma.article.update({
      where: { id },
      data: { photoUrl },
    })

    return NextResponse.json({ photoUrl })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Upload article photo error:', errMsg, error)
    const isWriteError = errMsg.includes('EACCES') || errMsg.includes('EPERM') || errMsg.includes('ENOENT')
    return NextResponse.json(
      { error: isWriteError ? `File write failed: ${errMsg}. Check server write permissions on the uploads directory.` : 'Internal server error' },
      { status: 500 }
    )
  }
}
