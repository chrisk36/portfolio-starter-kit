import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: 'Projects',
  description: 'A selection of my work across games, design, and software.',
}

export default function Page() {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Projects</h1>
      <BlogPosts />
    </section>
  )
}
