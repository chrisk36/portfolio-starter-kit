'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Metadata } from 'app/blog/utils'
import { loadThree } from 'app/lib/loadThree'

type Post = { slug: string; metadata: Metadata }

interface SpaceHeroProps {
  highlights: Post[]
}

const PHASE_CLIPS = [
  'inset(0 85% 0 0)',
  'inset(0 60% 0 0)',
  'inset(0 35% 0 0)',
  'inset(0 12% 0 0)',
  'inset(0 0% 0 0)',
]

const ACCENT_HEX: Record<string, number> = {
  code: 0x6fb4ff,
  design: 0xb39bff,
}

const CONTENT_CENTER_Y = 0.5
const CONTENT_HALF_HEIGHT = 4.8
const CONTENT_HALF_WIDTH = 7.5

function drawPlaceholderCanvas(hex: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 640
  const ctx = c.getContext('2d')!
  const color = `#${hex.toString(16).padStart(6, '0')}`
  const grad = ctx.createLinearGradient(0, 0, 1024, 640)
  grad.addColorStop(0, '#181440')
  grad.addColorStop(1, '#101030')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 640)
  ctx.strokeStyle = color
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(512, 280, 110, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(462, 280)
  ctx.lineTo(512, 340)
  ctx.lineTo(580, 220)
  ctx.lineWidth = 14
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.fillStyle = 'rgba(245,243,255,0.55)'
  ctx.font = '600 36px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('no preview yet', 512, 500)
  return c
}

function drawTitleCanvas(title: string, cat: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 320
  const ctx = c.getContext('2d')!
  const hex = ACCENT_HEX[cat] ?? 0x6fb4ff
  const color = '#' + hex.toString(16).padStart(6, '0')
  ctx.fillStyle = '#0c0a1e'
  ctx.fillRect(0, 0, 512, 320)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 512, 6)
  ctx.font = 'bold 30px monospace'
  ctx.fillStyle = color
  ctx.fillText(cat.toUpperCase(), 20, 48)
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fillRect(20, 64, 472, 2)
  ctx.fillStyle = '#f5f3ff'
  ctx.font = 'bold 46px sans-serif'
  const words = title.split(' ')
  let line = ''
  let y = 122
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word
    if (ctx.measureText(test).width > 472 && line !== '') {
      ctx.fillText(line, 20, y)
      y += 58
      line = word
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, 20, y)
  return c
}

