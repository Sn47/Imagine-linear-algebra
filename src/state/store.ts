import { create } from 'zustand'
import type { Mat, Vec } from '../math/mat2'
import { LENSES, isLens, type Lens } from './lenses'
import type { Mat3, Vec3 } from '../math/mat3'
export type { Lens }

export type StackItem = { id: string; name: string; m: Mat }
export type VectorObj = { id: string; kind: 'vector'; name: string; v: Vec }
export type ShapeObj = { id: string; kind: 'shape'; name: string; points: Vec[] }
export type SceneObj = VectorObj | ShapeObj

export type Show = { grid: boolean; circle: boolean; square: boolean }

type State = {
  stack: StackItem[]
  objects: SceneObj[]
  lens: Lens
  t: number
  probe: Vec
  probe2: Vec
  show: Show
  drawing: Vec[] | null
  selected: string | null
  options: { normalize: boolean; steps: number; k: number; nonlinear: boolean }
  m3: Mat3
  u3: Vec3
  v3: Vec3
  poly: [number, number, number, number]
  points: Vec[]
  image: { size: number; data: Float64Array } | null
  rank: number
  fourier: { terms: number; wave: 'square' | 'triangle' | 'saw' }
  angles4: number[]
  spin4: boolean
  challenge: Partial<Record<Lens, number>>
  path: Vec[]
  drawingPath: boolean
  circles: number
  fractal: { preset: string; bend: number; showMaps: boolean }
}

type Actions = {
  setLens: (lens: Lens) => void
  setT: (t: number) => void
  tMax: () => number
  setMatrix: (id: string, m: Partial<Mat>) => void
  addMatrix: (m?: Mat, name?: string) => void
  removeMatrix: (id: string) => void
  moveMatrix: (id: string, dir: -1 | 1) => void
  replaceStack: (stack: Mat[]) => void
  setProbe: (v: Vec) => void
  setProbe2: (v: Vec) => void
  addVector: (v?: Vec) => void
  setVector: (id: string, v: Vec) => void
  setShapePoint: (id: string, i: number, p: Vec) => void
  removeObject: (id: string) => void
  renameObject: (id: string, name: string) => void
  startDrawing: () => void
  addDrawingPoint: (p: Vec) => void
  finishDrawing: () => void
  cancelDrawing: () => void
  toggle: (k: keyof Show) => void
  select: (id: string | null) => void
  setOption: <K extends keyof State['options']>(k: K, v: State['options'][K]) => void
  setM3: (r: number, c: number, v: number) => void
  setM3All: (m: Mat3) => void
  setU3: (v: Vec3) => void
  setV3: (v: Vec3) => void
  setPoly: (i: number, v: number) => void
  resetScene: () => void
  addPoint: (p: Vec) => void
  setPoint: (i: number, p: Vec) => void
  setPoints: (ps: Vec[]) => void
  setImage: (img: { size: number; data: Float64Array } | null) => void
  setRank: (k: number) => void
  setFourier: (f: Partial<State['fourier']>) => void
  setAngle4: (i: number, v: number) => void
  setSpin4: (b: boolean) => void
  nextChallenge: (lens: Lens) => void
  ensurePair: () => void
  setPath: (p: Vec[]) => void
  setDrawingPath: (b: boolean) => void
  setCircles: (n: number) => void
  setFractal: (f: Partial<State['fractal']>) => void
  loadFromHash: () => boolean
  toHash: () => string
}

