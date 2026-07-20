import Link from 'next/link'
import { formatDate, getBlogPosts, type Category } from 'app/blog/utils'

type BlogPostsProps = {
  category?: Category
}

const categoryStyles: Record<Category, string> = {
  design: 'bg-purple-100 text-purple-700',
  code: 'bg-blue-100 text-blue-700',
}

export function BlogPosts({ category }: BlogPostsProps) {
  let posts = getBlogPosts()

  if (category) {
    posts = posts.filter((p) => p.metadata.category === category)
  }

  posts = posts.sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime()
  )

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          className="block group"
        >
          <div className="flex gap-4 items-start">
            {/* date */}
            <p className="text-sm text-neutral-500 w-[150px] shrink-0 tabular-nums">
              {formatDate(post.metadata.publishedAt)}
            </p>

            {/* content */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${categoryStyles[post.metadata.category]}`}
                >
                  {post.metadata.category}
                </span>

                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 group-hover:underline">
                  {post.metadata.title}
                </h3>
              </div>

              {/* summary */}
              <p className="text-sm text-neutral-600 dark:text-neutral-400 w-full">
                {post.metadata.summary}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
