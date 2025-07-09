"use client"

import { useState, useEffect } from "react"
import { analyticsService, type AnalyticsDashboard, type SalesData, type TopProduct, type CustomerMetric, type TrafficSource, type ConversionRate } from "@/lib/services/analytics"

export function useAnalytics() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getDashboard()
      setDashboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch analytics data")
      console.error("Analytics fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return {
    dashboard,
    loading,
    error,
    refetch: fetchDashboard
  }
}

export function useSalesData() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await analyticsService.getSalesData()
        setSalesData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch sales data")
      } finally {
        setLoading(false)
      }
    }

    fetchSalesData()
  }, [])

  return { salesData, loading, error }
}

export function useTopProducts() {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await analyticsService.getTopProducts()
        setTopProducts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch top products")
      } finally {
        setLoading(false)
      }
    }

    fetchTopProducts()
  }, [])

  return { topProducts, loading, error }
}

export function useCustomerMetrics() {
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCustomerMetrics = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await analyticsService.getCustomerMetrics()
        setCustomerMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch customer metrics")
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerMetrics()
  }, [])

  return { customerMetrics, loading, error }
}

export function useTrafficSources() {
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrafficSources = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await analyticsService.getTrafficSources()
        setTrafficSources(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch traffic sources")
      } finally {
        setLoading(false)
      }
    }

    fetchTrafficSources()
  }, [])

  return { trafficSources, loading, error }
}

export function useConversionRate() {
  const [conversionRate, setConversionRate] = useState<ConversionRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConversionRate = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await analyticsService.getConversionRate()
        setConversionRate(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch conversion rate")
      } finally {
        setLoading(false)
      }
    }

    fetchConversionRate()
  }, [])

  return { conversionRate, loading, error }
}
