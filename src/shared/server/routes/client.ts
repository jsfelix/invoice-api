import { randomUUID } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'

import { DatabaseConnection } from '@/shared/database'

import { ensureAuthenticated } from '../middlewares/ensure-authenticated'

export const clientRouter = Router()

const { prisma } = DatabaseConnection.getInstance()

clientRouter.post('/', ensureAuthenticated, async (req, res) => {
  const bodySchema = z.object({
    name: z.string(),
    document: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z
      .object({
        street: z.string(),
        number: z.string(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string(),
        state: z.string(),
        zipcode: z.string().optional(),
        country: z.string().default('BR'),
      })
      .optional(),
  })
  const { name, email, document, phone, address } = bodySchema.parse(req.body)
  const client = await prisma.client.create({
    data: {
      id: randomUUID(),
      name,
      email,
      document,
      phone,
      address: address
        ? [
            `${address.street}, ${address.number}`,
            address.complement,
            address.neighborhood,
            `${address.city}/${address.state}`,
            address.zipcode,
            address.country,
          ]
            .filter((item) => item)
            .join(', ')
        : undefined,
    },
  })
  return res.status(201).json({ client })
})

clientRouter.get('/', ensureAuthenticated, async (_req, res) => {
  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
  })
  return res.json({ clients })
})
