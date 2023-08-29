import { PrismaClient } from '@prisma/client'

export class DatabaseConnection {
  private static instance: DatabaseConnection

  #prisma: PrismaClient

  private constructor() {
    this.#prisma = new PrismaClient()
  }

  public static getInstance(): DatabaseConnection {
    if (!this.instance) this.instance = new DatabaseConnection()
    return this.instance
  }

  public get prisma(): PrismaClient {
    return this.#prisma
  }
}
