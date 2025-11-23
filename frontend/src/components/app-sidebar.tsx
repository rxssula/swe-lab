'use client'

import * as React from 'react'
import {
  Package,
  ShoppingCart,
  AlertCircle,
  Link as LinkIcon,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react'
import { Link, useMatchRoute } from '@tanstack/react-router'

import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type UserType = 'supplier' | 'consumer'

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userType: UserType
  user: {
    email: string
  }
}

// Supplier navigation items
const supplierNavItems = [
  {
    title: 'Catalog Management',
    url: '/dashboard/catalog',
    icon: Package,
    description:
      'Manage products, pricing, stock levels, and delivery options.',
  },
  {
    title: 'Order Management',
    url: '/dashboard/orders',
    icon: ShoppingCart,
    description:
      'Manage incoming orders, accept/reject orders, and update stock.',
  },
  {
    title: 'Complaints',
    url: '/dashboard/complaints',
    icon: AlertCircle,
    description: 'View and resolve complaints submitted by consumers.',
  },
  {
    title: 'Consumer Links',
    url: '/dashboard/links',
    icon: LinkIcon,
    description:
      'Manage links with consumers (approve, block, or remove consumers).',
  },
  {
    title: 'Sales Communication',
    url: '/dashboard/chat',
    icon: MessageSquare,
    description: 'Communicate with consumers via chat (post-link approval).',
  },
  {
    title: 'Account Settings',
    url: '/dashboard/settings',
    icon: Settings,
    description:
      'Manage supplier account settings, user roles, and permissions (Owner only).',
  },
]

// Consumer navigation items
const consumerNavItems = [
  {
    title: 'Catalog',
    url: '/dashboard/catalog',
    icon: Package,
    description:
      'View the products available from linked suppliers (only after approval).',
  },
  {
    title: 'Find Suppliers',
    url: '/dashboard/suppliers',
    icon: LinkIcon,
    description:
      'Browse and request links to suppliers to access their products.',
  },
  {
    title: 'Orders',
    url: '/dashboard/orders',
    icon: ShoppingCart,
    description: 'View past orders, track their status, and reorder items.',
  },
  {
    title: 'Complaints',
    url: '/dashboard/complaints',
    icon: AlertCircle,
    description:
      'Submit complaints and view the status of previous complaints.',
  },
  {
    title: 'Chat with Supplier',
    url: '/dashboard/chat',
    icon: MessageSquare,
    description: 'Communicate directly with the supplier (post-link approval).',
  },
  {
    title: 'Account Settings',
    url: '/dashboard/settings',
    icon: Settings,
    description: 'Update personal information and account preferences.',
  },
]

export function AppSidebar({ userType, user, ...props }: AppSidebarProps) {
  const navItems = userType === 'supplier' ? supplierNavItems : consumerNavItems
  const matchRoute = useMatchRoute()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel>
            {userType === 'supplier'
              ? 'Supplier Dashboard'
              : 'Consumer Dashboard'}
          </SidebarGroupLabel>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = matchRoute({ to: item.url })
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.description}
                    isActive={!!isActive}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
