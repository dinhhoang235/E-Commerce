"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, Package, ShoppingCart, Users, TrendingUp, TrendingDown, Eye, ArrowUpRight, Loader2 } from "lucide-react"
import { adminPanelApi, transformToDashboardStats, formatCurrency, DashboardStats, RecentOrder, TopProduct } from "@/lib/services/adminpanel"

// Icon mapping for dynamic icon rendering
const iconMap = {
  DollarSign,
  ShoppingCart,
  Package,
  Users
}

// Interface for display version of TopProduct (with formatted revenue)
interface TopProductDisplay extends Omit<TopProduct, 'revenue'> {
  revenue: string
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProductDisplay[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load all dashboard data in parallel
        const [dashboardData, recentOrdersData] = await Promise.all([
          adminPanelApi.getDashboardData(),
          adminPanelApi.getRecentOrders(4) // Get last 4 orders for display
        ])

        // Transform analytics data to dashboard stats
        const dashboardStats = transformToDashboardStats(dashboardData)
        
        // Format top products data
        const formattedTopProducts = dashboardData.topProducts.map(product => ({
          ...product,
          revenue: formatCurrency(product.revenue)
        }))

        setStats(dashboardStats)
        setRecentOrders(recentOrdersData)
        setTopProducts(formattedTopProducts)

      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's what's happening with your store.</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading dashboard data...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const IconComponent = iconMap[stat.icon as keyof typeof iconMap]
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {IconComponent && <IconComponent className="h-4 w-4 text-slate-600" />}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="flex items-center text-xs text-slate-600">
                      {stat.trend === "up" ? (
                        <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                      )}
                      <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>{stat.change}</span>
                      <span className="ml-1">from last month</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Link href="/admin/orders">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No recent orders found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "completed"
                                  ? "default"
                                  : order.status === "processing"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.amount}</TableCell>
                          <TableCell>
                            <Link href={`/admin/orders/${order.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top Products</CardTitle>
                <Link href="/admin/products">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {topProducts.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No products found</p>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-medium">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-slate-600">{product.sales} sales</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{product.revenue}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Link href="/admin/products">
                  <Button className="h-20 flex-col space-y-2 w-full">
                    <Package className="h-6 w-6" />
                    <span>Add Product</span>
                  </Button>
                </Link>
                <Link href="/admin/orders">
                  <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent w-full">
                    <ShoppingCart className="h-6 w-6" />
                    <span>View Orders</span>
                  </Button>
                </Link>
                <Link href="/admin/customers">
                  <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent w-full">
                    <Users className="h-6 w-6" />
                    <span>Manage Users</span>
                  </Button>
                </Link>
                <Link href="/admin/analytics">
                  <Button variant="outline" className="h-20 flex-col space-y-2 bg-transparent w-full">
                    <TrendingUp className="h-6 w-6" />
                    <span>View Analytics</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
