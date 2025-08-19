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

// Product Color APIs
export async function getAllColors() {
  try {
    const response = await api.get("/product-colors/")
    return response.data
  } catch (error) {
    console.error("Error fetching colors:", error)
    throw error
  }
}

export async function createColor(colorData: any) {
  try {
    const response = await api.post("/product-colors/", colorData)
    return response.data
  } catch (error) {
    console.error("Error creating color:", error)
    throw error
  }
}

// Product Variant APIs
export async function getAllVariants(productId?: string) {
  try {
    const params = new URLSearchParams()
    if (productId) {
      params.append('product_id', productId)
    }
    
    const response = await api.get(`/product-variants/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error("Error fetching variants:", error)
    throw error
  }
}

export async function getProductVariants(productId: string) {
  try {
    const response = await api.get(`/products/${productId}/variants/`)
    return response.data
  } catch (error) {
    console.error("Error fetching product variants:", error)
    throw error
  }
}

export async function createVariant(variantData: any) {
  try {
    const response = await api.post("/product-variants/", variantData)
    return response.data
  } catch (error) {
    console.error("Error creating variant:", error)
    throw error
  }
}

export async function updateVariant(variantId: string, variantData: any) {
  try {
    const response = await api.put(`/product-variants/${variantId}/`, variantData)
    return response.data
  } catch (error) {
    console.error("Error updating variant:", error)
    throw error
  }
}

export async function deleteVariant(variantId: string) {
  try {
    const response = await api.delete(`/product-variants/${variantId}/`)
    return response.data
  } catch (error) {
    console.error("Error deleting variant:", error)
    throw error
  }
}

export async function reduceVariantStock(variantId: string, quantity: number) {
  try {
    const response = await api.post(`/product-variants/${variantId}/reduce_stock/`, { quantity })
    return response.data
  } catch (error) {
    console.error("Error reducing variant stock:", error)
    throw error
  }
}

export async function increaseVariantStock(variantId: string, quantity: number) {
  try {
    const response = await api.post(`/product-variants/${variantId}/increase_stock/`, { quantity })
    return response.data
  } catch (error) {
    console.error("Error increasing variant stock:", error)
    throw error
  }
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
