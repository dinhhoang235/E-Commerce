"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { loginAdmin } from "@/lib/services/admin"

interface AdminUser {
    id: string
    email: string
    name: string
    role: "admin" | "manager"
}

interface AdminContextType {
    adminUser: AdminUser | null
    adminLogin: (email: string, password: string) => Promise<boolean>
    adminLogout: () => void
    isLoading: boolean
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for existing admin session
        const savedAdmin = localStorage.getItem("adminUser")
        const accessToken = localStorage.getItem("access_token")
        
        if (savedAdmin && accessToken) {
            setAdminUser(JSON.parse(savedAdmin))
        } else if (savedAdmin && !accessToken) {
            // Admin data exists but no token, clear the session
            localStorage.removeItem("adminUser")
        }
        setIsLoading(false)
    }, [])

    const adminLogin = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true)

        const result = await loginAdmin(email, password)

        if (result) {
            const adminData: AdminUser = {
                id: result.id,
                email: result.email,
                name: result.name,
                role: result.role,
            }
            setAdminUser(adminData)
            localStorage.setItem("adminUser", JSON.stringify(adminData))
            setIsLoading(false)
            return true
        }
        
        setIsLoading(false)
        return false
    }

    const adminLogout = () => {
        setAdminUser(null)
        localStorage.removeItem("adminUser")
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
    }

    return (
        <AdminContext.Provider
            value={{
                adminUser,
                adminLogin,
                adminLogout,
                isLoading,
            }}
        >
            {children}
        </AdminContext.Provider>
    )
}

export function useAdmin() {
    const context = useContext(AdminContext)
    if (context === undefined) {
        throw new Error("useAdmin must be used within an AdminProvider")
    }
    return context
}
