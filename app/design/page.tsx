import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: 'Games',
  description: 'Game projects and interactive prototypes.',
}

export default function Page() {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Games</h1>
      <BlogPosts category="design" />
    </section>
  )
}
