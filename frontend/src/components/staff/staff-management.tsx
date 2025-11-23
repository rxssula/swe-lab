import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Edit,
  Trash2,
  Users,
  UserPlus,
  Shield,
  UserCog,
  Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  listSupplierStaff,
  createSupplierStaff,
  updateStaffRole,
  removeSupplierStaff,
  type StaffMember,
  type CreateStaffRequest,
} from '@/lib/api/staff'

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'OWNER':
      return 'default'
    case 'MANAGER':
      return 'secondary'
    case 'SALES':
      return 'outline'
    default:
      return 'outline'
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'OWNER':
      return <Shield className="h-4 w-4" />
    case 'MANAGER':
      return <UserCog className="h-4 w-4" />
    case 'SALES':
      return <Briefcase className="h-4 w-4" />
    default:
      return null
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StaffManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [createForm, setCreateForm] = useState<CreateStaffRequest>({
    email: '',
    password: '',
    role: 'SALES',
    name: '',
    phone_number: '',
  })
  const [editRole, setEditRole] = useState<'OWNER' | 'MANAGER' | 'SALES'>(
    'SALES',
  )

  const queryClient = useQueryClient()
  const userRole = localStorage.getItem('role') as string | null
  const isOwner = userRole === 'OWNER'

  // Fetch staff list
  const {
    data: staff = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['supplierStaff'],
    queryFn: listSupplierStaff,
  })

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: createSupplierStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierStaff'] })
      setIsCreateOpen(false)
      setCreateForm({
        email: '',
        password: '',
        role: 'SALES',
        name: '',
        phone_number: '',
      })
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({
      staffId,
      role,
    }: {
      staffId: string
      role: 'OWNER' | 'MANAGER' | 'SALES'
    }) => updateStaffRole(staffId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierStaff'] })
      setIsEditOpen(false)
      setSelectedStaff(null)
    },
  })

  // Remove staff mutation
  const removeMutation = useMutation({
    mutationFn: removeSupplierStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierStaff'] })
    },
  })

  const handleCreate = () => {
    if (!createForm.email || !createForm.password || !createForm.name) {
      alert('Please fill in all required fields')
      return
    }
    createMutation.mutate(createForm)
  }

  const handleEdit = (staff: StaffMember) => {
    setSelectedStaff(staff)
    setEditRole(staff.role as 'OWNER' | 'MANAGER' | 'SALES')
    setIsEditOpen(true)
  }

  const handleUpdateRole = () => {
    if (!selectedStaff) return
    updateRoleMutation.mutate({
      staffId: selectedStaff.id,
      role: editRole,
    })
  }

  const handleRemove = (staff: StaffMember) => {
    if (
      confirm(
        `Are you sure you want to remove ${staff.email}? This action cannot be undone.`,
      )
    ) {
      removeMutation.mutate(staff.id)
    }
  }

  // Filter out current user from staff list (they can't manage themselves)
  const currentUserId = localStorage.getItem('user_id')
  const displayStaff = staff.filter((s) => s.user_id !== currentUserId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Staff Management
          </h2>
          <p className="text-muted-foreground">
            Manage your team members, roles, and permissions
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Staff Table */}
      <div className="rounded-md border">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Loading staff...
            </div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-destructive">
              Failed to load staff. Please try again.
            </div>
          </div>
        ) : displayStaff.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              No staff members yet. Add your first team member to get started.
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Last Login</TableHead>
                {isOwner && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayStaff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.email.split('@')[0]}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      <span className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>{member.phone_number || 'N/A'}</TableCell>
                  <TableCell>{formatDate(member.created_at)}</TableCell>
                  <TableCell>
                    {member.last_login_at
                      ? formatDate(member.last_login_at)
                      : 'Never'}
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Staff Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff member account. Owners can create Managers and
              Sales Representatives.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter phone number (optional)"
                value={createForm.phone_number}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone_number: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={createForm.role}
                onValueChange={(value: 'OWNER' | 'MANAGER' | 'SALES') =>
                  setCreateForm({ ...createForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="SALES">Sales Representative</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Note: Owners cannot be created through this interface.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false)
                  setCreateForm({
                    email: '',
                    password: '',
                    role: 'SALES',
                    name: '',
                    phone_number: '',
                  })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !createForm.email ||
                  !createForm.password ||
                  !createForm.name ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending
                  ? 'Creating...'
                  : 'Create Staff Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Staff Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedStaff?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editRole}
                onValueChange={(value: 'OWNER' | 'MANAGER' | 'SALES') =>
                  setEditRole(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="SALES">Sales Representative</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Note: Owner role cannot be changed through this interface.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
