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
  const sceneObjRef = useRef<any>(null)
  const highlightsRef = useRef(highlights)
  highlightsRef.current = highlights

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASE_CLIPS.length), 4000)
    return () => clearInterval(id)
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
      // Supersample: render at >=2x device pixels and let the GPU downsample. On normal
      // (dpr 1) monitors this is the single biggest text-sharpness win — the whole
      // framebuffer (and thus the screen textures) gets ~4x the samples.
      renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 2), 2.5))
      if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)

      scene.add(new THREE.HemisphereLight(0xc9bbff, 0x151033, 0.9))
      // Softer, slightly warm off-white key light — less glare on the moon/rocket whites
      const dir = new THREE.DirectionalLight(0xf3ede1, 0.8)
      dir.position.set(5, 8, 10)
      scene.add(dir)
      const rim = new THREE.PointLight(0x6fb4ff, 0.95, 40)
      rim.position.set(-9, -2, 8)
      scene.add(rim)

      function lowPolyMat(color: number) {
        return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0.05 })
      }

      const group = new THREE.Group()
      scene.add(group)

      // Registry of scattered objects for the responsive relayout(): each records its
      // wide-screen "home", an approx radius (half), how to set its bob base-Y, and a
      // cur/target pair that the animate loop eases between (so resizes glide, not teleport).
      type Floater = { obj: any; homeX: number; homeY: number; z: number; half: number; setY: (y: number) => void; curX: number; curY: number; targetX: number; targetY: number }
      const floaters: Floater[] = []
      const addFloater = (obj: any, homeX: number, homeY: number, z: number, half: number, setY: (y: number) => void) =>
        floaters.push({ obj, homeX, homeY, z, half, setY, curX: homeX, curY: homeY, targetX: homeX, targetY: homeY })
      let camDist = 0          // camera distance, set by fitCamera; used to map NDC → world
      let camCenterY = CONTENT_CENTER_Y  // camera vertical target (raised in stacked mode)
      let stackedMode = false  // super-narrow: drop the whole design below the text
      let floatersSnap = true  // first layout snaps into place; later resizes ease

      // ---- Moon — plain low-poly sphere (lower-left, below the bio) ----
      let moonBaseY = -3.0
      const moon = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.4, 2),
        new THREE.MeshStandardMaterial({ color: 0xe1dcef, flatShading: true, roughness: 0.96, metalness: 0.0 })
      )
      moon.position.set(-3.9, moonBaseY, -2.2)   // nudged away from the rocket
      moon.rotation.set(0.2, 0.5, 0)
      group.add(moon)
      addFloater(moon, -3.9, -3.0, -2.2, 1.4, (y) => { moonBaseY = y })

      // ---- Planets — assorted sizes / colors scattered around the scene ----
      // Placement rule: the upper-left is the bio's reading zone, so every planet lives to
      // the right of center or low enough to sit below the bio.
      const rand = (a: number, b: number) => a + Math.random() * (b - a)
      const planets: any[] = []
      function makePlanet(
        x: number, y: number, z: number, r: number, color: number,
        opts: { ring?: boolean; ringColor?: number; ringTilt?: number; detail?: number } = {}
      ) {
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(r, opts.detail ?? 1), lowPolyMat(color))
        p.position.set(x, y, z)
        if (opts.ring) {
          const rg = new THREE.Mesh(new THREE.TorusGeometry(r * 1.7, r * 0.09, 8, 36), lowPolyMat(opts.ringColor ?? 0x6fb4ff))
          rg.rotation.x = Math.PI / 2.4
          rg.rotation.z = opts.ringTilt ?? 0
          p.add(rg)
        }
        p.userData = { baseY: y, speed: 0.4 + rand(0, 0.5), phase: rand(0, Math.PI * 2), amp: 0.12 + rand(0, 0.1) }
        group.add(p)
        planets.push(p)
        addFloater(p, x, y, z, r, (v) => { p.userData.baseY = v })
        return p
      }
      makePlanet( 0.6,  4.0, -4.2, 0.90, 0xb39bff, { ring: true, ringColor: 0x6fb4ff, ringTilt: 0.2 })   // ringed purple, upper-center
      makePlanet( 8.9,  0.6, -3.5, 0.60, 0x6fb4ff)                                                        // blue, far right
      makePlanet(-7.6, -3.2, -2.5, 0.68, 0xffb05c)                                                        // warm, lower-left
      makePlanet( 0.4, -3.9, -1.5, 0.62, 0x5fe3d3, { ring: true, ringColor: 0xfdf6ec, ringTilt: -0.3 })  // teal ringed, lower-center
      makePlanet( 6.0, -3.8, -1.2, 0.50, 0xff6fd8)                                                        // pink, lower-right
      makePlanet( 2.4,  3.4, -4.5, 0.45, 0x6fb4ff)                                                        // small blue, upper-center

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
      // Lower-left, near the moon, out in open space so it's fully visible.
      let rocketBaseY = -2.4
      rocket.position.set(-6.6, rocketBaseY, 0.6)
      rocket.rotation.z = 0.12
      group.add(rocket)
      addFloater(rocket, -6.6, -2.4, 0.6, 1.7, (y) => { rocketBaseY = y })


      // ---- Asteroids — distributed, varying sizes; kept out of the upper-left bio zone ----
      const asteroidColors = [0x6fb4ff, 0xb39bff, 0xfdf6ec, 0xffb05c, 0xff6fd8, 0x5fe3d3]
      // Spread across the whole frame — filling the bottom + far sides — with the upper-left
      // bio zone left empty. Left-side pieces (x < -1) stay low (y < -1.4) to clear the bio.
      const asteroidSpecs: [number, number, number, number, number][] = [
        [-8.6, -3.9, -1.0, 0.30, 0],   // lower-left
        [-2.8, -3.9,  0.5, 0.34, 4],   // lower-center-left
        [ 2.8, -4.2, -0.5, 0.40, 1],   // lower-center
        [ 8.9,  2.0, -2.5, 0.28, 2],   // far right, mid
        [-8.9, -1.6, -1.0, 0.22, 5],   // far-left, below bio
        [ 0.6,  4.7, -2.5, 0.26, 0],   // upper-center
        [ 1.8,  2.6, -3.0, 0.18, 3],   // peeks behind the TV — kept for depth
        [ 3.2,  4.6, -2.0, 0.30, 2],   // upper, above TV
        [ 7.8,  4.3, -2.5, 0.22, 1],   // far upper-right
        [ 6.7, -2.4, -0.8, 0.20, 5],   // right of the TV
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
        addFloater(m, x, y, z, size, (v) => { m.userData.base[1] = v })
      })

      // ---- Shooting stars ----
      function makeComet(start: any, end: any, speed: number, delay: number) {
        const g = new THREE.Group()
        const dirVec = new THREE.Vector3().subVectors(start, end).normalize()
        const head3 = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xf1ecfa, transparent: true })
        )
        g.add(head3)
        ;[0.22, 0.42, 0.65, 0.95, 1.3].forEach((dist, idx) => {
          const s = new THREE.Mesh(
            new THREE.SphereGeometry(Math.max(0.05 - idx * 0.008, 0.018), 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xf1ecfa, transparent: true })
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
        // Start center/right so the descending streaks don't cross the upper-left bio.
        const cs = new THREE.Vector3(rand(-1, 8), rand(4, 7), rand(-6, 4))
        const ce = new THREE.Vector3(cs.x + rand(-5.5, -2.5), cs.y + rand(-6, -3.5), cs.z + rand(-2, 2))
        comets.push(makeComet(cs, ce, rand(0.45, 0.85), rand(0, 7)))
      }

      // ---- Highlight console — a stacked pair of hand-built low-poly TVs ----
      // Built from primitives (no external model → no attribution). The big TV shows the
      // project image; a smaller TV stacked on top-right shows a "Check out my projects!"
      // label with the current title. Antennas live on the small (top) TV.
      function buildTV(opts: { antennas?: boolean; sideControls?: boolean; bodyH?: number; screenCY?: number; screenCX?: number; unit?: number }) {
        const antennas = opts.antennas ?? false
        const sideControls = opts.sideControls ?? false
        const unit = opts.unit ?? 1          // native build size — no external down-scaling
        const g = new THREE.Group()
        const BODY_W = 4.0, BODY_H = opts.bodyH ?? 3.0, BODY_D = 2.6   // deeper cabinet → reads thick
        const FRONT_Z = BODY_D / 2
        const SCR_W = 2.8, SCR_H = 1.8
        const SCR_CX = opts.screenCX ?? 0, SCR_CY = opts.screenCY ?? 0.28
        const BEZEL_T = 0.16, BEZEL_D = 0.24

        // Cabinet + a tapered CRT-style back (two stepped boxes) so it looks like a tube TV
        g.add(new THREE.Mesh(new THREE.BoxGeometry(BODY_W, BODY_H, BODY_D), lowPolyMat(0x565f92)))
        const backMat = lowPolyMat(0x474e77)
        const rearA = new THREE.Mesh(new THREE.BoxGeometry(BODY_W * 0.78, BODY_H * 0.78, 0.7), backMat)
        rearA.position.z = -(BODY_D / 2 + 0.34)
        g.add(rearA)
        const rearB = new THREE.Mesh(new THREE.BoxGeometry(BODY_W * 0.5, BODY_H * 0.5, 0.7), backMat)
        rearB.position.z = -(BODY_D / 2 + 1.02)
        g.add(rearB)

        // Bezel frame — four dark bars standing proud so the screen reads as inset
        const bezelMat = new THREE.MeshStandardMaterial({ color: 0x14162b, flatShading: true, roughness: 0.9, metalness: 0.0 })
        const BEZEL_Z = FRONT_Z + 0.07
        ;[1, -1].forEach((sy) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(SCR_W + BEZEL_T * 2, BEZEL_T, BEZEL_D), bezelMat)
          bar.position.set(SCR_CX, SCR_CY + sy * (SCR_H / 2 + BEZEL_T / 2), BEZEL_Z)
          g.add(bar)
        })
        ;[1, -1].forEach((sx) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(BEZEL_T, SCR_H, BEZEL_D), bezelMat)
          bar.position.set(SCR_CX + sx * (SCR_W / 2 + BEZEL_T / 2), SCR_CY, BEZEL_Z)
          g.add(bar)
        })

        // Inset screen (in front of the cabinet face, behind the bezel front)
        const screenMat = new THREE.MeshBasicMaterial({ side: THREE.FrontSide })
        const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_H), screenMat)
        screenMesh.position.set(SCR_CX, SCR_CY, FRONT_Z + 0.03)
        g.add(screenMesh)

        // --- Controls: big TV = bottom strip; top TV = right-side column (distinct look) ---
        const PANEL_Y = -BODY_H / 2 + 0.45
        const PANEL_Z = FRONT_Z + 0.05
        const grilleMat = lowPolyMat(0x3b426b)
        const dialBaseMat = lowPolyMat(0x2a2e4d)
        const faceMat = lowPolyMat(0xfdf6ec)
        const btnCols = [0x6fb4ff, 0x5fe3d3, 0xff6fd8]
        const statusLights: any[] = []
        const addDial = (x: number, y: number) => {
          const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 18), dialBaseMat)
          base.rotation.x = Math.PI / 2; base.position.set(x, y, PANEL_Z); g.add(base)
          const face = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 18), faceMat)
          face.rotation.x = Math.PI / 2; face.position.set(x, y, PANEL_Z + 0.03); g.add(face)
          const notch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), dialBaseMat)
          notch.position.set(x, y + 0.05, PANEL_Z + 0.075); g.add(notch)
        }
        const addBtn = (col: number, x: number, y: number) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.09), lowPolyMat(col))
          b.position.set(x, y, PANEL_Z); g.add(b)
        }
        const addLED = (col: number, x: number, y: number) => {
          const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true }))
          led.position.set(x, y, PANEL_Z + 0.01); g.add(led); statusLights.push(led)
        }
        if (sideControls) {
          // Right-side vertical column, tucked to the far edge — evenly spaced, no grille
          const cx = BODY_W / 2 - 0.28
          addDial(cx, 0.62); addDial(cx, 0.30)
          addBtn(btnCols[0], cx, -0.08); addBtn(btnCols[1], cx, -0.36); addBtn(btnCols[2], cx, -0.64)
          addLED(0x6fb4ff, cx - 0.11, -0.92); addLED(0x5fe3d3, cx + 0.11, -0.92)
        } else {
          // Bottom strip: speaker grille (left) · buttons + LEDs (center) · dials (right)
          for (let i = 0; i < 5; i++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.055, 0.05), grilleMat)
            slat.position.set(-1.12, PANEL_Y + 0.22 - i * 0.12, PANEL_Z); g.add(slat)
          }
          btnCols.forEach((col, i) => addBtn(col, -0.22 + i * 0.28, PANEL_Y - 0.06))
          addLED(0x6fb4ff, -0.14, PANEL_Y + 0.28); addLED(0x5fe3d3, 0.08, PANEL_Y + 0.28)
          addDial(0.82, PANEL_Y); addDial(1.4, PANEL_Y)
        }

        // Dome + two straight antenna rods (only on the TV that wants them)
        if (antennas) {
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2),
            lowPolyMat(0x6a72a8)
          )
          dome.position.set(0, BODY_H / 2, -0.25)
          g.add(dome)
          const ANT_LEN = 1.6
          ;[1, -1].forEach((sign) => {
            const ag = new THREE.Group()
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, ANT_LEN, 6), lowPolyMat(0x9aa2d0))
            rod.position.y = ANT_LEN / 2
            ag.add(rod)
            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), lowPolyMat(0xfdf6ec))
            tip.position.y = ANT_LEN
            ag.add(tip)
            ag.position.set(0, BODY_H / 2 + 0.22, -0.25)
            ag.rotation.z = sign * 0.38
            ag.rotation.x = -0.12
            g.add(ag)
          })
        }

        const consoleLight = new THREE.PointLight(0x6fb4ff, 0.55, 9)
        consoleLight.position.set(SCR_CX, SCR_CY, FRONT_Z + 0.8)
        g.add(consoleLight)

        g.scale.setScalar(unit)              // set this body's native size
        return { group: g, screenMat, screenMesh, consoleLight, statusLights }
      }

      // Two independent bodies at DIFFERENT native sizes (nothing scaled down):
      //   big TV  — unit 1.2, canvas 1024  →  screen 3.36w, density 305 px/world
      //   top TV  — unit 0.9, canvas 768   →  screen 2.52w, density 305 px/world  (matched → equally crisp)
      const bigTV = buildTV({ unit: 1.2 })
      const smallTV = buildTV({ antennas: true, sideControls: true, bodyH: 2.4, screenCY: 0, screenCX: -0.18, unit: 0.9 })
      // Top body rests above the big one with a small gap so independent bob never clips;
      // fronts co-planar, offset right. big top 1.5·1.2=1.8; small half-height 1.2·0.9=1.08;
      // gap 0.3 → Y 3.18. front match z = 1.3·1.2 − 1.3·0.9 = 0.39.
      const SMALL_BASE_Y = 3.18
      smallTV.group.position.set(1.1, SMALL_BASE_Y, 0.39)

      // Non-animated root: shared base tilt + position only (NO scale). Each TV floats and
      // rotates independently inside it (loose pair) on its own rhythm.
      const screenGroup = new THREE.Group()
      screenGroup.add(bigTV.group)
      screenGroup.add(smallTV.group)
      const screenMesh = bigTV.screenMesh                          // glitch target (big TV)
      const statusLights = [...bigTV.statusLights, ...smallTV.statusLights]
      screenGroup.rotation.set(0.07, -0.55, 0.05)   // base tilt (x, y, z)
      screenGroup.position.set(4.0, -1.0, -0.5)
      scene.add(screenGroup)

      // ── Screen renderers ────────────────────────────────────────────────────
      // Big TV shows the project IMAGE only. Small TV shows a "Check out my projects!"
      // label with the current project's title. Both update together in paintScreen().
      // To add/remove projects, edit the MDX files in app/blog/posts/ — getBlogPosts()
      // picks them up automatically via the highlights prop.
      const SCREEN_W = 1024
      const SCREEN_H = 640
      const maxAniso = renderer.capabilities.getMaxAnisotropy()   // crisp text at the TV's angle

      function applyCanvas(mat: any, c: HTMLCanvasElement) {
        const tex = new THREE.CanvasTexture(c)
        if ('encoding' in tex) (tex as any).encoding = THREE.sRGBEncoding
        // No mipmaps + linear = sharp text (mipmap trilinear was softening it); aniso keeps
        // the base level crisp at the TV's angle.
        tex.generateMipmaps = false
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.anisotropy = maxAniso
        const old = mat.map
        mat.map = tex
        mat.needsUpdate = true
        if (old) old.dispose()
      }

      // Big screen: the project image (cover-fit). No image → an on-brand test card
      // (palette color bars) with a call to action, since the screen is clickable.
      function drawBigScreen(img: HTMLImageElement | null): HTMLCanvasElement {
        const c = document.createElement('canvas')
        c.width = SCREEN_W; c.height = SCREEN_H
        const ctx = c.getContext('2d')!
        if (img) {
          const s = Math.max(SCREEN_W / img.width, SCREEN_H / img.height)
          ctx.drawImage(img, (SCREEN_W - img.width * s) / 2, (SCREEN_H - img.height * s) / 2, img.width * s, img.height * s)
        } else {
          const bars = ['#fdf6ec', '#ffb05c', '#ff6fd8', '#b39bff', '#6fb4ff', '#5fe3d3']
          const barH = Math.round(SCREEN_H * 0.72)
          const bw = SCREEN_W / bars.length
          bars.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw) + 1, barH) })
          ctx.fillStyle = '#0c0922'; ctx.fillRect(0, barH, SCREEN_W, SCREEN_H - barH)
          ctx.fillStyle = '#f5f3ff'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center'
          ctx.fillText('▸ CLICK TO VIEW', SCREEN_W / 2, barH + (SCREEN_H - barH) / 2 + 17)
          ctx.textAlign = 'left'
        }
        return c
      }

      // Small screen: a CRT channel readout. The title AUTO-FITS to the largest size that
      // fills ≤3 lines, so it stays big regardless of the TV's physical scale.
      function wrapAt(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
        const lines: string[] = []
        let line = ''
        for (const w of text.split(' ')) {
          const test = line + (line ? ' ' : '') + w
          if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w }
          else line = test
        }
        if (line) lines.push(line)
        return lines
      }
      function drawSmallScreen(post: Post): HTMLCanvasElement {
        const cat = post.metadata.category
        const hex = ACCENT_HEX[cat] ?? 0x6fb4ff
        const accent = '#' + hex.toString(16).padStart(6, '0')
        // 768×480 = 0.75× the big screen → same texel density → same crispness (no aliasing).
        const W = 768, H = 480, PAD = 42
        const c = document.createElement('canvas')
        c.width = W; c.height = H
        const ctx = c.getContext('2d')!
        const bg = ctx.createLinearGradient(0, 0, 0, H)
        bg.addColorStop(0, '#191542'); bg.addColorStop(1, '#0c0922')
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 12)            // channel bar
        // Heading banner
        ctx.font = 'bold 44px monospace'; ctx.fillStyle = '#f5f3ff'
        ctx.fillText('CHECK OUT MY PROJECTS!', PAD, 92)
        ctx.strokeStyle = accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(PAD, 120); ctx.lineTo(W - PAD, 120); ctx.stroke(); ctx.globalAlpha = 1
        // Broadcast label
        ctx.font = 'bold 33px monospace'; ctx.fillStyle = accent
        ctx.fillText('▸ NOW SHOWING · ' + cat.toUpperCase(), PAD, 174)
        // Title — big, auto-fit to the largest size that fits ≤3 lines AND the height box
        const maxW = W - PAD * 2
        const areaTop = 202, areaBot = H - 26
        const areaH = areaBot - areaTop
        let titleSize = 100
        const fit = () => { ctx.font = `bold ${titleSize}px system-ui, sans-serif`; return wrapAt(ctx, post.metadata.title, maxW) }
        let lines = fit()
        while ((lines.length > 3 || lines.length * titleSize * 1.14 > areaH) && titleSize > 52) {
          titleSize -= 6; lines = fit()
        }
        const lh = Math.round(titleSize * 1.14)
        let ty = areaTop + (areaH - lines.length * lh) / 2 + titleSize * 0.82
        ctx.fillStyle = '#f5f3ff'; ctx.font = `bold ${titleSize}px system-ui, sans-serif`
        for (const ln of lines) { ctx.fillText(ln, PAD, ty); ty += lh }
        return c
      }

      function paintScreen(post: Post) {
        const hex = ACCENT_HEX[post.metadata.category] ?? 0x6fb4ff
        bigTV.consoleLight.color.setHex(hex)
        smallTV.consoleLight.color.setHex(hex)
        applyCanvas(smallTV.screenMat, drawSmallScreen(post))
        if (post.metadata.image) {
          const img = new Image()
          img.onload  = () => applyCanvas(bigTV.screenMat, drawBigScreen(img))
          img.onerror = () => applyCanvas(bigTV.screenMat, drawBigScreen(null))
          img.src = post.metadata.image
        } else {
          applyCanvas(bigTV.screenMat, drawBigScreen(null))
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
        const tanHalf = Math.tan(vFov / 2)
        // Super-narrow (portrait-ish) → stacked layout: zoom out a touch and drop the whole
        // composition into the lower part of the screen, leaving the top for the text.
        stackedMode = camera.aspect < 0.9
        const halfH = stackedMode ? CONTENT_HALF_HEIGHT * 1.35 : CONTENT_HALF_HEIGHT
        const distV = halfH / tanHalf
        const effAspect = Math.max(camera.aspect, 0.55)
        const distH = CONTENT_HALF_WIDTH / (tanHalf * effAspect)
        const dist = Math.max(distV, distH) * 1.08
        camDist = dist
        camCenterY = stackedMode ? CONTENT_CENTER_Y + tanHalf * dist * 0.5 : CONTENT_CENTER_Y
        camera.position.set(0, camCenterY, dist)
        camera.lookAt(0, camCenterY, 0)
        camera.updateProjectionMatrix()

        // Stacked mode → center the TV column; wide mode → keep it on the right.
        screenGroup.position.x = stackedMode ? 0 : 4.0

        const v = screenGroup.position.clone().project(camera)
        setScreenPos({
          left: ((v.x + 1) / 2) * 100,
          top: ((1 - v.y) / 2) * 100,
        })
        relayout()
      }

      // Responsive relayout: measure the bio text block (the .sp-hero-text DOM element) in
      // NDC and push any floater whose home projects inside it out of the way — to the right
      // of the text or below it, whichever is the smaller move. Runs on every resize, so
      // objects never sit under the copy on narrow/short viewports, and return home when wide.
      const _rc = new THREE.Vector3(), _rt = new THREE.Vector3()
      function relayout() {
        if (!camDist) return
        // Stacked mode: re-order into a vertical, centered column — pull every object toward
        // the center axis so nothing clips the narrow sides (the centered TVs render on top,
        // so anything behind them is hidden cleanly). Keeps their vertical spread.
        if (stackedMode) {
          for (const f of floaters) { f.targetX = f.homeX * 0.45; f.targetY = f.homeY }
          if (floatersSnap) { for (const f of floaters) { f.curX = f.targetX; f.curY = f.targetY }; floatersSnap = false }
          return
        }
        const bioEl = hero!.querySelector('.sp-hero-text') as HTMLElement | null
        if (!bioEl) return
        const hbb = hero!.getBoundingClientRect()
        const bbb = bioEl.getBoundingClientRect()
        const W = hbb.width, H = hbb.height
        if (!W || !H) return
        const m = 0.06
        const rectL = 2 * ((bbb.left - hbb.left) / W) - 1 - m
        const rectR = 2 * ((bbb.right - hbb.left) / W) - 1 + m
        const rectT = 1 - 2 * ((bbb.top - hbb.top) / H) + m
        const rectB = 1 - 2 * ((bbb.bottom - hbb.top) / H) - m
        const tanH = Math.tan((camera.fov * Math.PI) / 180 / 2)
        const worldX = (ndc: number, z: number) => ndc * tanH * camera.aspect * (camDist - z)
        const worldY = (ndc: number, z: number) => camCenterY + ndc * tanH * (camDist - z)
        const inRect = (px: number, py: number) => px > rectL && px < rectR && py < rectT && py > rectB
        for (const f of floaters) {
          _rc.set(f.homeX, f.homeY, f.z).project(camera)
          _rt.set(f.homeX, f.homeY + f.half, f.z).project(camera)   // top point catches tall objects
          if (!(inRect(_rc.x, _rc.y) || inRect(_rt.x, _rt.y))) {
            f.targetX = f.homeX; f.targetY = f.homeY; continue
          }
          const rightX = worldX(rectR, f.z) + f.half            // left edge past the text's right edge
          const rightFits = rightX + f.half < worldX(0.95, f.z)
          const downY = worldY(rectB, f.z) - f.half             // top past the text's bottom edge
          const downFits = downY - f.half > worldY(-0.95, f.z)
          const dRight = Math.abs(rightX - f.homeX)
          const dDown = Math.abs(downY - f.homeY)
          if (rightFits && (!downFits || dRight <= dDown)) {
            f.targetX = rightX; f.targetY = f.homeY
          } else if (downFits) {
            f.targetX = f.homeX; f.targetY = downY
          } else {
            f.targetX = worldX(0.9, f.z); f.targetY = f.homeY   // tiny viewport: best-effort shove right
          }
        }
        if (floatersSnap) {   // first layout: appear in place (no fly-in); later resizes ease
          for (const f of floaters) { f.curX = f.targetX; f.curY = f.targetY }
          floatersSnap = false
        }
      }
      fitCamera()
      window.addEventListener('resize', fitCamera)

      let t = 0
      let glitchUntil = 0
      function animate() {
        raf = requestAnimationFrame(animate)
        t += 0.012

        // Ease every floater toward its responsive target so resizes glide (no teleport).
        // This drives each object's X and bob base-Y; the per-type blocks below add the bob.
        for (const f of floaters) {
          f.curX += (f.targetX - f.curX) * 0.09
          f.curY += (f.targetY - f.curY) * 0.09
          f.obj.position.x = f.curX
          f.setY(f.curY)
        }

        moon.rotation.y += 0.001
        moon.position.y = moonBaseY + Math.sin(t * 0.45) * 0.12
        planets.forEach((p: any) => {
          const u = p.userData
          p.position.y = u.baseY + Math.sin(t * u.speed + u.phase) * u.amp
          p.rotation.y += 0.003 * (0.6 + u.speed)
        })
        rocket.position.y = rocketBaseY + Math.sin(t * 0.9 + 2) * 0.18
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

        // Two separate bodies — each bobs & sways on its own rhythm (loose floating pair)
        bigTV.group.position.y = Math.sin(t * 0.5) * 0.13
        bigTV.group.rotation.y = Math.sin(t * 0.4) * 0.05
        bigTV.group.rotation.x = Math.cos(t * 0.32) * 0.03
        smallTV.group.position.y = SMALL_BASE_Y + Math.sin(t * 0.63 + 1.7) * 0.11
        smallTV.group.rotation.y = Math.sin(t * 0.47 + 1.0) * 0.06
        smallTV.group.rotation.x = Math.cos(t * 0.37 + 0.6) * 0.035
        smallTV.group.rotation.z = Math.sin(t * 0.29 + 2.2) * 0.02
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

        // Two-pass render so the TV screens are always the frontmost thing:
        //  pass 1 — everything except the TV stack
        //  pass 2 — clear the depth buffer, then draw only the TV stack on top
        screenGroup.visible = false
        renderer.autoClear = true
        renderer.render(scene, camera)
        screenGroup.visible = true
        renderer.autoClear = false
        renderer.clearDepth()
        group.visible = false
        const cometVis = comets.map((c: any) => c.visible)
        comets.forEach((c: any) => { c.visible = false })
        renderer.render(scene, camera)
        group.visible = true
        comets.forEach((c: any, i: number) => { c.visible = cometVis[i] })
        renderer.autoClear = true
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
        <div className="sp-links">
          <a className="sp-link" href="/resume/Christian%20Kim%20Resume.pdf" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7zm0 2 5 5h-5V4zM8 13h8v1.6H8zm0 3.4h8V18H8z" /></svg>
            Resume
          </a>
          <a className="sp-link" href="https://github.com/chrisk36" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" /></svg>
            GitHub
          </a>
          <a className="sp-link" href="https://www.linkedin.com/in/christiankim36" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v13h-4zM8 8h3.8v1.78h.05c.53-1 1.83-2.05 3.76-2.05 4.02 0 4.76 2.65 4.76 6.09V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21H8z" /></svg>
            LinkedIn
          </a>
          <a className="sp-link" href="mailto:chrisk36@engineering.upenn.edu">
            <svg viewBox="0 0 24 24" aria-hidden><path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm2 .5v.4l8 5 8-5v-.4H4zm16 2.3-7.47 4.67a1 1 0 0 1-1.06 0L4 7.8V19h16V7.8z" /></svg>
            Email
          </a>
        </div>
        <p className="sp-bio">
          Junior at Penn studying CS with a minor in Design. I build things at the
          intersection of software and interactive experience — solo and with teams —
          from UE5 games and mobile apps to on-device ML. I&apos;ve researched
          light-responsive soft robotics at the National University of Singapore, placed
          3rd internationally in the AMA product design competition, and care a lot about
          how things feel to use.
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

      <a href="#projects" className="sp-scroll-cue">
        <span className="sp-scroll-label">Scroll down to see my projects!</span>
        <span className="sp-scroll-arrow" aria-hidden>↓</span>
      </a>
    </div>
  )
}