let n = 0
const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}`

const matNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export const useStore = create<State & Actions>()((set, get) => ({
  stack: [{ id: uid(), name: 'A', m: { a: 1, b: 0.5, c: 0, d: 1.2 } }],
  objects: [],
  lens: 'vector',
  t: 1,
  probe: { x: 2, y: 1.5 },
  probe2: { x: -1, y: 2 },
  show: { grid: true, circle: false, square: true },
  drawing: null,
  selected: null,
  options: { normalize: true, steps: 10, k: 1, nonlinear: false },
  m3: [[1, 0.3, 0], [0, 1, 0.4], [0.2, 0, 1.2]],
  u3: { x: 2, y: 0.5, z: 0 },
  v3: { x: 0.5, y: 2, z: 0.8 },
  poly: [1, -1, 0.5, 0.3],
  points: [],
  image: null,
  rank: 6,
  fourier: { terms: 3, wave: 'square' },
  angles4: [0, 0, 0, 0, 0, 0],
  spin4: false,
  challenge: {},
  path: [],
  drawingPath: false,
  circles: 20,
  fractal: { preset: 'fern', bend: 0, showMaps: true },

  tMax: () => { const s = get(); return LENSES[s.lens].tMax({ stackLength: s.stack.length, steps: s.options.steps }) },
  setLens: (lens) => {
    set((s) => ({ lens, show: LENSES[lens].needsCircle ? { ...s.show, circle: true } : s.show }))
    if (lens === 'multiply') get().ensurePair()
    set({ t: get().tMax() })
  },
  setM3: (r, c, v) => set((s) => ({ m3: s.m3.map((row, rr) => row.map((x, cc) => (rr === r && cc === c ? v : x))) as Mat3 })),
  setM3All: (m) => set({ m3: m }),
  setU3: (v) => set({ u3: v }),
  setV3: (v) => set({ v3: v }),
  addPoint: (p) => set((s) => ({ points: [...s.points, p] })),
  setPoint: (i, p) => set((s) => ({ points: s.points.map((q, k) => (k === i ? p : q)) })),
  setPoints: (ps) => set({ points: ps }),
  setImage: (img) => set({ image: img }),
  setRank: (k) => set({ rank: k }),
  setFourier: (f) => set((s) => ({ fourier: { ...s.fourier, ...f } })),
  setAngle4: (i, v) => set((s) => ({ angles4: s.angles4.map((a, k) => (k === i ? v : a)) })),
  setSpin4: (b) => set({ spin4: b }),
  nextChallenge: (lens) => set((s) => ({ challenge: { ...s.challenge, [lens]: (s.challenge[lens] ?? 0) + 1 } })),
  setPath: (p) => set({ path: p }),
  setDrawingPath: (b) => set({ drawingPath: b }),
  setCircles: (n) => set({ circles: n }),
  setFractal: (f) => set((s) => ({ fractal: { ...s.fractal, ...f } })),
  ensurePair: () => { const s = get(); if (s.stack.length < 2) s.addMatrix({ a: 0, b: -1, c: 1, d: 0 }, 'B') },
  resetScene: () => {
    const s = get()
    s.replaceStack([{ a: 1, b: 0.5, c: 0, d: 1.2 }])
    set({ probe: { x: 2, y: 1.5 }, probe2: { x: -1, y: 2 }, objects: [], drawing: null, m3: [[1, 0.3, 0], [0, 1, 0.4], [0.2, 0, 1.2]], u3: { x: 2, y: 0.5, z: 0 }, v3: { x: 0.5, y: 2, z: 0.8 }, poly: [1, -1, 0.5, 0.3], points: [], angles4: [0, 0, 0, 0, 0, 0], rank: 6, options: { ...s.options, k: 1, nonlinear: false } })
    set({ t: get().tMax() })
  },
  setPoly: (i, v) => set((s) => ({ poly: s.poly.map((x, k) => (k === i ? v : x)) as State['poly'] })),
  setOption: (k, v) => { set((s) => ({ options: { ...s.options, [k]: v } })); if (k !== 'k' && k !== 'nonlinear') set({ t: get().tMax() }) },
  setT: (t) => set({ t }),

  setMatrix: (id, m) => set((s) => ({ stack: s.stack.map((it) => (it.id === id ? { ...it, m: { ...it.m, ...m } } : it)) })),
  addMatrix: (m = { a: 1, b: 0, c: 0, d: 1 }, name) =>
    set((s) => {
      const nm = name ?? matNames[s.stack.length % matNames.length]
      const stack = [...s.stack, { id: uid(), name: nm, m }]
      return { stack, t: LENSES[s.lens].tMax({ stackLength: stack.length, steps: s.options.steps }) }
    }),
  removeMatrix: (id) =>
    set((s) => {
      if (s.stack.length === 1) return {}
      const stack = s.stack.filter((it) => it.id !== id)
      return { stack, t: Math.min(s.t, LENSES[s.lens].tMax({ stackLength: stack.length, steps: s.options.steps })) }
    }),
  moveMatrix: (id, dir) =>
    set((s) => {
      const i = s.stack.findIndex((it) => it.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= s.stack.length) return {}
      const stack = [...s.stack]
      ;[stack[i], stack[j]] = [stack[j], stack[i]]
      return { stack }
    }),
  replaceStack: (mats) =>
    set((s) => ({
      stack: mats.map((m, i) => ({ id: uid(), name: matNames[i % matNames.length], m })),
      t: LENSES[s.lens].tMax({ stackLength: mats.length, steps: s.options.steps }),
    })),

  setProbe: (v) => set({ probe: v }),
  setProbe2: (v) => set({ probe2: v }),
  addVector: (v) =>
    set((s) => {
      const k = s.objects.filter((o) => o.kind === 'vector').length
      const name = `v${k + 1}`
      const nv = v ?? { x: 1 + 0.6 * k, y: 2 - 0.4 * k }
      return { objects: [...s.objects, { id: uid(), kind: 'vector', name, v: nv }] }
    }),
  setVector: (id, v) => set((s) => ({ objects: s.objects.map((o) => (o.id === id && o.kind === 'vector' ? { ...o, v } : o)) })),
  setShapePoint: (id, i, p) => set((s) => ({ objects: s.objects.map((o) => (o.id === id && o.kind === 'shape' ? { ...o, points: o.points.map((q, k) => (k === i ? p : q)) } : o)) })),
  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id), selected: s.selected === id ? null : s.selected })),
  renameObject: (id, name) => set((s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, name } : o)) })),

  startDrawing: () => set({ drawing: [] }),
  addDrawingPoint: (p) => set((s) => (s.drawing ? { drawing: [...s.drawing, p] } : {})),
  finishDrawing: () =>
    set((s) => {
      if (!s.drawing || s.drawing.length < 3) return { drawing: null }
      const k = s.objects.filter((o) => o.kind === 'shape').length
      return { drawing: null, objects: [...s.objects, { id: uid(), kind: 'shape', name: `shape ${k + 1}`, points: s.drawing }] }
    }),
  cancelDrawing: () => set({ drawing: null }),

  toggle: (k) => set((s) => ({ show: { ...s.show, [k]: !s.show[k] } })),
  select: (id) => set({ selected: id }),

  // Share: everything lives in the hash so a link reproduces the scene.
  toHash: () => {
    const s = get()
    const num = (x: number) => (+x.toFixed(3)).toString()
    const parts: string[] = [`l_${s.lens}`, `p_${num(s.probe.x)}_${num(s.probe.y)}_${num(s.probe2.x)}_${num(s.probe2.y)}`]
    s.stack.forEach((it) => parts.push(`m_${[it.m.a, it.m.b, it.m.c, it.m.d].map(num).join('_')}`))
    s.objects.forEach((o) => {
      if (o.kind === 'vector') parts.push(`v_${num(o.v.x)}_${num(o.v.y)}`)
      else parts.push(`s_${o.points.map((p) => `${num(p.x)}_${num(p.y)}`).join('_')}`)
    })
    return parts.join('~')
  },
  loadFromHash: () => {
    const h = location.hash.replace(/^#/, '')
    if (!h) return false
    try {
      const stack: Mat[] = []
      const objects: SceneObj[] = []
      let lens: Lens = 'vector'
      let probes: number[] | null = null
      for (const part of h.split('~')) {
        const [k, ...rest] = part.split('_')
        const nums = rest.map(Number)
        if (k === 'l' && isLens(rest[0])) lens = rest[0]
        if (k === 'p' && nums.length === 4 && nums.every(Number.isFinite)) probes = nums
        if (k === 'm' && nums.length === 4 && nums.every(Number.isFinite)) stack.push({ a: nums[0], b: nums[1], c: nums[2], d: nums[3] })
        if (k === 'v' && nums.length === 2) objects.push({ id: uid(), kind: 'vector', name: `v${objects.filter((o) => o.kind === 'vector').length + 1}`, v: { x: nums[0], y: nums[1] } })
        if (k === 's' && nums.length >= 6 && nums.length % 2 === 0) {
          const points: Vec[] = []
          for (let i = 0; i < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] })
          objects.push({ id: uid(), kind: 'shape', name: `shape ${objects.filter((o) => o.kind === 'shape').length + 1}`, points })
        }
      }
      if (!stack.length) return false
      get().replaceStack(stack)
      set({ objects, lens })
      if (probes) set({ probe: { x: probes[0], y: probes[1] }, probe2: { x: probes[2], y: probes[3] } })
      set({ t: get().tMax() })
      return true
    } catch {
      return false
    }
  },
}))

export const PRESETS: { name: string; stack: Mat[] }[] = [
  { name: 'Shear', stack: [{ a: 1, b: 1, c: 0, d: 1 }] },
  { name: 'Rotate', stack: [{ a: 0.707, b: -0.707, c: 0.707, d: 0.707 }] },
  { name: 'Reflect', stack: [{ a: 0, b: 1, c: 1, d: 0 }] },
  { name: 'Stretch', stack: [{ a: 2, b: 0.5, c: 0.5, d: 1 }] },
  { name: 'Squash', stack: [{ a: 1, b: 0.5, c: 2, d: 1 }] },
  { name: 'Shear then rotate', stack: [{ a: 1, b: 1, c: 0, d: 1 }, { a: 0, b: -1, c: 1, d: 0 }] },
  { name: 'Markov', stack: [{ a: 0.9, b: 0.3, c: 0.1, d: 0.7 }] },
  { name: 'Spiral', stack: [{ a: 0.8, b: -0.6, c: 0.6, d: 0.8 }] },
  { name: 'Identity', stack: [{ a: 1, b: 0, c: 0, d: 1 }] },
]
