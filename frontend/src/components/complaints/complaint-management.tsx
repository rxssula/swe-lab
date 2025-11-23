import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  AlertCircle,
  Eye,
  Plus,
  MessageSquare,
  CheckCircle2,
  ArrowUp,
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
import {
  getMyComplaints,
  getMyAssignedIncidents,
  getSupplierIncidents,
  getIncidentDetail,
  addIncidentLog,
  escalateIncident,
  resolveIncident,
  createIncident,
  type IncidentSummary,
  type IncidentDetail,
  type IncidentStatus,
} from '@/lib/api/incidents'
import { getMyLinks } from '@/lib/api/links'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface ComplaintManagementProps {
  userType: 'supplier' | 'consumer'
}

function getStatusBadgeVariant(status: IncidentStatus) {
  switch (status) {
    case 'open':
      return 'destructive'
    case 'in_progress':
      return 'default'
    case 'resolved':
      return 'secondary'
    default:
      return 'outline'
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

export function ComplaintManagement({ userType }: ComplaintManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedIncident, setSelectedIncident] =
    useState<IncidentDetail | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCommentOpen, setIsCommentOpen] = useState(false)
  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [isEscalateOpen, setIsEscalateOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [resolveNotes, setResolveNotes] = useState('')
  const [escalateReason, setEscalateReason] = useState('')
  const [escalateToRole, setEscalateToRole] = useState<'MANAGER' | 'OWNER'>(
    'MANAGER',
  )

  // Create form state
  const [createLinkId, setCreateLinkId] = useState('')
  const [createOrderId, setCreateOrderId] = useState('')
  const [createDescription, setCreateDescription] = useState('')

  const queryClient = useQueryClient()

  // Fetch incidents based on user type
  const {
    data: incidents = [],
    isLoading: incidentsLoading,
    error: incidentsError,
  } = useQuery({
    queryKey: ['incidents', userType, statusFilter],
    queryFn: async () => {
      const status =
        statusFilter === 'all' ? undefined : (statusFilter as IncidentStatus)
      if (userType === 'consumer') {
        return getMyComplaints(status)
      } else {
        // For suppliers, try to get all supplier incidents first (for Managers/Owners)
        // If that fails with 403, fall back to assigned incidents (for Sales Reps)
        try {
          return await getSupplierIncidents(status)
        } catch (error: any) {
          // If user doesn't have permission (403), get assigned incidents instead
          if (
            error?.message?.includes('403') ||
            error?.message?.includes('Only Managers and Owners')
          ) {
            return getMyAssignedIncidents(status)
          }
          throw error
        }
      }
    },
  })

  // Fetch links for creating incidents (consumer only)
  const { data: links = [] } = useQuery({
    queryKey: ['links', 'accepted'],
    queryFn: () => getMyLinks('accepted'),
    enabled: userType === 'consumer' && isCreateOpen,
  })

  // Fetch incident details
  const { data: incidentDetail, refetch: refetchIncidentDetail } = useQuery({
    queryKey: ['incident', selectedIncident?.id],
    queryFn: () => getIncidentDetail(selectedIncident!.id),
    enabled: !!selectedIncident && isDetailsOpen,
  })

  // Filter incidents based on search query
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.consumer_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      incident.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: (data: { incidentId: string; action: string; notes: string }) =>
      addIncidentLog(data.incidentId, {
        action: data.action,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      if (selectedIncident) {
        refetchIncidentDetail()
      }
      setCommentText('')
      setIsCommentOpen(false)
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (data: { incidentId: string; resolutionNotes: string }) =>
      resolveIncident(data.incidentId, {
        resolution_notes: data.resolutionNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      if (selectedIncident) {
        refetchIncidentDetail()
      }
      setResolveNotes('')
      setIsResolveOpen(false)
    },
  })

  const escalateMutation = useMutation({
    mutationFn: (data: {
      incidentId: string
      reason: string
      escalateToRole: 'MANAGER' | 'OWNER'
    }) =>
      escalateIncident(data.incidentId, {
        reason: data.reason,
        escalate_to_role: data.escalateToRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      if (selectedIncident) {
        refetchIncidentDetail()
      }
      setEscalateReason('')
      setIsEscalateOpen(false)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      linkId: string
      orderId?: string | null
      description: string
    }) =>
      createIncident({
        link_id: data.linkId,
        order_id: data.orderId || null,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setCreateLinkId('')
      setCreateOrderId('')
      setCreateDescription('')
      setIsCreateOpen(false)
    },
  })

  const handleViewDetails = async (incident: IncidentSummary) => {
    const detail = await getIncidentDetail(incident.id)
    setSelectedIncident(detail)
    setIsDetailsOpen(true)
  }

  const handleAddComment = () => {
    if (!selectedIncident || !commentText.trim()) return
    addCommentMutation.mutate({
      incidentId: selectedIncident.id,
      action: 'comment',
      notes: commentText,
    })
  }

  const handleResolve = () => {
    if (!selectedIncident || !resolveNotes.trim()) return
    resolveMutation.mutate({
      incidentId: selectedIncident.id,
      resolutionNotes: resolveNotes,
    })
  }

  const handleEscalate = () => {
    if (!selectedIncident || !escalateReason.trim()) return
    escalateMutation.mutate({
      incidentId: selectedIncident.id,
      reason: escalateReason,
      escalateToRole: escalateToRole,
    })
  }

  const handleCreate = () => {
    if (!createLinkId || !createDescription.trim()) return
    createMutation.mutate({
      linkId: createLinkId,
      orderId: createOrderId || null,
      description: createDescription,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {userType === 'supplier'
              ? 'Complaints Management'
              : 'My Complaints'}
          </h2>
          <p className="text-muted-foreground">
            {userType === 'supplier'
              ? 'View and manage complaints from consumers'
              : 'Submit complaints and view the status of previous complaints'}
          </p>
        </div>
        {userType === 'consumer' && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Complaint
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search complaints by ID, description, or business name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-md border">
        {incidentsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Loading complaints...
            </div>
          </div>
        ) : incidentsError ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-destructive">
              Failed to load complaints. Please try again.
            </div>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No complaints match your filters'
                : userType === 'consumer'
                  ? 'No complaints yet. Create your first complaint to get started.'
                  : 'No complaints yet.'}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                {userType === 'supplier' ? (
                  <TableHead>Consumer</TableHead>
                ) : (
                  <TableHead>Supplier</TableHead>
                )}
                {userType === 'supplier' && <TableHead>Assigned To</TableHead>}
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">
                    {incident.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(incident.status)}>
                      {incident.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {incident.description}
                  </TableCell>
                  <TableCell>
                    {userType === 'supplier'
                      ? incident.consumer_name || 'N/A'
                      : incident.supplier_name || 'N/A'}
                  </TableCell>
                  {userType === 'supplier' && (
                    <TableCell>
                      {incident.assigned_to_name || 'Unassigned'}
                    </TableCell>
                  )}
                  <TableCell>{formatDate(incident.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(incident)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary */}
      {filteredIncidents.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredIncidents.length} of {incidents.length} complaints
        </div>
      )}

      {/* Incident Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>
              View complete complaint information and activity log
            </DialogDescription>
          </DialogHeader>
          {incidentDetail && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Complaint ID</Label>
                  <p className="font-medium">{incidentDetail.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge
                      variant={getStatusBadgeVariant(incidentDetail.status)}
                    >
                      {incidentDetail.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    {userType === 'supplier' ? 'Consumer' : 'Supplier'}
                  </Label>
                  <p className="font-medium">
                    {userType === 'supplier'
                      ? incidentDetail.consumer_name || 'N/A'
                      : incidentDetail.supplier_name || 'N/A'}
                  </p>
                </div>
                {userType === 'supplier' && incidentDetail.assigned_to && (
                  <div>
                    <Label className="text-muted-foreground">Assigned To</Label>
                    <p className="font-medium">
                      {incidentDetail.assigned_to.name ||
                        incidentDetail.assigned_to.email}{' '}
                      ({incidentDetail.assigned_to.role})
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">
                    {formatDate(incidentDetail.created_at)}
                  </p>
                </div>
                {incidentDetail.resolved_at && (
                  <div>
                    <Label className="text-muted-foreground">Resolved At</Label>
                    <p className="font-medium">
                      {formatDate(incidentDetail.resolved_at)}
                    </p>
                  </div>
                )}
                {incidentDetail.order_id && (
                  <div>
                    <Label className="text-muted-foreground">Order ID</Label>
                    <p className="font-medium">{incidentDetail.order_id}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Description
                </Label>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm">{incidentDetail.description}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Log */}
              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Activity Log
                </Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {incidentDetail.logs.map((log) => (
                    <Card key={log.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {log.user_name || log.user_id.slice(0, 8)}
                              </span>
                              {log.user_role && (
                                <Badge variant="outline" className="text-xs">
                                  {log.user_role}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(log.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              <span className="font-medium capitalize">
                                {log.action}
                              </span>
                            </p>
                            <p className="text-sm">{log.notes}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCommentOpen(true)
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
                {userType === 'supplier' &&
                  incidentDetail.status !== 'resolved' && (
                    <>
                      <Button
                        variant="default"
                        onClick={() => {
                          setIsResolveOpen(true)
                        }}
                        disabled={resolveMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEscalateOpen(true)
                        }}
                        disabled={escalateMutation.isPending}
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Escalate
                      </Button>
                    </>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={isCommentOpen} onOpenChange={setIsCommentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              Add a comment or update to this complaint
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Enter your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCommentOpen(false)
                  setCommentText('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddComment}
                disabled={!commentText.trim() || addCommentMutation.isPending}
              >
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Complaint</DialogTitle>
            <DialogDescription>
              Mark this complaint as resolved and provide resolution notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resolve-notes">Resolution Notes</Label>
              <Textarea
                id="resolve-notes"
                placeholder="Describe how this complaint was resolved..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsResolveOpen(false)
                  setResolveNotes('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={!resolveNotes.trim() || resolveMutation.isPending}
              >
                Resolve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={isEscalateOpen} onOpenChange={setIsEscalateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Complaint</DialogTitle>
            <DialogDescription>
              Escalate this complaint to a higher authority
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="escalate-to">Escalate To</Label>
              <Select
                value={escalateToRole}
                onValueChange={(value: 'MANAGER' | 'OWNER') =>
                  setEscalateToRole(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="escalate-reason">Reason</Label>
              <Textarea
                id="escalate-reason"
                placeholder="Explain why you are escalating this complaint..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEscalateOpen(false)
                  setEscalateReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEscalate}
                disabled={!escalateReason.trim() || escalateMutation.isPending}
              >
                Escalate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Complaint Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Complaint</DialogTitle>
            <DialogDescription>
              Submit a new complaint about an order or supplier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link">Supplier Link *</Label>
              <Select value={createLinkId} onValueChange={setCreateLinkId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier link" />
                </SelectTrigger>
                <SelectContent>
                  {links.map((link) => (
                    <SelectItem key={link.id} value={link.id}>
                      {link.supplier_name || link.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="order-id">Order ID (Optional)</Label>
              <Input
                id="order-id"
                placeholder="Enter order ID if complaint is about an order"
                value={createOrderId}
                onChange={(e) => setCreateOrderId(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your complaint in detail..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false)
                  setCreateLinkId('')
                  setCreateOrderId('')
                  setCreateDescription('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  !createLinkId ||
                  !createDescription.trim() ||
                  createMutation.isPending
                }
              >
                Submit Complaint
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
