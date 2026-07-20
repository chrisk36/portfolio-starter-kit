import { getBlogPosts } from 'app/blog/utils'
import SpaceBackdrop from 'app/components/SpaceBackdrop'
import SpaceHero from 'app/components/SpaceHero'
import ProjectGrid from 'app/components/ProjectGrid'

export default function MainMenu() {
  const allPosts = getBlogPosts().sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime()
  )

  const highlights = allPosts.slice(0, 6)

  return (
    <>
      {/* Fixed space background behind the whole page */}
      <SpaceBackdrop />

      {/* First screen: 3D mission-control hero */}
      <SpaceHero highlights={highlights} />

      {/* Scroll down → all projects, over a soft scrim on the same background */}
      <section className="sp-projects" id="projects">
        <div className="sp-projects-inner">
          <p className="sp-projects-eyebrow">— THE WORK —</p>
          <h2 className="sp-projects-title">Projects</h2>
          <p className="sp-projects-sub">
            A selection of things I&apos;ve built across code &amp; design.
          </p>
          <ProjectGrid posts={allPosts} />
        </div>
      </section>
    </>
  )
}
