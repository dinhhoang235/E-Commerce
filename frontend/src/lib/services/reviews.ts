import api from "@/lib/api";

export interface Review {
  id: number;
  product: number;
  user: number;
  user_name: string;
  user_first_name?: string;
  user_last_name?: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  updated_at: string;
  is_verified_purchase: boolean;
}

export interface CreateReviewRequest {
  product: number;
  rating: number;
  title: string;
  comment: string;
}

export interface UpdateReviewRequest {
  rating: number;
  title: string;
  comment: string;
}

// Helper function to handle API errors consistently
const handleApiError = (error: any, defaultMessage: string) => {
  console.error('API Error:', error);
  
  if (error.response?.status === 401) {
    throw new Error('You must be logged in to perform this action.');
  }
  
  if (error.response?.status === 403) {
    throw new Error('You do not have permission to perform this action.');
  }
  
  if (error.response?.status === 404) {
    throw new Error('The requested review was not found.');
  }
  
  const errorMessage = error.response?.data?.error || 
                      error.response?.data?.detail || 
                      (error.response?.data && typeof error.response.data === 'object' 
                        ? Object.values(error.response.data).join(', ') 
                        : '') ||
                      error.message || 
                      defaultMessage;
  
  throw new Error(errorMessage);
};

// Get all reviews for a product
export const getProductReviews = async (productId: number): Promise<Review[]> => {
  try {
    const response = await api.get(`reviews/?product_id=${productId}`);
    const data = response.data;
    console.log('Reviews API response:', data); // Debug log
    
    // Handle both paginated and non-paginated responses
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        return data;
      } else if (data.results && Array.isArray(data.results)) {
        return data.results;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      }
    }
    
    // If none of the above, return empty array
    console.warn('Unexpected API response format for reviews:', data);
    return [];
  } catch (error) {
    handleApiError(error, 'Failed to load reviews');
    throw error; // This will never be reached but satisfies TypeScript
  }
};

// Create a new review
export const createReview = async (reviewData: CreateReviewRequest): Promise<Review> => {
  try {
    const response = await api.post('reviews/', reviewData);
    return response.data;
  } catch (error: any) {
    handleApiError(error, 'Error creating review');
    throw error; // This will never be reached but satisfies TypeScript
  }
};

// Update a review
export const updateReview = async (reviewId: number, reviewData: UpdateReviewRequest): Promise<Review> => {
  try {
    console.log('Updating review with data:', reviewData); // Debug log
    
    const response = await api.patch(`reviews/${reviewId}/`, reviewData);
    return response.data;
  } catch (error: any) {
    handleApiError(error, 'Error updating review');
    throw error; // This will never be reached but satisfies TypeScript
  }
};

// Delete a review
export const deleteReview = async (reviewId: number): Promise<void> => {
  try {
    await api.delete(`reviews/${reviewId}/`);
  } catch (error: any) {
    handleApiError(error, 'Error deleting review');
  }
};
