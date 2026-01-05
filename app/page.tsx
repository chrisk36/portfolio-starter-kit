import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <section>
      {/* Short, direct intro */}
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">
        Hi, I’m Christian!
      </h1>

      <p className="mb-4 text-lg text-neutral-800 dark:text-neutral-200">
        I’m a student at the University of Pennsylvania majoring in Computer Science
        and minoring in Design.
      </p>

      {/* Links */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <a
          href="https://github.com/chrisk36"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        >
          GitHub
        </a>

        <a
          href="/resume/Christian Kim Resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
        >
          Resume (PDF)
        </a>
      </div>

      {/* More personal / reflective section */}
      <p className="mb-10 max-w-4xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
        I’m especially interested in the intersection of software, design, and
        interactive systems. Through coursework, projects, and research, I’ve grown
        to care not just about whether something works, but how it feels to use.
        I enjoy thinking through UI/UX decisions, game mechanics, and system design
        choices that shape user behavior and experience—whether that’s through
        thoughtful interfaces, smooth interactions, or well-designed gameplay.
      </p>

      <div className="my-10">
        <BlogPosts />
      </div>
    </section>
  )
}
