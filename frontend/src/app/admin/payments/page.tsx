"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Download,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import { paymentService, PaymentTransaction, PaymentStats } from "@/lib/services/payments"

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null)

  useEffect(() => {
    fetchPayments()
    fetchStats()
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const data = await paymentService.getAdminPaymentTransactions()
      setPayments(data)
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await paymentService.getAdminPaymentStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching payment stats:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      success: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      refunded: "bg-blue-100 text-blue-800",
      canceled: "bg-gray-100 text-gray-800",
      cancelled: "bg-gray-100 text-gray-800"
    }
    
    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.stripe_checkout_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.order_id.toString().includes(searchTerm) ||
      (payment.order?.user.email && payment.order.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportPayments = () => {
    const csvContent = [
      ['Order ID', 'Checkout ID', 'Amount', 'Status', 'Date', 'Customer Email'].join(','),
      ...filteredPayments.map(payment => [
        payment.order_id,
        payment.stripe_checkout_id,
        payment.amount,
        payment.status,
        payment.created_at,
        payment.order?.user.email || 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Transactions</h1>
          <p className="text-muted-foreground">
            Manage and monitor all payment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPayments} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportPayments} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_transactions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_amount)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.successful_transactions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed/Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.failed_transactions + stats.pending_transactions}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by checkout ID, order ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>
            {filteredPayments.length} of {payments.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">#{payment.order_id}</TableCell>
                  <TableCell>
                    {payment.order?.user ? (
                      <div>
                        <div className="font-medium">
                          {payment.order.user.first_name} {payment.order.user.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.order.user.email}
                        </div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>{formatDate(payment.created_at)}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Payment Details</DialogTitle>
                          <DialogDescription>
                            Transaction ID: {selectedPayment?.stripe_checkout_id}
                          </DialogDescription>
                        </DialogHeader>
                        {selectedPayment && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Order ID</label>
                                <p className="text-sm text-muted-foreground">#{selectedPayment.order_id}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Amount</label>
                                <p className="text-sm text-muted-foreground">{formatCurrency(selectedPayment.amount)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Status</label>
                                <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Date</label>
                                <p className="text-sm text-muted-foreground">{formatDate(selectedPayment.created_at)}</p>
                              </div>
                              <div className="col-span-2">
                                <label className="text-sm font-medium">Stripe Checkout ID</label>
                                <p className="text-sm text-muted-foreground font-mono">{selectedPayment.stripe_checkout_id}</p>
                              </div>
                              {selectedPayment.stripe_payment_intent && (
                                <div className="col-span-2">
                                  <label className="text-sm font-medium">Stripe Payment Intent</label>
                                  <p className="text-sm text-muted-foreground font-mono">{selectedPayment.stripe_payment_intent}</p>
                                </div>
                              )}
                              {selectedPayment.order?.user && (
                                <div className="col-span-2">
                                  <label className="text-sm font-medium">Customer Information</label>
                                  <div className="mt-1 space-y-1">
                                    <p className="text-sm text-muted-foreground">
                                      {selectedPayment.order.user.first_name} {selectedPayment.order.user.last_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{selectedPayment.order.user.email}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No payment transactions found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Payment transactions will appear here once orders are processed"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
