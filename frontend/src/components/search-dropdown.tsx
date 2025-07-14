"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ArrowRight } from "lucide-react"
import { searchProducts } from "@/lib/services/products"

interface SearchDropdownProps {
  query: string
  isOpen: boolean
  onClose: () => void
  onSelect: (productId: string) => void
}

interface Product {
  id: string | number
  name: string
  description: string
  price: number
  originalPrice?: number
  image?: string
  category: string | { name: string; slug: string }
  rating: number
  reviews: number
  badge?: string
}

export function SearchDropdown({ query, isOpen, onClose, onSelect }: SearchDropdownProps) {
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleProductClick = (productId: string | number) => {
    onSelect(String(productId))
    onClose()
  }

  const handleViewAllClick = () => {
    router.push(`/products?search=${encodeURIComponent(query)}`)
    onClose()
  }

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const performSearch = async () => {
      try {
        setIsLoading(true)
        const response = await searchProducts(query, 6) // Limit to 6 results
        
        let productsArray: Product[] = []
        
        // Handle paginated response structure
        if (response && response.results && Array.isArray(response.results)) {
          productsArray = response.results
        } else if (Array.isArray(response)) {
          productsArray = response
        } else {
          console.error("Unexpected API response format:", response)
          setSearchResults([])
          setIsLoading(false)
          return
        }

        setSearchResults(productsArray)
        setSelectedIndex(-1)
      } catch (error) {
        console.error("Error searching products:", error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the search to avoid too many API calls
    const debounceTimer = setTimeout(performSearch, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || searchResults.length === 0) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          // Allow navigation from -1 to searchResults.length (inclusive)
          setSelectedIndex((prev) => (prev < searchResults.length ? prev + 1 : prev))
          break
        case "ArrowUp":
          e.preventDefault()
          // Allow navigation from searchResults.length to -1 (inclusive)
          setSelectedIndex((prev) => (prev > -1 ? prev - 1 : prev))
          break
        case "Enter":
          e.preventDefault()
          if (selectedIndex === searchResults.length) {
            // View all results (last option)
            handleViewAllClick()
          } else if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            // Select specific product
            const product = searchResults[selectedIndex]
            onSelect(String(product.id))
            onClose()
          } else {
            // No selection, default to view all
            handleViewAllClick()
          }
          break
        case "Escape":
          onClose()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, searchResults, selectedIndex, query, router, onClose, onSelect])

  if (!isOpen || !query.trim()) {
    return null
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[480px] overflow-hidden backdrop-blur-sm"
    >
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Searching products...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <>
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
            <p className="text-xs text-slate-600 font-medium">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{query}"
            </p>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {searchResults.map((product: Product, index: number) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                onClick={() => handleProductClick(product.id)}
                className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-all duration-200 border-b border-slate-50 last:border-b-0 ${
                  selectedIndex === index ? "bg-blue-50 border-blue-100" : ""
                }`}
              >
                <div className="relative w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-semibold text-slate-900 line-clamp-1 text-sm leading-5">
                    {product.name}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                        <span className="text-xs text-slate-400 line-through">
                          ${Number(product.originalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {product.badge && (
                      <Badge className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white font-medium">
                        {product.badge}
                      </Badge>
                    )}
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  selectedIndex === index ? "text-blue-500" : "text-slate-400"
                }`} />
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/50">
            <Button
              variant="ghost"
              className={`w-full justify-between p-4 rounded-none hover:bg-slate-100 transition-colors font-medium ${
                selectedIndex === searchResults.length ? "bg-blue-50 text-blue-700" : "text-slate-700"
              }`}
              onClick={handleViewAllClick}
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                View all results for "{query}"
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium mb-1">No products found</p>
          <p className="text-xs text-slate-500">Try different keywords or check your spelling</p>
        </div>
      )}
    </div>
  )
}