export default function SpaceHero({ highlights }: SpaceHeroProps) {
  const [phase, setPhase] = useState(3)
  const [screenPos, setScreenPos] = useState({ left: 50, top: 60 })
  const [index, setIndex] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const starFieldRef = useRef<HTMLDivElement>(null)
  const sceneObjRef = useRef<any>(null)
  const highlightsRef = useRef(highlights)
  highlightsRef.current = highlights

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASE_CLIPS.length), 4000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const field = starFieldRef.current
    if (!field) return
    const nodes: HTMLDivElement[] = []
    for (let i = 0; i < 90; i++) {
      const s = document.createElement('div')
      s.className = 'sp-star'
      const size = 1 + Math.random() * 2
      s.style.width = `${size}px`
      s.style.height = `${size}px`
      s.style.top = `${Math.random() * 100}%`
      s.style.left = `${Math.random() * 100}%`
      s.style.animationDuration = `${2 + Math.random() * 3.5}s`
      s.style.animationDelay = `${Math.random() * 5}s`
      field.appendChild(s)
      nodes.push(s)
    }
    return () => nodes.forEach((n) => n.remove())
  }, [])

  useEffect(() => {
    let disposed = false
    let raf = 0

    loadThree().then(async (THREE) => {
      if (disposed) return
      try {
      const canvas = canvasRef.current
      const hero = heroRef.current
      if (!THREE || !canvas || !hero) return

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
      if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)

      scene.add(new THREE.HemisphereLight(0xc9bbff, 0x151033, 0.95))
      const dir = new THREE.DirectionalLight(0xffffff, 1.05)
      dir.position.set(5, 8, 10)
      scene.add(dir)
      const rim = new THREE.PointLight(0x6fb4ff, 1.1, 40)
      rim.position.set(-9, -2, 8)
      scene.add(rim)

      function lowPolyMat(color: number) {
        return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0.05 })
      }

      const group = new THREE.Group()
      scene.add(group)

      // ---- Moon — crescent built from tapered CylinderGeometry segments swept along an arc ----
      // Lower-left position creates diagonal balance with the planet (upper-right).
      const MOON_BASE_Y = -1.6
      function buildCrescent() {
        const cg = new THREE.Group()
        const mat = new THREE.MeshStandardMaterial({
          color: 0xf0ecff, flatShading: true, roughness: 0.88, metalness: 0.0,
        })
        const N = 20         // number of arc segments — more segments → smaller notch at each junction
        const R = 1.55       // arc radius
        const MAX_R = 0.27   // widest cross-section at arc midpoint
        const TIP_R = 0.044  // minimum radius at cusps (non-zero avoids degenerate geometry)
        const A0 = -Math.PI * 0.62  // start angle (~-112°)
        const A1 =  Math.PI * 0.62  // end angle  (~+112°)
        // 224° arc sweeping through the +X side → cusps point left, body bulges right

        const pts: any[] = []
        const radii: number[] = []
        const up = new THREE.Vector3(0, 1, 0)

        for (let i = 0; i <= N; i++) {
          const t = i / N
          const a = A0 + t * (A1 - A0)
          pts.push(new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), 0))
          radii.push(TIP_R + (MAX_R - TIP_R) * Math.sin(t * Math.PI))
        }

        // Tapered frustum segments: each cylinder spans from pts[i] to pts[i+1].
        // 12% length extension + openEnded caps: adjacent segments overlap, filling the
        // visual notch that would otherwise appear at each junction where endcap faces
        // meet at an angle. Same material color means any z-fighting is invisible.
        for (let i = 0; i < N; i++) {
          const a = pts[i], b = pts[i + 1]
          const dir = new THREE.Vector3().subVectors(b, a)
          const len = dir.length() * 1.12
          dir.normalize()
          const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(radii[i + 1], radii[i], len, 7, 1, true),
            mat
          )
          seg.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
          seg.quaternion.setFromUnitVectors(up, dir)
          cg.add(seg)
        }

        // Sharp conical cusp tips — one at each end of the arc
        const TIP_LEN = 0.30
        const cuspData = [
          { pt: pts[0],  dir: new THREE.Vector3().subVectors(pts[0],     pts[1]).normalize() },
          { pt: pts[N],  dir: new THREE.Vector3().subVectors(pts[N], pts[N - 1]).normalize() },
        ]
        cuspData.forEach(({ pt, dir: tipDir }) => {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(TIP_R * 1.6, TIP_LEN, 7, 1, false),
            mat
          )
          cone.position.set(
            pt.x + tipDir.x * TIP_LEN / 2,
            pt.y + tipDir.y * TIP_LEN / 2,
            pt.z + tipDir.z * TIP_LEN / 2,
          )
          cone.quaternion.setFromUnitVectors(up, tipDir)
          cg.add(cone)
        })

        return cg
      }

      const moon = buildCrescent()
      moon.position.set(-4.2, MOON_BASE_Y, -2.0)
      moon.rotation.set(0.15, 0.4, -0.2)  // slight tilt for 3D depth
      group.add(moon)

      // ---- Ringed planet (upper right, background) ----
      const planet = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), lowPolyMat(0xb39bff))
      planet.position.set(5.5, 3.8, -3.0)
      group.add(planet)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 8, 40), lowPolyMat(0x6fb4ff))
      ring.rotation.x = Math.PI / 2.4
      planet.add(ring)

      // ---- Rocket ----
      const rocket = new THREE.Group()
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 6), lowPolyMat(0xfdf6ec))
      nose.position.y = 1.1
      rocket.add(nose)
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 6), lowPolyMat(0xfdf6ec))
      rocket.add(body)
      const rocketWindow = new THREE.Mesh(
        new THREE.CircleGeometry(0.17, 14),
        new THREE.MeshStandardMaterial({ color: 0x6fb4ff, flatShading: true, emissive: 0x0b2a4a, emissiveIntensity: 0.4 })
      )
      rocketWindow.position.set(0, 0.15, 0.56)
      rocket.add(rocketWindow)
      const finGeo = new THREE.ConeGeometry(0.35, 0.7, 4)
      ;[
        [-0.55, -0.8, 0, -0.6],
        [0.55, -0.8, 0, 0.6],
      ].forEach((p) => {
        const fin = new THREE.Mesh(finGeo, lowPolyMat(0xb39bff))
        fin.position.set(p[0], p[1], p[2])
        fin.rotation.z = p[3]
        rocket.add(fin)
      })
      // Orange-red flame — distinct from yellow asteroids
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 6), lowPolyMat(0xff6b20))
      flame.position.y = -1.15
      flame.rotation.x = Math.PI
      rocket.add(flame)
      rocket.position.set(0.5, 4.6, 1.0)
      rocket.rotation.z = 0.1
      group.add(rocket)


      // ---- Asteroids — intentionally distributed, varying sizes, no clustering ----
      const rand = (a: number, b: number) => a + Math.random() * (b - a)
      const asteroidColors = [0x6fb4ff, 0xb39bff, 0xfdf6ec, 0xffb05c, 0xff6fd8, 0x5fe3d3]
      const asteroidSpecs: [number, number, number, number, number][] = [
        [-7.0,  3.2, -1.5, 0.38, 0],
        [-5.5, -1.2, -2.0, 0.15, 2],
        [ 2.8,  4.4, -1.5, 0.30, 1],
        [-6.2, -1.8, -0.8, 0.50, 4],
        [-4.8, -3.5,  0.5, 0.12, 5],
        [ 1.5,  4.6, -2.5, 0.26, 0],
        [ 4.5,  2.5, -1.0, 0.18, 3],
        [ 6.8,  3.4, -2.0, 0.44, 2],
        [ 5.2, -2.5, -1.5, 0.22, 1],
        [ 6.4,  0.6, -1.8, 0.55, 0],
        [-2.5, -3.0,  2.0, 0.32, 4],
        [ 0.5, -4.0, -0.5, 0.45, 3],
        [ 3.5, -3.5,  1.0, 0.10, 5],
        [-0.5,  2.2, -3.0, 0.36, 2],
        [ 6.2,  1.2, -3.5, 0.14, 1],
        [-3.8, -1.2,  3.5, 0.24, 0],
      ]
      const asteroids: any[] = []
      asteroidSpecs.forEach(([x, y, z, size, ci]) => {
        const m = new THREE.Mesh(
          new THREE.IcosahedronGeometry(size, 0),
          lowPolyMat(asteroidColors[ci])
        )
        m.position.set(x, y, z)
        m.userData = { base: [x, y, z], speed: 0.4 + rand(0, 0.55), phase: rand(0, Math.PI * 2) }
        group.add(m)
        asteroids.push(m)
      })

      // ---- Shooting stars ----
      function makeComet(start: any, end: any, speed: number, delay: number) {
        const g = new THREE.Group()
        const dirVec = new THREE.Vector3().subVectors(start, end).normalize()
        const head3 = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
        )
        g.add(head3)
        ;[0.22, 0.42, 0.65, 0.95, 1.3].forEach((dist, idx) => {
          const s = new THREE.Mesh(
            new THREE.SphereGeometry(Math.max(0.05 - idx * 0.008, 0.018), 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
          )
          s.position.copy(dirVec.clone().multiplyScalar(dist))
          s.userData.baseOpacity = 0.6 - idx * 0.11
          g.add(s)
        })
        g.userData = { start, end, speed, t: -delay }
        scene.add(g)
        return g
      }
      const comets: any[] = []
      for (let ci = 0; ci < 7; ci++) {
        const cs = new THREE.Vector3(rand(-8, 8), rand(4, 7), rand(-6, 4))
        const ce = new THREE.Vector3(cs.x + rand(-7, -3.5), cs.y + rand(-6, -3.5), cs.z + rand(-2, 2))
        comets.push(makeComet(cs, ce, rand(0.45, 0.85), rand(0, 7)))
      }

      // ---- Highlight screen console — old CRT TV GLB model ----
      const screenGroup = new THREE.Group()

      // Load GLTFLoader addon for Three.js r128 from CDN
      await new Promise<void>((resolve, reject) => {
        if ((THREE as any).GLTFLoader) { resolve(); return }
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
        s.onload = () => { console.log('[SpaceHero] GLTFLoader ready, THREE.GLTFLoader =', !!(THREE as any).GLTFLoader); resolve() }
        s.onerror = (e) => { console.error('[SpaceHero] GLTFLoader script failed', e); reject(e) }
        document.head.appendChild(s)
      })

      const gltfLoader = new (THREE as any).GLTFLoader()
      console.log('[SpaceHero] loading /old-tv-jeff.glb …')
      const gltf: any = await new Promise((res, rej) =>
        gltfLoader.load('/old-tv-jeff.glb', res, (xhr: any) => {
          if (xhr.total) console.log(`[SpaceHero] GLB ${Math.round(xhr.loaded/xhr.total*100)}%`)
        }, (err: any) => { console.error('[SpaceHero] GLB load error', err); rej(err) })
      )
      console.log('[SpaceHero] GLB loaded', gltf)

      // Normalize model to a predictable size
      const tvTemplate = gltf.scene
      const tvBox = new THREE.Box3().setFromObject(tvTemplate)
      const tvSize = tvBox.getSize(new THREE.Vector3())
      const tvCenter = tvBox.getCenter(new THREE.Vector3())
      console.log('[SpaceHero] TV size:', tvSize, 'center:', tvCenter)
      // Log all mesh bbox centers to find screen face
      tvTemplate.traverse((child: any) => {
        if (!child.isMesh) return
        const cb = new THREE.Box3().setFromObject(child)
        const cc = cb.getCenter(new THREE.Vector3())
        const cs = cb.getSize(new THREE.Vector3())
        console.log(`[SpaceHero] mesh:${child.name} c:(${cc.x.toFixed(3)},${cc.y.toFixed(3)},${cc.z.toFixed(3)}) s:(${cs.x.toFixed(3)},${cs.y.toFixed(3)},${cs.z.toFixed(3)})`)
      })

      const TARGET_W = 4.0
      const mainS = TARGET_W / (tvSize.x || 1)

      // No rotation — the TV model's screen face already points in +Z (toward camera).
      // Center by negating the raw bbox center so the bbox sits at the screenGroup origin.
      tvTemplate.position.set(-tvCenter.x, -tvCenter.y, -tvCenter.z)
      screenGroup.scale.setScalar(mainS)

      // Hide legs / stand pieces
      tvTemplate.traverse((child: any) => {
        if (!child.isMesh) return
        const n = (child.name || '').toLowerCase()
        if (n.includes('leg') || n.includes('stand') || n.includes('foot') || n.includes('support') || n.includes('base')) {
          child.visible = false
        }
      })
      screenGroup.add(tvTemplate)

      // Screen plane snapped to the screen-tube mesh (group1190924403) whose center in TV
      // local space is (0.169, -0.285, 0.456) — known from bbox logging.
      // After centering via position = -tvCenter: x = 0.169-0.189 = -0.020, y = -0.285-0.122 = -0.407.
      // Z: just behind the front face (tvSize.z/2) so the plane sits inside the bezel opening.
      const SCREEN_FACE_X = 0.169 - tvCenter.x   // ≈ -0.020
      const SCREEN_FACE_Y = -0.285 - tvCenter.y   // ≈ -0.407
      const screenMat = new THREE.MeshBasicMaterial({ side: THREE.FrontSide })
      const screenPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.50),
        screenMat
      )
      screenPlane.position.set(SCREEN_FACE_X, SCREEN_FACE_Y, tvSize.z * 0.5 - 0.01)
      screenGroup.add(screenPlane)
      const screenMesh = screenPlane

      const statusLights: any[] = []

      const consoleLight = new THREE.PointLight(0x6fb4ff, 0.7, 9)
      consoleLight.position.set(0, 0, tvSize.z * 0.5 + 1.8 / mainS)
      screenGroup.add(consoleLight)

      const SCREEN_BASE_ROT_Y = -0.65
      const SCREEN_BASE_ROT_X = 0.07
      screenGroup.rotation.y = SCREEN_BASE_ROT_Y
      screenGroup.rotation.x = SCREEN_BASE_ROT_X
      screenGroup.position.set(3.0, -0.9, -0.5)
      scene.add(screenGroup)

      // ── Screen canvas renderer ──────────────────────────────────────────────
      // To change how the screen looks, edit the constants and draw calls here.
      // To add/remove projects, edit the MDX files in app/blog/posts/ —
      // getBlogPosts() picks them up automatically via the highlights prop.

      const SCREEN_W = 1024
      const SCREEN_H = 640
      const SCREEN_PAD = 36          // left/top padding for text
      const CAT_Y = 54               // baseline Y for category label
      const TITLE_Y = 136            // baseline Y for first title line
      const TITLE_LINE_H = 68        // line height between title lines
      const VEIL_H = 280             // gradient veil height over the image

      function applyCanvas(c: HTMLCanvasElement) {
        const tex = new THREE.CanvasTexture(c)
        if ('encoding' in tex) (tex as any).encoding = THREE.sRGBEncoding
        const old = screenMat.map
        screenMat.map = tex
        screenMat.needsUpdate = true
        if (old) old.dispose()
      }

      function drawScreenCanvas(post: Post, img: HTMLImageElement | null): HTMLCanvasElement {
        const cat = post.metadata.category
        const hex = ACCENT_HEX[cat] ?? 0x6fb4ff
        const accentCol = '#' + hex.toString(16).padStart(6, '0')

        const c = document.createElement('canvas')
        c.width = SCREEN_W; c.height = SCREEN_H
        const ctx = c.getContext('2d')!

        // Background: project image (cover-fit) or dark gradient
        if (img) {
          const s = Math.max(SCREEN_W / img.width, SCREEN_H / img.height)
          ctx.drawImage(img, (SCREEN_W - img.width * s) / 2, (SCREEN_H - img.height * s) / 2, img.width * s, img.height * s)
        } else {
          const bg = ctx.createLinearGradient(0, 0, SCREEN_W, SCREEN_H)
          bg.addColorStop(0, '#181440'); bg.addColorStop(1, '#101030')
          ctx.fillStyle = bg; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)
        }

        // Gradient veil over top portion so title text is readable
        const veil = ctx.createLinearGradient(0, 0, 0, VEIL_H)
        veil.addColorStop(0, 'rgba(8,6,20,0.88)')
        veil.addColorStop(1, 'rgba(8,6,20,0)')
        ctx.fillStyle = veil; ctx.fillRect(0, 0, SCREEN_W, VEIL_H)

        // Category label — top-left
        ctx.font = `bold 22px monospace`
        ctx.fillStyle = accentCol
        ctx.fillText(cat.toUpperCase(), SCREEN_PAD, CAT_Y)

        // Thin accent divider
        ctx.strokeStyle = accentCol; ctx.lineWidth = 2; ctx.globalAlpha = 0.45
        ctx.beginPath()
        ctx.moveTo(SCREEN_PAD, CAT_Y + 14)
        ctx.lineTo(SCREEN_PAD + 220, CAT_Y + 14)
        ctx.stroke()
        ctx.globalAlpha = 1

        // Project title — top-left, word-wrapped
        ctx.fillStyle = '#f5f3ff'
        ctx.font = `bold 54px system-ui, sans-serif`
        const words = post.metadata.title.split(' ')
        let line = '', y = TITLE_Y
        for (const w of words) {
          const test = line + (line ? ' ' : '') + w
          if (ctx.measureText(test).width > SCREEN_W - SCREEN_PAD * 2 && line) {
            ctx.fillText(line, SCREEN_PAD, y); y += TITLE_LINE_H; line = w
          } else { line = test }
        }
        if (line) ctx.fillText(line, SCREEN_PAD, y)

        return c
      }

      function paintScreen(post: Post) {
        const hex = ACCENT_HEX[post.metadata.category] ?? 0x6fb4ff
        consoleLight.color.setHex(hex)

        if (post.metadata.image) {
          const img = new Image()
          img.onload  = () => applyCanvas(drawScreenCanvas(post, img))
          img.onerror = () => applyCanvas(drawScreenCanvas(post, null))
          img.src = post.metadata.image
        } else {
          applyCanvas(drawScreenCanvas(post, null))
        }
      }

      if (highlightsRef.current[0]) paintScreen(highlightsRef.current[0])

      function fitCamera() {
        const w = hero!.clientWidth
        const h = hero!.clientHeight
        if (!w || !h) return
        renderer.setSize(w, h)
        camera.aspect = w / h
        const vFov = (camera.fov * Math.PI) / 180
        const distV = CONTENT_HALF_HEIGHT / Math.tan(vFov / 2)
        const effAspect = Math.max(camera.aspect, 0.55)
        const distH = CONTENT_HALF_WIDTH / (Math.tan(vFov / 2) * effAspect)
        const dist = Math.max(distV, distH) * 1.08
        camera.position.set(0, CONTENT_CENTER_Y, dist)
        camera.lookAt(0, CONTENT_CENTER_Y, 0)
        camera.updateProjectionMatrix()

        const v = screenGroup.position.clone().project(camera)
        setScreenPos({
          left: ((v.x + 1) / 2) * 100,
          top: ((1 - v.y) / 2) * 100,
        })
      }
      fitCamera()
      window.addEventListener('resize', fitCamera)

      let t = 0
      let glitchUntil = 0
      function animate() {
        raf = requestAnimationFrame(animate)
        t += 0.012

        moon.rotation.y += 0.001
        moon.position.y = MOON_BASE_Y + Math.sin(t * 0.45) * 0.12
        planet.position.y = 3.8 + Math.sin(t * 0.7 + 1) * 0.18
        planet.rotation.y += 0.003
        rocket.position.y = 4.6 + Math.sin(t * 0.9 + 2) * 0.18
        rocket.rotation.y += 0.004

        asteroids.forEach((a: any) => {
          const u = a.userData
          a.position.y = u.base[1] + Math.sin(t * u.speed + u.phase) * 0.35
          a.rotation.x = Math.sin(t * u.speed * 0.7 + u.phase) * 0.7
          a.rotation.z = Math.cos(t * u.speed * 0.5 + u.phase) * 0.7
          a.rotation.y += 0.01 * u.speed
        })

        comets.forEach((c: any) => {
          const u = c.userData
          u.t += 0.016 * u.speed
          if (u.t < 0) { c.visible = false; return }
          if (u.t > 1.45) { u.t = -rand(1, 4); c.visible = false; return }
          c.visible = true
          const tt = Math.min(u.t, 1)
          c.position.lerpVectors(u.start, u.end, tt)
          let fade = tt < 0.12 ? tt / 0.12 : tt > 0.82 ? (1 - tt) / 0.18 : 1
          fade = Math.max(fade, 0)
          c.children.forEach((mesh: any, idx: number) => {
            mesh.material.opacity = (idx === 0 ? 1 : mesh.userData.baseOpacity) * fade
          })
        })

        screenGroup.rotation.y = SCREEN_BASE_ROT_Y + Math.sin(t * 0.4) * 0.04
        screenGroup.rotation.x = SCREEN_BASE_ROT_X + Math.cos(t * 0.3) * 0.02
        screenGroup.position.y = -0.9 + Math.sin(t * 0.5) * 0.07
        statusLights.forEach((sl: any, i: number) => {
          const blink = 0.5 + Math.sin(t * 4 + i * 2.1) * 0.5
          sl.material.opacity = 0.3 + blink * 0.7
        })

        if (screenMesh) {
          if (t < glitchUntil) {
            screenMesh.position.x = (Math.random() - 0.5) * 0.12
          } else {
            screenMesh.position.x = 0
          }
        }

        renderer.render(scene, camera)
      }
      animate()

      sceneObjRef.current = {
        paintScreen,
        triggerGlitch: () => { glitchUntil = t + 0.35 },
      }

      ;(hero as any)._cleanup = () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', fitCamera)
        renderer.dispose()
      }
      } catch (err) {
        console.error('[SpaceHero] scene init error', err)
      }
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      const cleanup = (heroRef.current as any)?._cleanup
      if (cleanup) cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const post = highlights[index]
    if (post) sceneObjRef.current?.paintScreen(post)
  }, [index, highlights])

  useEffect(() => {
    if (highlights.length <= 1) return
    const id = setInterval(() => {
      sceneObjRef.current?.triggerGlitch()
      window.setTimeout(() => setIndex((p) => (p + 1) % highlights.length), 150)
    }, 4600)
    return () => clearInterval(id)
  }, [highlights.length])

  const goTo = (next: number) => {
    sceneObjRef.current?.triggerGlitch()
    window.setTimeout(() => setIndex(next), 150)
  }

  const current = highlights[index]

  return (
    <div ref={heroRef} className="sp-hero">
      <canvas ref={canvasRef} className="sp-canvas" />
      <div ref={starFieldRef} className="sp-star-field" aria-hidden />

      <svg className="sp-constellation" viewBox="0 0 190 150" aria-hidden>
        <title>Virgo</title>
        <g stroke="rgba(245,243,255,.55)" strokeWidth="1.1" fill="none">
          <line x1="38" y1="15" x2="86" y2="38" />
          <line x1="86" y1="38" x2="124" y2="23" />
          <line x1="86" y1="38" x2="19" y2="68" />
          <line x1="86" y1="38" x2="104" y2="83" />
          <line x1="104" y1="83" x2="143" y2="128" />
        </g>
        <g fill="#fff">
          <circle cx="38" cy="15" r="1.8" />
          <circle cx="124" cy="23" r="1.8" />
          <circle cx="86" cy="38" r="2.1" />
          <circle cx="19" cy="68" r="1.8" />
          <circle cx="104" cy="83" r="2.1" />
          <circle cx="143" cy="128" r="3" />
        </g>
      </svg>

      {/* Code / Design nav tabs — top right of hero */}
      <div className="sp-hero-nav">
        <Link href="/code" className="sp-hero-nav-link">Code</Link>
        <Link href="/design" className="sp-hero-nav-link sp-hero-nav-link-design">Design</Link>
      </div>

      <div className="sp-hero-text">
        <div className="sp-phase-track">
          <div className="sp-phase sp-phase-active">
            <div className="sp-phase-lit" style={{ clipPath: PHASE_CLIPS[phase] }} />
          </div>
          <span className="sp-phase-label">welcome aboard</span>
        </div>
        <p className="sp-eyebrow">— MISSION CONTROL —</p>
        <h1 className="sp-title">Hi, I&apos;m Christian</h1>
        <p className="sp-sub">CS × Design &nbsp;·&nbsp; University of Pennsylvania</p>
        <p className="sp-bio">
          Junior at Penn studying CS with a minor in Design. I build things at the
          intersection of software and interactive experience — UE5 games, mobile apps,
          and on-device ML. I&apos;ve researched light-responsive soft robotics at the
          National University of Singapore, placed 3rd internationally in the AMA
          product design competition, and care a lot about how things feel to use.
        </p>
      </div>

      {current && (
        <Link
          href={`/blog/${current.slug}`}
          className="sp-screen-hit"
          style={{ left: `${screenPos.left}%`, top: `${screenPos.top}%` }}
          aria-label={`Open ${current.metadata.title}`}
        />
      )}
      <p className="sp-model-credit">
        TV model by{' '}
        <a href="https://poly.pizza/m/7-dgp0L8elg" target="_blank" rel="noopener noreferrer">
          Jeff Larson
        </a>
        {' '}[CC-BY] via Poly Pizza
      </p>
    </div>
  )
}
