import 'express-async-errors'
import express, { NextFunction, Request, Response } from 'express'
import morgan from 'morgan'
import { ZodError } from 'zod'

import { logError, logInfo } from '@/config/debug'
import { env } from '@/config/env'

import { AppError } from '../errors/app-error'
import { clientRouter } from './routes/client'
import { invoiceRouter } from './routes/invoice'
import { providerRouter } from './routes/provider'

const PORT = env.APP_PORT

const app = express()

// enable JSON request body
app.use(express.json())

// Disable express info
app.disable('x-powerd-by')
app.use((_req, res, next) => {
  res.setHeader('X-Powered-By', 'Invoice API')
  next()
})

// enable request logs
app.use(morgan('tiny'))

// health check
app.get(['/', '/health'], (_req, res) => {
  return res.json({
    status: 'UP',
    message: 'welcome to invoice-api',
  })
})

// api routes
app.use('/clients', clientRouter)
app.use('/invoices', invoiceRouter)
app.use('/providers', providerRouter)
app.all('*', (_req, res) => {
  return res.status(405).json({
    status: 'error',
    message: 'method not allowed',
  })
})

// global exception handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // zod error
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'validationError',
      issues: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  // app error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
  }

  // unknwon error
  logError(err.stack || '')
  return res.status(500).json({
    status: 'error',
    message: 'internal server error',
  })
})

app.listen(PORT, () => {
  logInfo(`server running on port ${PORT}`)
})
