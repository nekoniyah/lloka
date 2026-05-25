import { Link } from 'react-router-dom'
import { Gamepad2, Info, LogIn, LogOut, Pencil, Plus, UserPlus, Users } from 'lucide-react'
import { Sidebar as UISidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader } from './ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'
import { useAuth } from '@contexts/auth'

interface SidebarLinkProps {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}

function SidebarLink({ to, icon, children }: SidebarLinkProps): React.ReactElement {
  return (
    <Link to={to} className='flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground'>
      {icon}
      <span>{children}</span>
    </Link>
  )
}

function SidebarSpacer(): React.ReactElement {
  return <div className='my-2 h-px w-full bg-border' />
}

export function Sidebar(): React.ReactElement | null {
  const { user, loading, authenticated, logout } = useAuth()

  return (
    <UISidebar>
      <SidebarHeader className='border-b'>
        <div className='flex flex-col items-center justify-between gap-3 p-3'>
          {loading ? (
            <>
              <div className='flex items-center gap-3'>
                <div>
                  <Skeleton className='mb-2 h-4 w-20' />
                  <Skeleton className='h-3 w-28' />
                </div>
              </div>
              <Skeleton className='h-10 w-10 rounded-full' />
            </>
          ) : (
            <>
              <p className='truncate text-sm font-semibold'>{authenticated ? user?.username : 'Guest'}</p>
              <Avatar className='h-30 w-30'>
                <AvatarImage src={user?.avatar || '/guest.jpeg'} alt={user?.username || 'Guest'} className='rounded-xl border border-border' />
                <AvatarFallback className='rounded-xl border border-border'>{user?.username?.[0].toUpperCase() || 'G'}</AvatarFallback>
              </Avatar>
            </>
          )}
        </div>
        {!loading && (
          <div className='flex gap-2 px-3 pb-3'>
            {authenticated ? (
              <Button variant='outline' className='w-full justify-start gap-2' onClick={() => logout()}>
                <LogOut className='h-4 w-4' />
                Logout
              </Button>
            ) : (
              <>
                <Button asChild variant='outline' className='flex-1 justify-start gap-2'>
                  <Link to='/login'>
                    <LogIn className='h-4 w-4' />
                    Login
                  </Link>
                </Button>
                <Button asChild className='flex-1 justify-start gap-2'>
                  <Link to='/register'>
                    <UserPlus className='h-4 w-4' />
                    Register
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className='gap-1 p-2'>
          <SidebarLink to='/join' icon={<Users className='h-4 w-4' />}>Join</SidebarLink>
          <SidebarSpacer />
          <SidebarLink to='/games' icon={<Gamepad2 className='h-4 w-4' />}>Games</SidebarLink>
          <SidebarLink to='/about' icon={<Info className='h-4 w-4' />}>What is Lloka ?</SidebarLink>
          {authenticated && (
            <>
              <SidebarSpacer />
              <SidebarLink to='/my-games' icon={<Users className='h-4 w-4' />}>My Games</SidebarLink>
              <SidebarLink to='/editor' icon={<Pencil className='h-4 w-4' />}>Editor</SidebarLink>
              <SidebarLink to='/host' icon={<Plus className='h-4 w-4' />}>Host</SidebarLink>
            </>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </UISidebar>
  )
}