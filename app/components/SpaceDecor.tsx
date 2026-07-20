'use client'

import { useEffect, useRef } from 'react'
import { loadThree } from 'app/lib/loadThree'

/**
 * Light-weight decorative 3D layer for interior pages — reuses the hero's low-poly assets
 * (moon, planets, asteroids) plus one STATIC TV (fixed color-bars screen), tucked into the
 * left/right side gutters. Fixed & full-viewport, sits above the starfield backdrop and
 * behind the article panel. Kept sparse so it frames the content without distracting.
 * (CSS hides it below the wide breakpoint, where there are no side gutters.)
 */
export default function SpaceDecor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let raf = 0
    let disposed = false

    loadThree().then((THREE: any) => {
      if (disposed || !THREE) return
      const canvas = canvasRef.current
      if (!canvas) return

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio, 2), 2.5))
      if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)

      scene.add(new THREE.HemisphereLight(0xc9bbff, 0x151033, 0.9))
      const dir = new THREE.DirectionalLight(0xf3ede1, 0.8)
      dir.position.set(5, 8, 10)
      scene.add(dir)
      const rim = new THREE.PointLight(0x6fb4ff, 0.9, 40)
      rim.position.set(-9, -2, 8)
      scene.add(rim)

      const mat = (c: number) =>
        new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8, metalness: 0.05 })

      const group = new THREE.Group()
      scene.add(group)
      const floats: any[] = []

      // Moon — lower-left gutter
      const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 2), mat(0xe1dcef))
      moon.position.set(-8.9, -3, -2)
      group.add(moon)
      floats.push({ o: moon, y: -3, sp: 0.4, ph: 0, spin: 0.001 })

      const rand = (a: number, b: number) => a + Math.random() * (b - a)
      function planet(x: number, y: number, z: number, r: number, c: number, ringColor?: number) {
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(c))
        p.position.set(x, y, z)
        if (ringColor) {
          const rg = new THREE.Mesh(new THREE.TorusGeometry(r * 1.7, r * 0.09, 8, 32), mat(ringColor))
          rg.rotation.x = Math.PI / 2.4
          rg.rotation.z = 0.2
          p.add(rg)
        }
        group.add(p)
        floats.push({ o: p, y, sp: rand(0.35, 0.6), ph: rand(0, 6), spin: 0.003 })
      }
      planet(9.0, 2.9, -3, 0.85, 0xb39bff, 0x6fb4ff) // ringed purple, upper-right
      planet(-9.2, 2.6, -3.5, 0.5, 0x5fe3d3)         // teal, upper-left

      const acol = [0x6fb4ff, 0xb39bff, 0xfdf6ec, 0xffb05c, 0xff6fd8, 0x5fe3d3]
      ;([
        [-7.6, 0.4, -1, 0.28, 3],
        [8.0, -0.6, -2, 0.24, 1],
        [-8.4, -1.6, -0.5, 0.2, 5],
        [7.7, 1.4, -1.5, 0.22, 0],
      ] as [number, number, number, number, number][]).forEach(([x, y, z, s, ci]) => {
        const a = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat(acol[ci]))
        a.position.set(x, y, z)
        group.add(a)
        floats.push({ o: a, y, sp: rand(0.4, 0.8), ph: rand(0, 6), spin: 0.008, tumble: true })
      })

      // Static TV (lower-right gutter) — fixed color-bars screen, no cycling
      function buildStaticTV() {
        const g = new THREE.Group()
        const W = 4, H = 3, D = 2.6, FZ = D / 2
        g.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mat(0x565f92)))
        const back = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, H * 0.6, 1), mat(0x474e77))
        back.position.z = -(D / 2 + 0.5)
        g.add(back)
        const SCRW = 2.8, SCRH = 1.8
        const bez = new THREE.MeshStandardMaterial({ color: 0x14162b, flatShading: true, roughness: 0.9 })
        ;[1, -1].forEach((sy) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(SCRW + 0.32, 0.16, 0.24), bez)
          b.position.set(0, 0.28 + sy * (SCRH / 2 + 0.08), FZ + 0.07)
          g.add(b)
        })
        ;[1, -1].forEach((sx) => {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, SCRH, 0.24), bez)
          b.position.set(sx * (SCRW / 2 + 0.08), 0.28, FZ + 0.07)
          g.add(b)
        })
        const cv = document.createElement('canvas')
        cv.width = 512; cv.height = 320
        const ctx = cv.getContext('2d')!
        const bars = ['#fdf6ec', '#ffb05c', '#ff6fd8', '#b39bff', '#6fb4ff', '#5fe3d3']
        const bw = 512 / bars.length
        bars.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw) + 1, 236) })
        ctx.fillStyle = '#0c0922'; ctx.fillRect(0, 236, 512, 84)
        const tex = new THREE.CanvasTexture(cv)
        if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(SCRW, SCRH), new THREE.MeshBasicMaterial({ map: tex }))
        scr.position.set(0, 0.28, FZ + 0.03)
        g.add(scr)
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x6a72a8))
        dome.position.set(0, H / 2, -0.25)
        g.add(dome)
        ;[1, -1].forEach((s) => {
          const ag = new THREE.Group()
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), mat(0x9aa2d0))
          rod.position.y = 0.75; ag.add(rod)
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(0xfdf6ec))
          tip.position.y = 1.5; ag.add(tip)
          ag.position.set(0, H / 2 + 0.22, -0.25); ag.rotation.z = s * 0.38; ag.rotation.x = -0.12
          g.add(ag)
        })
        return g
      }
      const tv = buildStaticTV()
      tv.scale.setScalar(0.62)
      tv.position.set(8.6, -2.4, -1)
      tv.rotation.set(0.05, -0.5, 0.04)
      group.add(tv)
      floats.push({ o: tv, y: -2.4, sp: 0.32, ph: 2, spin: 0 })

      function fit() {
        const w = window.innerWidth
        const h = window.innerHeight
        renderer.setSize(w, h)
        camera.aspect = w / h
        const vFov = (camera.fov * Math.PI) / 180
        // Fit by WIDTH only → objects keep a consistent horizontal (gutter) placement at any
        // aspect, so they always sit outside the centered text column and never overlap it.
        const distH = 9 / (Math.tan(vFov / 2) * Math.max(camera.aspect, 0.55))
        camera.position.set(0, 0, distH * 1.05)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
      }
      fit()
      window.addEventListener('resize', fit)

      let t = 0
      function animate() {
        raf = requestAnimationFrame(animate)
        t += 0.01
        floats.forEach((f: any) => {
          f.o.position.y = f.y + Math.sin(t * f.sp + f.ph) * 0.14
          if (f.tumble) {
            f.o.rotation.x += f.spin * 0.7
            f.o.rotation.z += f.spin * 0.5
          }
          if (f.spin) f.o.rotation.y += f.spin
        })
        renderer.render(scene, camera)
      }
      animate()

      ;(canvas as any)._cleanup = () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('resize', fit)
        renderer.dispose()
      }
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      const c = canvasRef.current as any
      if (c?._cleanup) c._cleanup()
    }
  }, [])

  return <canvas ref={canvasRef} className="sp-decor-canvas" aria-hidden />
}
