import './globals.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@components/ui/tooltip'

import { App } from './app'
import { Toaster } from 'sonner'

ReactDOM.createRoot(document.body).render(
  <React.StrictMode>
    <BrowserRouter>
      <TooltipProvider delayDuration={100}>
        <App />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  </React.StrictMode>,
)