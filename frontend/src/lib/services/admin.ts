import api from "@/lib/api"

export interface AdminLoginResponse {
    id: string
    email: string
    name: string
    role: "admin" | "manager"
    token?: {
        access: string
        refresh: string
    }
}

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResponse | null> {
    try {
        // First, try to get JWT token using the standard token endpoint
        const tokenResponse = await api.post("/token/", {
            username_or_email: email,
            password: password,
        })

        if (tokenResponse.data.access) {
            // Store the tokens for API authentication
            localStorage.setItem("access_token", tokenResponse.data.access)
            localStorage.setItem("refresh_token", tokenResponse.data.refresh)
            console.log("JWT tokens stored successfully for admin authentication")
            
            // Now get admin user info
            const adminResponse = await api.post<AdminLoginResponse>("/admin/login/", {
                email,
                password,
            })

            const adminData = adminResponse.data
            localStorage.setItem("adminUser", JSON.stringify(adminData))
            return adminData
        }
        
        return null
    } catch (error) {
        console.error("Admin login failed:", error)
        // If the token request fails, try to clear any partial state
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("adminUser")
        return null
    }
}
