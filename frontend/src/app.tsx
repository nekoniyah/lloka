import { motion } from 'framer-motion'

export function App(): React.ReactElement | null {
  return (
    <motion.div
      className='min-h-screen bg-gray-50 flex items-center justify-center'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className='text-center space-y-3'>
        <motion.h1
          className='text-4xl font-bold tracking-tight text-gray-900'
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Welcome to your lloka App
        </motion.h1>
        <motion.h2
          className='text-2xl font-semibold tracking-tight text-gray-900'
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Vite + React + TypeScript + Tailwind + Shadcn UI
        </motion.h2>
        <motion.p
          className='text-gray-500 text-sm'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          Edit{' '}
          <code className='bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700'>
            src/App.tsx
          </code>{' '}
          to get started
        </motion.p>
        <div className='flex justify-center space-x-4 mt-4'>
          <a className='text-sm text-blue-600 hover:underline' href='https://vitejs.dev/guide/features.html' target='_blank'>Learn more about Vite</a>
          <a className='text-sm text-blue-600 hover:underline ml-4' href='https://react.dev/learn' target='_blank'>Learn more about React</a>
        </div>
      </div>
    </motion.div>
  )
}