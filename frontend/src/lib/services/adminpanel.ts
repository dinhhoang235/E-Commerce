import api from "../api"

// Types for admin dashboard data
export interface DashboardStats {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: string
}

export interface RecentOrder {
  id: string
  customer: string
  product: string
  amount: string
  status: "completed" | "processing" | "shipped" | "pending"
  date: string
}

export interface TopProduct {
  name: string
  sales: number
  revenue: number // Keep as number for API response, format when needed
}

export interface SalesData {
  period: string
  revenue: number
  orders: number
  change: string
}

export interface CustomerMetric {
  metric: string
  value: string | number
  change: string
  trend: "up" | "down"
}

export interface AnalyticsDashboard {
  salesData: SalesData[]
  topProducts: TopProduct[]
  customerMetrics: CustomerMetric[]
  trafficSources: any[]
  conversionRate: any
}

// API Functions
export const adminPanelApi = {
  // Get comprehensive dashboard data
  getDashboardData: async (): Promise<AnalyticsDashboard> => {
    const response = await api.get("/admin/analytics/dashboard/")
    return response.data
  },

  // Get sales analytics
  getSalesAnalytics: async (): Promise<SalesData[]> => {
    const response = await api.get("/admin/analytics/sales/")
    return response.data
  },

  // Get top products
  getTopProducts: async (): Promise<TopProduct[]> => {
    const response = await api.get("/admin/analytics/products/")
    return response.data
  },

  // Get customer metrics
  getCustomerMetrics: async (): Promise<CustomerMetric[]> => {
    const response = await api.get("/adminpanel/analytics/customers/")
    return response.data
  },

  // Get recent orders (from orders API)
  getRecentOrders: async (limit = 10): Promise<RecentOrder[]> => {
    const response = await api.get(`/orders/admin/?limit=${limit}`)
    
    // Transform the backend data to match frontend interface
    return response.data.results?.map((order: any) => {
      // Improved customer name fallback logic
      let customerName = 'Unknown';
      
      // Try to use the customer field from backend (which uses improved customer_name property)
      if (order.customer && order.customer.trim()) {
        customerName = order.customer;
      }
      // Fallback to user data if available
      else if (order.user) {
        const user = order.user;
        
        // Try account first_name and last_name
        if (user.account?.first_name || user.account?.last_name) {
          customerName = `${user.account.first_name || ''} ${user.account.last_name || ''}`.trim();
        }
        // Try user first_name and last_name
        else if (user.first_name || user.last_name) {
          customerName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
        // Try username
        else if (user.username) {
          customerName = user.username;
        }
        // Try email as last resort
        else if (user.email) {
          customerName = user.email;
        }
      }

      return {
        id: order.id,
        customer: customerName,
        product: order.products?.[0] || order.items?.[0]?.product_variant_name || 'Multiple items',
        amount: `$${parseFloat(order.total).toFixed(2)}`,
        status: order.status,
        date: new Date(order.date).toISOString().split('T')[0]
      };
    }) || []
  },

  // Get order statistics
  getOrderStats: async () => {
    const response = await api.get("/orders/admin/stats/")
    return response.data
  },

  // Admin login
  login: async (email: string, password: string) => {
    const response = await api.post("/admin/login/", {
      email,
      password
    })
    return response.data
  },

  // Store settings
  getStoreSettings: async () => {
    const response = await api.get("/admin/settings/")
    return response.data
  },

  updateStoreSettings: async (settings: any) => {
    const response = await api.put("/admin/settings/", settings)
    return response.data
  }
}

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Helper function to calculate dashboard stats from API data
export const transformToDashboardStats = (analyticsData: AnalyticsDashboard): DashboardStats[] => {
  const currentMonth = analyticsData.salesData.find(d => d.period === "This Month")
  const customerMetrics = analyticsData.customerMetrics
  
  const totalCustomers = customerMetrics.find(m => m.metric === "New Customers")
  const totalProducts = analyticsData.topProducts.length

  return [
    {
      title: "Total Revenue",
      value: formatCurrency(currentMonth?.revenue || 0),
      change: currentMonth?.change || "0%",
      trend: currentMonth?.change?.startsWith('+') ? "up" : "down",
      icon: "DollarSign"
    },
    {
      title: "Total Orders",
      value: (currentMonth?.orders || 0).toString(),
      change: currentMonth?.change || "0%",
      trend: currentMonth?.change?.startsWith('+') ? "up" : "down",
      icon: "ShoppingCart"
    },
    {
      title: "Total Products",
      value: totalProducts.toString(),
      change: "+2.5%", // This would come from product analytics
      trend: "up",
      icon: "Package"
    },
    {
      title: "Total Customers",
      value: (totalCustomers?.value || 0).toString(),
      change: totalCustomers?.change || "0%",
      trend: totalCustomers?.trend || "up",
      icon: "Users"
    }
  ]
}
