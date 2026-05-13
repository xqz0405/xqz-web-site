import fs from 'fs-extra'
import path from 'path'
import matter from 'gray-matter'
import { globSync } from 'glob'

const SCRIPT_DIR = path.dirname(import.meta.url.replace('file:///', ''))
const SITE_ROOT = path.resolve(SCRIPT_DIR, '..')
const OBSIDIAN_ROOT = path.resolve(SITE_ROOT, 'xqz-web')
const DOCS_ROOT = path.resolve(SITE_ROOT, 'src/content')
const STACKS_CONFIG = path.resolve(SCRIPT_DIR, 'stacks.json')

const EXCLUDE_DIRS = new Set(['.obsidian', 'templates', '.git'])

// Normalize path separators to forward slashes for cross-platform consistency
function toPosix(p) {
  return p.replace(/\\/g, '/')
}

function loadStacks() {
  const raw = fs.readJsonSync(STACKS_CONFIG)
  const map = {}
  for (const s of raw) {
    map[s.obsidianDir] = s
  }
  return { list: raw, byObsidianDir: map }
}

function scanFiles() {
  const { list, byObsidianDir } = loadStacks()
  const entries = []

  for (const stack of list) {
    const stackDir = path.join(OBSIDIAN_ROOT, stack.obsidianDir)
    if (!fs.existsSync(stackDir)) {
      console.warn(`[WARN] Stack directory not found: ${stackDir}`)
      continue
    }

    const files = globSync('**/*.md', { cwd: stackDir, ignore: ['templates/**', '.obsidian/**'] })

    for (const rel of files) {
      const posixRel = toPosix(rel)
      const fullPath = path.join(stackDir, rel)
      const parsed = path.parse(rel)
      const category = toPosix(path.dirname(rel))
      const fileName = parsed.name
      const isIndex = fileName === '_索引'

      // Content ID uses forward slashes for Astro compatibility
      const contentId = isIndex
        ? (category === '.' ? 'index.md' : `${category}/index.md`)
        : posixRel

      const outRelPath = isIndex
        ? (category === '.' ? 'index.md' : `${category}/index.md`)
        : posixRel

      const vpFullPath = path.join(DOCS_ROOT, stack.name, outRelPath)

      entries.push({
        obsidianPath: fullPath,
        obsidianRel: toPosix(path.join(stack.obsidianDir, rel)),
        outputPath: vpFullPath,
        stack: stack.name,
        obsidianDir: stack.obsidianDir,
        category: category === '.' ? '' : category,
        fileName,
        isIndex,
        contentId,
        displayName: isIndex ? (category || stack.obsidianDir) : fileName
      })
    }
  }

  return entries
}

function buildIndex(entries) {
  const nameIndex = {}
  for (const e of entries) {
    if (e.isIndex) continue
    const key = e.fileName
    if (!nameIndex[key]) nameIndex[key] = []
    nameIndex[key].push(e)
  }
  return nameIndex
}

function isArraySyntax(inner) {
  return /[\d,]/.test(inner) && /^\[/.test(inner) === false
}

function resolveLink(linkText, currentEntry, nameIndex) {
  let displayName = linkText
  let targetName = linkText

  if (linkText.includes('|')) {
    const parts = linkText.split('|')
    targetName = parts[0].trim()
    displayName = parts[1].trim()
  }

  const candidates = nameIndex[targetName]
  if (!candidates) return null

  if (candidates.length === 1) {
    return { target: candidates[0], displayName }
  }

  const sameStack = candidates.find(c => c.stack === currentEntry.stack)
  if (sameStack) {
    return { target: sameStack, displayName }
  }

  return { target: candidates[0], displayName }
}

function computeRelativeLink(fromEntry, toEntry) {
  const slug = toPosix(toEntry.contentId.replace(/\.md$/, ''))
  return `/${toEntry.stack}/${encodeURI(slug)}`
}

function convertWikiLinks(content, currentEntry, nameIndex, brokenLinks) {
  const lines = content.split('\n')
  const result = []
  let inCodeBlock = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      result.push(line)
      continue
    }

    if (inCodeBlock) {
      result.push(line)
      continue
    }

    // Process inline: protect backtick spans, then convert wiki links
    const protectedLine = protectInlineCode(line, (cleaned) => {
      return cleaned.replace(/\[\[([^\]]+)\]\]/g, (match, inner) => {
        if (isArraySyntax(inner)) return match

        const resolved = resolveLink(inner, currentEntry, nameIndex)
        if (!resolved) {
          brokenLinks.push({
            from: currentEntry.obsidianRel,
            link: inner
          })
          return `**${inner}**`
        }

        const href = computeRelativeLink(currentEntry, resolved.target)
        return `[${resolved.displayName}](${href})`
      })
    })
    result.push(protectedLine)
  }

  return result.join('\n')
}

