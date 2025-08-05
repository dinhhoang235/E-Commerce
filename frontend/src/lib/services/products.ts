import api from "@/lib/api"

/**
 * Nếu có imageFile thì chuyển sang FormData, ngược lại giữ nguyên.
 */
function buildFormDataIfNeeded(data: any): FormData | any {
  const hasFile = Object.values(data).some((v) => v instanceof File)
  const hasImageFile = 'imageFile' in data

  if (hasFile || hasImageFile) {
    const formData = new FormData()
    for (const key in data) {
      const value = data[key]
      if (value !== undefined) {
        if (value === null) {
          // For null values, append empty string to indicate deletion
          formData.append(key, '')
        } else if (value instanceof File) {
          formData.append(key, value)
        } else if (Array.isArray(value)) {
          // Handle arrays (like features, colors, storage)
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, value.toString())
        }
      }
    }
    return formData
  }

  return data
}

export async function getProductsByCategory(categorySlug: string) {
  try {
    const params = new URLSearchParams()
    if (categorySlug && categorySlug !== 'all') {
      // Search by category slug directly, this will include products from the category
      // and its subcategories based on backend logic
      params.append('category__slug', categorySlug)
    }
    
    const response = await api.get(`/products/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error("Error fetching products by category:", error)
    throw error
  }
}

export async function getAllProducts(categorySlug?: string) {
  try {
    const params = new URLSearchParams()
    if (categorySlug && categorySlug !== 'all') {
      params.append('category__slug', categorySlug)
    }
    
    const response = await api.get(`/products/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error("Error fetching products:", error)
    throw error
  }
}

export async function searchProducts(query: string, limit?: number) {
  try {
    const params = new URLSearchParams()
    if (query.trim()) {
      params.append('search', query.trim())
    }
    if (limit) {
      params.append('limit', limit.toString())
    }
    
    const response = await api.get(`/products/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error("Error searching products:", error)
    throw error
  }
}

export async function createProduct(productData: any) {
  try {
    const payload = buildFormDataIfNeeded(productData)
    const response = await api.post("/products/", payload)
    return response.data
  } catch (error) {
    console.error("Error creating product:", error)
    throw error
  }
}

export async function updateProduct(productId: string, productData: any) {
  try {
    const payload = buildFormDataIfNeeded(productData)
    const response = await api.put(`/products/${productId}/`, payload)
    return response.data
  } catch (error: any) {
    console.error("Error updating product:", error)
    if (error.response?.status === 401) {
      console.error("Authentication required. Please log in.")
    } else if (error.response?.status === 403) {
      console.error("Access forbidden.")
    } else if (error.response?.data) {
      console.error("Server error details:", error.response.data)
    }
    throw error
  }
}

export async function deleteProduct(productId: string) {
  try {
    const response = await api.delete(`/products/${productId}/`)
    return response.data
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

// Product Recommendations API
export async function getProductRecommendations(productId: string) {
  try {
    const response = await api.get(`/products/${productId}/recommendations/`)
    return response.data
  } catch (error) {
    console.error("Error fetching product recommendations:", error)
    throw error
  }
}

export async function getTopSellers() {
  try {
    const response = await api.get("/products/top_sellers/")
    return response.data
  } catch (error) {
    console.error("Error fetching top sellers:", error)
    throw error
  }
}

export async function getNewArrivals() {
  try {
    const response = await api.get("/products/new_arrivals/")
    return response.data
  } catch (error) {
    console.error("Error fetching new arrivals:", error)
    throw error
  }
}

export async function getPersonalizedRecommendations(categoryIds?: string[]) {
  try {
    const params = new URLSearchParams()
    if (categoryIds && categoryIds.length > 0) {
      categoryIds.forEach(id => params.append('categories', id))
    }
    
    const response = await api.get(`/products/personalized/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error("Error fetching personalized recommendations:", error)
    throw error
  }
}
