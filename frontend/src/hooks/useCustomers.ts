import { useState, useEffect } from "react"
import CustomersService, { Customer, CustomerListParams } from "@/lib/services/customers"

interface UseCustomersReturn {
  customers: Customer[]
  loading: boolean
  error: string | null
  totalCustomers: number
  totalPages: number
  currentPage: number
  fetchCustomers: (params?: CustomerListParams) => Promise<void>
  refetch: () => Promise<void>
}

interface CustomerStats {
  totalCustomers: number
  activeCustomers: number
  totalRevenue: number
  avgOrderValue: number
}

export function useCustomers(initialParams: CustomerListParams = {}): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [params, setParams] = useState<CustomerListParams>(initialParams)

  const fetchCustomers = async (newParams?: CustomerListParams) => {
    try {
      setLoading(true)
      setError(null)
      
      const searchParams = newParams || params
      setParams(searchParams)
      
      const response = await CustomersService.getCustomers(searchParams)
      
      setCustomers(response.results)
      setTotalCustomers(response.count)
      setTotalPages(response.total_pages)
      setCurrentPage(response.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers")
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => fetchCustomers(params)

  useEffect(() => {
    fetchCustomers()
  }, [])

  return {
    customers,
    loading,
    error,
    totalCustomers,
    totalPages,
    currentPage,
    fetchCustomers,
    refetch
  }
}

export function useCustomerStats() {
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
    avgOrderValue: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const statsData = await CustomersService.getCustomerStats()
        setStats(statsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch customer stats")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, loading, error }
}
