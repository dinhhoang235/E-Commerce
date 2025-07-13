import api from "@/lib/api"

export interface RegisterPayload {
    username: string
    password: string
    confirm_password: string
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
}

export interface LoginPayload {
    username_or_email: string
    password: string
}

export interface TokenResponse {
    access: string
    refresh: string
}

export interface User {
    id: number
    username: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    avatar?: string
    token?: TokenResponse
    address?: {
        id?: number
        first_name?: string
        last_name?: string
        phone?: string
        address_line1: string
        city: string
        state: string
        zip_code: string
        country: string
        is_default?: boolean
        created_at?: string
    }
}

// Hàm đăng ký
export async function register(payload: RegisterPayload): Promise<User> {
    const res = await api.post<User>("/register/", payload, {
        withCredentials: false,
    })

    const user = res.data
    if (user.token) {
        localStorage.setItem("access_token", user.token.access)
        localStorage.setItem("refresh_token", user.token.refresh)
    }

    return user
}

// Hàm đăng nhập
export async function login(payload: LoginPayload): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>("/token/", payload)
    const token = res.data

    localStorage.setItem("access_token", token.access)
    localStorage.setItem("refresh_token", token.refresh)

    return token
}

// Lấy thông tin người dùng hiện tại
export async function getCurrentUser(): Promise<User> {
    const res = await api.get<User>("/users/me/account/")
    return res.data
}

export async function updateCurrentUser(data: Partial<User>): Promise<User> {
  const res = await api.patch<User>("/users/me/account/", data)
  return res.data
}

// Update address
export async function updateAddress(addressData: any): Promise<any> {
  const res = await api.patch("/users/me/account/", { address: addressData })
  return res.data
}

// Create address
export async function createAddress(addressData: any): Promise<any> {
  try {
    // Map country names to country codes if needed
    const countryMapping: Record<string, string> = {
      'Vietnam': 'VN',
      'United States': 'US',
      'Japan': 'JP',
      'VN': 'VN',
      'US': 'US', 
      'JP': 'JP'
    }
    
    // Ensure country is in the correct format
    const processedData = {
      ...addressData,
      country: countryMapping[addressData.country] || addressData.country || 'VN'
    }
    
    console.log('Sending address data:', processedData)
    const res = await api.post("/addresses/", processedData)
    return res.data
  } catch (error: any) {
    // Log the detailed error for debugging
    console.error('Create address error:', error.response?.data)
    throw error
  }
}

// change password
export async function changePassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    await api.post("/users/change_password/", {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
    });
}

// Check username availability
export async function checkUsernameAvailability(username: string): Promise<boolean> {
    try {
        const res = await api.get<{ username: string; available: boolean }>(`/check-username/?username=${encodeURIComponent(username)}`)
        return res.data.available
    } catch (error) {
        console.error('Error checking username availability:', error)
        return false // Conservative approach - assume not available on error
    }
}

// Check email availability
export async function checkEmailAvailability(email: string): Promise<boolean> {
    try {
        const res = await api.get<{ email: string; available: boolean }>(`/check-email/?email=${encodeURIComponent(email)}`)
        return res.data.available
    } catch (error) {
        console.error('Error checking email availability:', error)
        return false // Conservative approach - assume not available on error
    }
}

// Upload avatar
export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData()
  formData.append('avatarFile', file)
  
  const res = await api.patch<User>("/users/me/account/", formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return res.data
}

// Remove avatar
export async function removeAvatar(): Promise<User> {
  const res = await api.patch<User>("/users/me/account/", { avatar: "" })
  return res.data
}