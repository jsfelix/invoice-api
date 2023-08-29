import { randomUUID } from 'crypto'
import { format } from 'date-fns'
import { Router } from 'express'
import { z } from 'zod'

import { DatabaseConnection } from '@/shared/database'
import { AppError } from '@/shared/errors/app-error'

import { ensureAuthenticated } from '../middlewares/ensure-authenticated'

export const invoiceRouter = Router()

const { prisma } = DatabaseConnection.getInstance()

invoiceRouter.post('/', ensureAuthenticated, async (req, res) => {
  const { providerId } = req
  const bodySchema = z.object({
    clientId: z.string(),
  })
  const { clientId } = bodySchema.parse(req.body)
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) throw new AppError('client does not exist')
  let seq = 1
  const [maxInvoice] = await prisma.invoice.findMany({
    where: { providerId },
    orderBy: { seq: 'desc' },
    take: 1,
  })
  if (maxInvoice) seq = maxInvoice.seq + 1
  const invoice = await prisma.invoice.create({
    data: {
      id: randomUUID(),
      discount: 0,
      seq,
      clientId: client.id,
      providerId,
    },
  })
  return res.status(201).json({ invoice })
})

invoiceRouter.get('/:invoiceId', ensureAuthenticated, async (req, res) => {
  const { providerId } = req
  const paramsSchema = z.object({
    invoiceId: z.string(),
  })
  const { invoiceId } = paramsSchema.parse(req.params)
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          email: true,
          document: true,
          address: true,
          phone: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          document: true,
          address: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          date: true,
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  })
  if (!invoice) throw new AppError('invoice not found', 404)
  if (invoice.providerId !== providerId)
    throw new AppError('forbidden access', 403)
  const subTotal = invoice.items.reduce(
    (prev, cur) => prev + cur.quantity * cur.unitPrice,
    0,
  )
  const total = subTotal - invoice.discount
  return res.json({
    invoice: {
      ...invoice,
      subTotal,
      total,
    },
  })
})

invoiceRouter.post(
  '/:invoiceId/items',
  ensureAuthenticated,
  async (req, res) => {
    const { providerId } = req
    const paramsSchema = z.object({
      invoiceId: z.string(),
    })
    const bodySchema = z.object({
      description: z.string(),
      quantity: z.coerce.number(),
      unitPrice: z.coerce.number(),
      date: z.coerce.date(),
    })
    const { invoiceId } = paramsSchema.parse(req.params)
    const { description, quantity, unitPrice, date } = bodySchema.parse(
      req.body,
    )
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    })
    if (!invoice) throw new AppError('invoice not found')
    if (invoice.providerId !== providerId)
      throw new AppError('forbidden access', 403)
    const invoiceItem = await prisma.invoiceItem.create({
      data: {
        id: randomUUID(),
        description,
        quantity,
        unitPrice,
        date: format(date, 'yyyy-MM-dd'),
        invoiceId: invoice.id,
      },
    })
    return res.status(201).json({ invoiceItem })
  },
)

invoiceRouter.delete(
  '/:invoiceId/items/:itemId',
  ensureAuthenticated,
  async (req, res) => {
    const { providerId } = req
    const paramsSchema = z.object({
      invoiceId: z.string(),
      itemId: z.string(),
    })
    const { invoiceId, itemId } = paramsSchema.parse(req.params)
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    })
    if (!invoice) throw new AppError('invoice not found')
    if (invoice.providerId !== providerId)
      throw new AppError('forbidden access', 403)
    if (invoice.items.findIndex((item) => item.id === itemId) === -1)
      throw new AppError('invoice item not found')
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        items: {
          delete: {
            id: itemId,
          },
        },
      },
    })
    return res.status(204).send()
  },
)
