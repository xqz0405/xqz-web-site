import { defineCollection, z } from 'astro:content'

const article = z.object({
  title: z.string(),
  slug: z.string().optional()
})

const go = defineCollection({
  type: 'content',
  schema: article
})

const nodejs = defineCollection({
  type: 'content',
  schema: article
})

const python = defineCollection({
  type: 'content',
  schema: article
})

const webFrontend = defineCollection({
  type: 'content',
  schema: article
})

export const collections = { go, nodejs, python, 'web-前端': webFrontend }
