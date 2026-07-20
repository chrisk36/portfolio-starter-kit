import Link from 'next/link'
import type { Metadata } from 'app/blog/utils'

type Post = { slug: string; metadata: Metadata }

/**
 * Responsive card grid of projects — image (or a themed placeholder), title, short
 * description, and a category chip, with a hover lift + image zoom. Styled for the space
 * theme so it reads well over the fixed backdrop's scrim.
 */
export default function ProjectGrid({ posts }: { posts: Post[] }) {
  return (
    <div className="sp-grid">
      {posts.map((p) => (
        <Link key={p.slug} href={`/blog/${p.slug}`} className={`sp-card sp-card-${p.metadata.category}`}>
          <div className="sp-card-media">
            {p.metadata.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.metadata.image} alt="" loading="lazy" />
            ) : (
              <div className="sp-card-ph" aria-hidden>
                <span>{p.metadata.title.charAt(0)}</span>
              </div>
            )}
            <span className="sp-card-cat">{p.metadata.category}</span>
          </div>
          <div className="sp-card-body">
            <h3 className="sp-card-title">{p.metadata.title}</h3>
            <p className="sp-card-desc">{p.metadata.summary}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
