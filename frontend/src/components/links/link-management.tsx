import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Trash2,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getLinkRequests,
  acceptLinkRequest,
  rejectLinkRequest,
  removeOrBlockLink,
  type Link,
} from '@/lib/api/links'

export function LinkManagement() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
  const [linkToBlock, setLinkToBlock] = useState<Link | null>(null)

  const queryClient = useQueryClient()

  // Fetch link requests
  const {
    data: links = [],
    isLoading: linksLoading,
    error: linksError,
  } = useQuery({
    queryKey: ['linkRequests', statusFilter],
    queryFn: () => {
      const filter = statusFilter === 'all' ? undefined : statusFilter
      return getLinkRequests(filter)
    },
  })

  // Filter links based on search query
  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      link.consumer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: acceptLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkRequests'] })
      setSelectedLink(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: rejectLinkRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkRequests'] })
      setSelectedLink(null)
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ linkId, block }: { linkId: string; block: boolean }) =>
      removeOrBlockLink(linkId, block),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkRequests'] })
      setIsBlockDialogOpen(false)
      setLinkToBlock(null)
      setSelectedLink(null)
    },
  })

  const handleAccept = (linkId: string) => {
    if (confirm('Are you sure you want to accept this link request?')) {
      acceptMutation.mutate(linkId)
    }
  }

  const handleReject = (linkId: string) => {
    if (confirm('Are you sure you want to reject this link request?')) {
      rejectMutation.mutate(linkId)
    }
  }

  const handleRemove = (link: Link) => {
    if (confirm('Are you sure you want to remove this link?')) {
      removeMutation.mutate({ linkId: link.id, block: false })
    }
  }

  const handleBlock = (link: Link) => {
    setLinkToBlock(link)
    setIsBlockDialogOpen(true)
  }

  const handleConfirmBlock = () => {
    if (!linkToBlock) return
    if (
      confirm(
        'Are you sure you want to block this consumer? They will not be able to request links in the future.',
      )
    ) {
      removeMutation.mutate({ linkId: linkToBlock.id, block: true })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'accepted':
        return 'default'
      case 'declined':
        return 'destructive'
      case 'blocked':
        return 'destructive'
      case 'removed':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Consumer Links
        </h2>
        <p className="text-muted-foreground">
          Manage link requests from consumers. Accept or reject requests to
          control who can access your products.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by consumer name or link ID..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Links Table */}
      <div className="rounded-md border">
        {linksLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Loading link requests...
            </div>
          </div>
        ) : linksError ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-destructive">
              Failed to load link requests. Please try again.
            </div>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Store className="h-12 w-12 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No links match your filters'
                : 'No link requests yet.'}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consumer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Responded At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    {link.consumer_name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(link.status)}>
                      {link.status.charAt(0).toUpperCase() +
                        link.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(link.requested_at)}</TableCell>
                  <TableCell>
                    {link.responded_at
                      ? formatDate(link.responded_at)
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {link.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAccept(link.id)}
                            disabled={acceptMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(link.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {link.status === 'accepted' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemove(link)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleBlock(link)}
                            disabled={removeMutation.isPending}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Block
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary */}
      {filteredLinks.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredLinks.length} of {links.length} link
          {links.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Block Confirmation Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Consumer</DialogTitle>
            <DialogDescription>
              Are you sure you want to block this consumer? They will not be
              able to request links in the future.
            </DialogDescription>
          </DialogHeader>
          {linkToBlock && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Consumer:</p>
                <p className="text-sm text-muted-foreground">
                  {linkToBlock.consumer_name || 'Unknown'}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBlockDialogOpen(false)
                    setLinkToBlock(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmBlock}
                  disabled={removeMutation.isPending}
                >
                  {removeMutation.isPending ? 'Blocking...' : 'Block Consumer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

