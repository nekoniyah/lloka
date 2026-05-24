import React from 'react'
import { AuthProvider } from '@contexts/auth'
import { SidebarProvider, SidebarTrigger } from '@components/ui/sidebar'
import { Sidebar } from '@components/sidebar'
import { Route, Routes } from 'react-router-dom'

import HomePage from '@pages/home'
import LoginPage from '@pages/login'
import NotFoundPage from '@pages/not-found'

export function App(): React.ReactElement {
  return (
    <AuthProvider>
      <SidebarProvider>
        <SidebarTrigger />
        <Sidebar />
        <main className='flex-1 p-4'>
          <Routes>
            <Route path='/' element={<HomePage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='*' element={<NotFoundPage />} />
          </Routes>
        </main>
      </SidebarProvider>
    </AuthProvider>
  )
}