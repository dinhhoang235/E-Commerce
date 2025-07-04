import api from "@/lib/api";

export async function getallProducts() {
  try {
    const response = await api.get("/products/");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

export async function createProduct(productData : any) {
  try {
    const response = await api.post("/products/", productData);
    return response.data;
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
}

export async function updateProduct(productId: string, productData: any) {
  try {
    const response = await api.put(`/products/${productId}/`, productData);
    return response.data;
  } catch (error: any) {
    console.error("Error updating product:", error);
    if (error.response?.status === 401) {
      console.error("Authentication required. Please log in.");
    } else if (error.response?.status === 403) {
      console.error("Access forbidden. You don't have permission to update this product.");
    } else if (error.response?.data) {
      console.error("Server error details:", error.response.data);
    }
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  try {
    const response = await api.delete(`/products/${productId}/`);
    return response.data;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}
