import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://docs.xqzweb.xyz',
  lang: 'zh-CN',
  build: {
    format: 'directory'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
})
