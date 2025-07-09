import api from "@/lib/api"

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  location: string
  orders: number
  totalSpent: number
  joinDate: string
  status: "active" | "inactive"
}

export interface CustomerListResponse {
  count: number
  page: number
  page_size: number
  total_pages: number
  results: Customer[]
}

export interface CustomerListParams {
  search?: string
  status?: "active" | "inactive"
  page?: number
  page_size?: number
}

export class CustomersService {
  static async getCustomers(params: CustomerListParams = {}): Promise<CustomerListResponse> {
    const response = await api.get("/users/customers/", { params })
    return response.data
  }

  static async getCustomerStats() {
    const customers = await this.getCustomers({ page_size: 1000 }) // Get all customers for stats
    const totalCustomers = customers.count
    const activeCustomers = customers.results.filter(c => c.status === "active").length
    const totalRevenue = customers.results.reduce((sum, c) => sum + c.totalSpent, 0)
    const totalOrders = customers.results.reduce((sum, c) => sum + c.orders, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return {
      totalCustomers,
      activeCustomers,
      totalRevenue,
      avgOrderValue
    }
  }
}

export default CustomersService
