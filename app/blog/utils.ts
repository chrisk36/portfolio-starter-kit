import fs from 'fs'
import path from 'path'

export type Category = 'games' | 'design' | 'code'

export type Metadata = {
  title: string
  publishedAt: string
  summary: string
  category: Category
  image?: string
}

function parseFrontmatter(fileContent: string) {
  const frontmatterRegex = /---\s*([\s\S]*?)\s*---/
  const match = frontmatterRegex.exec(fileContent)

  if (!match) {
    throw new Error('Missing frontmatter in MDX file')
  }

  const frontMatterBlock = match[1]
  const content = fileContent.replace(frontmatterRegex, '').trim()
  const frontMatterLines = frontMatterBlock.trim().split('\n')

  // 1) parse into a simple string map (no TS drama)
  const raw: Record<string, string> = {}
  for (const line of frontMatterLines) {
    const [key, ...valueArr] = line.split(': ')
    if (!key) continue
    let value = valueArr.join(': ').trim()
    value = value.replace(/^['"](.*)['"]$/, '$1')
    raw[key.trim()] = value
  }

  // 2) validate category and build strongly typed metadata
  const category = raw.category
  if (category !== 'games' && category !== 'design' && category !== 'code') {
    throw new Error(`Invalid or missing category "${category}" in frontmatter`)
  }

  const metadata: Metadata = {
    title: raw.title ?? '',
    publishedAt: raw.publishedAt ?? '',
    summary: raw.summary ?? '',
    category,
    image: raw.image,
  }

  // Optional: stronger validation if you want
  if (!metadata.title) throw new Error('Missing title in frontmatter')
  if (!metadata.publishedAt) throw new Error('Missing publishedAt in frontmatter')
  if (!metadata.summary) throw new Error('Missing summary in frontmatter')

  return { metadata, content }
}

function getMDXFiles(dir: string) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx')
}

function readMDXFile(filePath: string) {
  const rawContent = fs.readFileSync(filePath, 'utf-8')
  return parseFrontmatter(rawContent)
}

function getMDXData(dir: string) {
  const mdxFiles = getMDXFiles(dir)

  return mdxFiles.map((file) => {
    const { metadata, content } = readMDXFile(path.join(dir, file))
    const slug = path.basename(file, path.extname(file))

    return {
      metadata,
      slug,
      content,
    }
  })
}

export function getBlogPosts() {
  return getMDXData(path.join(process.cwd(), 'app', 'blog', 'posts'))
}

export function formatDate(date: string, includeRelative = false) {
  let currentDate = new Date()

  if (!date.includes('T')) {
    date = `${date}T00:00:00`
  }

  let targetDate = new Date(date)

  let yearsAgo = currentDate.getFullYear() - targetDate.getFullYear()
  let monthsAgo = currentDate.getMonth() - targetDate.getMonth()
  let daysAgo = currentDate.getDate() - targetDate.getDate()

  let formattedDate = ''

  if (yearsAgo > 0) {
    formattedDate = `${yearsAgo}y ago`
  } else if (monthsAgo > 0) {
    formattedDate = `${monthsAgo}mo ago`
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}d ago`
  } else {
    formattedDate = 'Today'
  }

  let fullDate = targetDate.toLocaleString('en-us', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (!includeRelative) {
    return fullDate
  }

  return `${fullDate} (${formattedDate})`
}
