import { getBlogPosts } from 'app/blog/utils'
import SpaceHero from 'app/components/SpaceHero'

export default function MainMenu() {
  const allPosts = getBlogPosts().sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime()
  )

  const highlights = allPosts.slice(0, 6)

  return <SpaceHero highlights={highlights} />
}
