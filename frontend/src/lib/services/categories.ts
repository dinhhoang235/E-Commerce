import api from "@/lib/api";

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

export async function getAllCategories() {
  try {
    const response = await api.get("/categories/");
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

export async function createCategory(categoryData: any) {
  try {
    const payload = buildFormDataIfNeeded(categoryData);
    const response = await api.post("/categories/", payload);
    return response.data;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
}

export async function updateCategory(categoryId: string, categoryData: any) {
  try {
    const payload = buildFormDataIfNeeded(categoryData);
    const response = await api.put(`/categories/${categoryId}/`, payload);
    return response.data;
  } catch (error: any) {
    console.error("Error updating category:", error);
    if (error.response?.status === 401) {
      console.error("Authentication required. Please log in.")
    } else if (error.response?.status === 403) {
      console.error("Access forbidden.")
    } else if (error.response?.data) {
      console.error("Server error details:", error.response.data)
    }
    throw error;
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const response = await api.delete(`/categories/${categoryId}/`);
    return response.data;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}
