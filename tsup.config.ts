import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/shared/server/index.ts'],
  bundle: true,
  minify: true,
})
