import React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics, useBox, usePlane } from '@react-three/cannon'
import { Link } from 'react-router-dom'
import { Button } from '@components/ui/button'
import { Card } from '@components/ui/card'
import { Separator } from '@components/ui/separator'
import * as THREE from 'three'

function r(min: number, max: number) {
  return Math.random() * (max - min) + min
}

/* ---------------- TEXTURE ---------------- */

function makeFace(value: number) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')!

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#111'

  const p = (x: number, y: number) => {
    ctx.beginPath()
    ctx.arc(x, y, 22, 0, Math.PI * 2)
    ctx.fill()
  }

  const o = 512 / 4

  if (value === 1) p(o * 2, o * 2)
  if (value === 2) { p(o, o); p(o * 3, o * 3) }
  if (value === 3) { p(o, o); p(o * 2, o * 2); p(o * 3, o * 3) }
  if (value === 4) { p(o, o); p(o * 3, o); p(o, o * 3); p(o * 3, o * 3) }
  if (value === 5) { p(o, o); p(o * 3, o); p(o * 2, o * 2); p(o, o * 3); p(o * 3, o * 3) }
  if (value === 6) { p(o, o); p(o * 3, o); p(o, o * 2); p(o * 3, o * 2); p(o, o * 3); p(o * 3, o * 3) }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---------------- RESPONSIVE CAMERA ---------------- */

function CameraRig() {
  const { camera, size } = useThree()

  React.useEffect(() => {
    const aspect = size.width / size.height
    const distance = 6

    camera.position.set(distance * (aspect > 1 ? 1 : 0.6), 6, distance)
    camera.lookAt(0, 0, 0)
  }, [camera, size])

  return null
}

/* ---------------- BOUNDS (RESPONSIVE BOX) ---------------- */

function Bounds() {
  const { size } = useThree()

  const scale = Math.min(size.width, size.height) / 200

  const s = 4 * scale
  const h = 3 * scale

  const plane = (p: any, r: any) => {
    const [ref] = usePlane(() => ({ position: p, rotation: r }))
    return <mesh ref={ref as any} />
  }

  return (
    <>
      {plane([0, -1.5, 0], [-Math.PI / 2, 0, 0])}
      {plane([0, 0, -s], [0, 0, 0])}
      {plane([0, 0, s], [0, Math.PI, 0])}
      {plane([-s, 0, 0], [0, Math.PI / 2, 0])}
      {plane([s, 0, 0], [0, -Math.PI / 2, 0])}
      {plane([0, h, 0], [Math.PI / 2, 0, 0])}
    </>
  )
}

/* ---------------- DICE ---------------- */

function Dice({ position, trigger, onStop }: any) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    args: [1, 1, 1],
    friction: 0.9,
    restitution: 0.2,
  }))

  const vel = React.useRef([0, 0, 0])
  const ang = React.useRef([0, 0, 0])
  const stopped = React.useRef(false)

  React.useEffect(() => {
    stopped.current = false

    api.velocity.set(r(-3, 3), r(4, 7), r(-3, 3))
    api.angularVelocity.set(r(-6, 6), r(-6, 6), r(-6, 6))

    const v = api.velocity.subscribe(v => (vel.current = v))
    const a = api.angularVelocity.subscribe(a => (ang.current = a))

    return () => { v(); a() }
  }, [trigger, api])

  useFrame(() => {
    if (stopped.current) return

    const speed =
      Math.abs(vel.current[0]) +
      Math.abs(vel.current[1]) +
      Math.abs(vel.current[2]) +
      Math.abs(ang.current[0]) +
      Math.abs(ang.current[1]) +
      Math.abs(ang.current[2])

    if (speed < 0.25) {
      stopped.current = true
      onStop()
    }
  })

  const mats = React.useMemo(() => [
    new THREE.MeshStandardMaterial({ map: makeFace(1) }),
    new THREE.MeshStandardMaterial({ map: makeFace(6) }),
    new THREE.MeshStandardMaterial({ map: makeFace(2) }),
    new THREE.MeshStandardMaterial({ map: makeFace(5) }),
    new THREE.MeshStandardMaterial({ map: makeFace(3) }),
    new THREE.MeshStandardMaterial({ map: makeFace(4) }),
  ], [])

  return (
    <mesh ref={ref as any} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      {mats.map((m, i) => (
        <primitive key={i} object={m} attach={`material-${i}`} />
      ))}
    </mesh>
  )
}

/* ---------------- SCENE ---------------- */

function Scene({ trigger, onStop }: any) {
  return (
    <Canvas
      shadows
      className='absolute inset-0 w-full h-full'
      camera={{ position: [0, 6, 6], fov: 50 }}
    >
      <CameraRig />

      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 8, 4]} intensity={1.3} castShadow />

      <Physics gravity={[0, -9.81, 0]}>
        <Bounds />

        <Dice position={[-1.4, 2.5, 0]} trigger={trigger} onStop={onStop} />
        <Dice position={[0, 2.5, 0]} trigger={trigger} onStop={onStop} />
        <Dice position={[1.4, 2.5, 0]} trigger={trigger} onStop={onStop} />
      </Physics>
    </Canvas>
  )
}

/* ---------------- PAGE ---------------- */

export default function NotFoundPage() {
  const [trigger, setTrigger] = React.useState(0)
  const [log, setLog] = React.useState(['system ready'])
  const stopped = React.useRef(0)

  const roll = () => {
    stopped.current = 0
    setTrigger(t => t + 1)
    setLog(l => ['roll', ...l].slice(0, 6))
  }

  const onStop = () => {
    stopped.current++
    if (stopped.current >= 3) {
      setLog(l => ['settled', ...l].slice(0, 6))
    }
  }

  return (
    <div className='fixed inset-0 overflow-hidden bg-neutral-950 text-white'>
      <div className='absolute inset-0'>
        <Scene trigger={trigger} onStop={onStop} />
      </div>

      <div className='absolute bottom-0 w-full flex justify-center p-4 pointer-events-none'>
        <Card className='pointer-events-auto w-full max-w-xl bg-neutral-900/60 border-neutral-800'>
          <div className='p-4 space-y-4'>
            <h1>404</h1>
            <Separator />
            <div className='flex gap-2'>
              <Button className='flex-1' onClick={roll}>roll</Button>
              <Link to='/' className='flex-1'>
                <Button className='w-full' variant='secondary'>exit</Button>
              </Link>
            </div>
            <div className='text-xs text-neutral-400 space-y-1'>
              {log.map((l, i) => <div key={i}>• {l}</div>)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}