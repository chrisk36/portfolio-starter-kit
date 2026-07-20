import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: 'Code',
  description: 'Code projects and technical builds.',
}

export default function Page() {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Code</h1>
      <BlogPosts category="code" />
    </section>
  )
}
