import api from "@/lib/api";

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
    const response = await api.post("/categories/", categoryData);
    return response.data;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
}

export async function updateCategory(categoryId: string, categoryData: any) {
  try {
    const response = await api.put(`/categories/${categoryId}/`, categoryData);
    return response.data;
  } catch (error) {
    console.error("Error updating category:", error);
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
