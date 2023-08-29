import { NextFunction, Request, Response } from 'express'
import { verify } from 'jsonwebtoken'

import { env } from '@/config/env'
import { AppError } from '@/shared/errors/app-error'

export async function ensureAuthenticated(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) throw new AppError('unauthorized', 401)
    const [, token] = authHeader.split(' ')
    const decoded = verify(token, env.APP_SECRET)
    req.providerId = decoded.sub as string
  } catch (err) {
    throw new AppError('unauthorized', 401)
  }
  return next()
}
