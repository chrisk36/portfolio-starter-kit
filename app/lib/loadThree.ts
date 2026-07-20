const THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'

declare global {
  interface Window {
    THREE?: any
  }
}

let loadingPromise: Promise<any> | null = null

export function loadThree(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.THREE) return Promise.resolve(window.THREE)
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${THREE_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.THREE), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = THREE_SRC
    script.async = true
    script.addEventListener('load', () => resolve(window.THREE), { once: true })
    document.head.appendChild(script)
  })

  return loadingPromise
}