function protectInlineCode(line, processor) {
  const segments = []
  let remaining = line
  let inBacktick = false
  let current = ''
  let i = 0

  while (i < remaining.length) {
    if (remaining[i] === '`') {
      if (!inBacktick) {
        segments.push({ type: 'text', content: current })
        current = '`'
        inBacktick = true
      } else {
        current += '`'
        segments.push({ type: 'code', content: current })
        current = ''
        inBacktick = false
      }
      i++
    } else {
      current += remaining[i]
      i++
    }
  }

  if (current) {
    segments.push({ type: inBacktick ? 'code' : 'text', content: current })
  }

  return segments.map(seg =>
    seg.type === 'text' ? processor(seg.content) : seg.content
  ).join('')
}

function adaptFrontmatter(rawMatter, entry) {
  const data = { ...rawMatter }

  if (!data.title) {
    data.title = entry.isIndex
      ? (entry.category || entry.stack)
      : entry.fileName
  }

  return data
}

function processFile(entry, nameIndex, brokenLinks) {
  const raw = fs.readFileSync(entry.obsidianPath, 'utf-8')
  const { data: rawMatter, content } = matter(raw)

  const adaptedMatter = adaptFrontmatter(rawMatter, entry)
  const converted = convertWikiLinks(content, entry, nameIndex, brokenLinks)

  // No Vue escaping needed — Astro renders markdown as plain HTML
  const output = matter.stringify(converted, adaptedMatter)
  fs.ensureDirSync(path.dirname(entry.outputPath))
  fs.writeFileSync(entry.outputPath, output)
}

function cleanContent() {
  const { list } = loadStacks()
  for (const stack of list) {
    const dir = path.join(DOCS_ROOT, stack.name)
    if (fs.existsSync(dir)) {
      fs.removeSync(dir)
    }
  }
}

function main() {
  console.log('=== Preprocessing start (Astro) ===')
  console.log(`Obsidian root: ${OBSIDIAN_ROOT}`)
  console.log(`Content root: ${DOCS_ROOT}`)

  cleanContent()

  const entries = scanFiles()
  console.log(`Found ${entries.length} files`)

  const nameIndex = buildIndex(entries)

  const duplicates = Object.entries(nameIndex).filter(([, v]) => v.length > 1)
  if (duplicates.length > 0) {
    console.log(`\n[INFO] Cross-stack duplicate names (${duplicates.length}):`)
    for (const [name, matches] of duplicates) {
      console.log(`  "${name}" → ${matches.map(m => m.stack).join(', ')}`)
    }
  }

  const brokenLinks = []
  for (const entry of entries) {
    processFile(entry, nameIndex, brokenLinks)
  }

  if (brokenLinks.length > 0) {
    const logPath = path.resolve('../broken-links.log')
    const logContent = brokenLinks
      .map(b => `${b.from} → ${b.link}`)
      .join('\n')
    fs.writeFileSync(logPath, logContent)
    console.log(`\n[WARN] ${brokenLinks.length} broken links → broken-links.log`)
  } else {
    console.log('\nNo broken links found.')
  }

  console.log(`\n=== Preprocessing done (${entries.length} files) ===`)

  return entries
}

main()
