import api from "../api"

export interface SalesData {
  period: string
  revenue: number
  orders: number
  change: string
}

export interface TopProduct {
  name: string
  sales: number
  revenue: number
  views: number
}

export interface CustomerMetric {
  metric: string
  value: string | number
  change: string
  trend: "up" | "down"
}

export interface TrafficSource {
  source: string
  visitors: number
  percentage: number
}

export interface ConversionRate {
  rate: string
  change: string
  trend: "up" | "down"
  today_orders: number
  today_sessions: number
  yesterday_orders: number
  yesterday_sessions: number
}

export interface AnalyticsDashboard {
  salesData: SalesData[]
  topProducts: TopProduct[]
  customerMetrics: CustomerMetric[]
  trafficSources: TrafficSource[]
  conversionRate: ConversionRate
}

export const analyticsService = {
  // Get sales analytics data
  getSalesData: async (): Promise<SalesData[]> => {
    const response = await api.get("/admin/analytics/sales/")
    return response.data
  },

  // Get top performing products
  getTopProducts: async (): Promise<TopProduct[]> => {
    const response = await api.get("/admin/analytics/products/")
    return response.data
  },

  // Get customer metrics
  getCustomerMetrics: async (): Promise<CustomerMetric[]> => {
    const response = await api.get("/admin/analytics/customers/")
    return response.data
  },

  // Get traffic sources
  getTrafficSources: async (): Promise<TrafficSource[]> => {
    const response = await api.get("/admin/analytics/traffic/")
    return response.data
  },

  // Get conversion rate
  getConversionRate: async (): Promise<ConversionRate> => {
    const response = await api.get("/admin/analytics/conversion/")
    return response.data
  },

  // Get all analytics data in one request
  getDashboard: async (): Promise<AnalyticsDashboard> => {
    const response = await api.get("/admin/analytics/dashboard/")
    return response.data
  }
}
