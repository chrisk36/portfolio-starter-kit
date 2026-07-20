import { notFound } from 'next/navigation'
import { CustomMDX } from 'app/components/mdx'
import { formatDate, getBlogPosts } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'
import SpaceBackdrop from 'app/components/SpaceBackdrop'
import SpaceDecor from 'app/components/SpaceDecor'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  let posts = getBlogPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)
  if (!post) return

  let {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata

  let ogImage = image ? image : `${baseUrl}/og?title=${encodeURIComponent(title)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime,
      url: `${baseUrl}/blog/${post.slug}`,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function Blog({ params }: PageProps) {
  const { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)

  if (!post) {
    notFound()
  }

  return (
    <>
      {/* Same fixed space backdrop + side decor as the homepage — for continuity.
          Both are position:fixed, so they're identical on every page regardless of length. */}
      <SpaceBackdrop />
      <SpaceDecor />
      <section className="sp-article-wrap">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.metadata.title,
              datePublished: post.metadata.publishedAt,
              dateModified: post.metadata.publishedAt,
              description: post.metadata.summary,
              image: post.metadata.image
                ? `${baseUrl}${post.metadata.image}`
                : `/og?title=${encodeURIComponent(post.metadata.title)}`,
              url: `${baseUrl}/blog/${post.slug}`,
              author: {
                '@type': 'Person',
                name: 'My Portfolio',
              },
            }),
          }}
        />
        <p className="sp-article-meta">
          <span className={`sp-article-cat sp-article-cat-${post.metadata.category}`}>
            {post.metadata.category}
          </span>
          {formatDate(post.metadata.publishedAt)}
        </p>
        <h1 className="sp-article-title">{post.metadata.title}</h1>
        <article className="prose sp-prose">
          <CustomMDX source={post.content} />
        </article>
      </section>
    </>
  )
}
