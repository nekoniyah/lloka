import React from 'react'

export function App(): React.ReactElement {
  return (
    <div className='flex h-screen w-screen items-center justify-center flex-col gap-2'>
      <h1 className='text-2xl font-bold text-foreground'>This page is still a work in progress.</h1>
      <time className='text-xs text-muted-foreground' dateTime='2026-05-22T02:11:00Z'>It is late right now, so I will work on it tomorrow.</time>
    </div>
  )
}