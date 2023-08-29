import { debuglog } from 'node:util'

export const logInfo = (message: string) => debuglog('server:info')(message)

export const logWarn = (message: string) => debuglog('server:warn')(message)

export const logError = (message: string) => debuglog('server:error')(message)
