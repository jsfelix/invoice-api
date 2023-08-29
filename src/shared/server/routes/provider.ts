import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { Router } from 'express'
import { sign } from 'jsonwebtoken'
import { z } from 'zod'

import { env } from '@/config/env'
import { DatabaseConnection } from '@/shared/database'
import { AppError } from '@/shared/errors/app-error'
import { exclude } from '@/shared/utils'

export const providerRouter = Router()

const { prisma } = DatabaseConnection.getInstance()

providerRouter.post('/', async (req, res) => {
  const bodySchema = z
    .object({
      name: z.string({
        required_error: 'name is required',
        invalid_type_error: 'name must be a string',
      }),
      email: z
        .string({
          required_error: 'email is required',
          invalid_type_error: 'email must be a string',
        })
        .email('invalid email'),
      password: z
        .string({
          required_error: 'password is required',
          invalid_type_error: 'password must be a string',
        })
        .regex(
          /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})/g,
          'weak password',
        ),
    })
    .strict()
  const { name, email, password } = bodySchema.parse(req.body)
  const providerExists = await prisma.provider.findUnique({ where: { email } })
  if (providerExists) throw new AppError('provider already exists')
  const passwordHash = await bcrypt.hash(password, 10)
  const provider = await prisma.provider.create({
    data: {
      id: randomUUID(),
      name,
      email,
      passwordHash,
    },
  })
  return res.status(201).json({ provider: exclude(provider, ['passwordHash']) })
})

providerRouter.post('/auth', async (req, res) => {
  const bodySchema = z
    .object({
      email: z
        .string({
          required_error: 'email is required',
          invalid_type_error: 'email must be a string',
        })
        .email('invalid email'),
      password: z.string({
        required_error: 'password is required',
        invalid_type_error: 'password must be a string',
      }),
    })
    .strict()
  const { email, password } = bodySchema.parse(req.body)
  const provider = await prisma.provider.findUnique({ where: { email } })
  if (!provider) throw new AppError('unauthorized', 401)
  const checkPassword = await bcrypt.compare(password, provider.passwordHash)
  if (!checkPassword) throw new AppError('unauthorized', 401)
  const accessToken = sign({}, env.APP_SECRET, {
    subject: provider.id,
    expiresIn: 24 * 60 * 60, // 24 hours
    audience: 'provider',
  })
  return res.json({
    provider: {
      id: provider.id,
      name: provider.name,
      email: provider.email,
    },
    accessToken,
  })
})
