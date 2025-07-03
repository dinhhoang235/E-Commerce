import api from "@/lib/api"

export interface AdminLoginResponse {
    id: string
    email: string
    name: string
    role: "admin" | "manager"
}

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResponse | null> {
    try {
        const response = await api.post<AdminLoginResponse>("/admin/login/", {
            email,
            password,
        })

        const adminData = response.data
        localStorage.setItem("adminUser", JSON.stringify(adminData))
        return adminData
    } catch (error) {
        console.error("Admin login failed:", error)
        return null
    }
}
