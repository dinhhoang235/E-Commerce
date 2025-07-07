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
        // Check for existing admin session only on client side
        const checkAdminSession = () => {
            try {
                const savedAdmin = localStorage.getItem("adminUser")
                const accessToken = localStorage.getItem("access_token")
                
                if (savedAdmin && accessToken) {
                    const parsedAdmin = JSON.parse(savedAdmin)
                    setAdminUser(parsedAdmin)
                } else if (savedAdmin && !accessToken) {
                    // Admin data exists but no token, clear the session
                    localStorage.removeItem("adminUser")
                }
            } catch (error) {
                console.error("Error checking admin session:", error)
                // Clear corrupted data
                localStorage.removeItem("adminUser")
                localStorage.removeItem("access_token")
                localStorage.removeItem("refresh_token")
            }
            setIsLoading(false)
        }

        // Only run on client side
        if (typeof window !== 'undefined') {
            checkAdminSession()
        } else {
            setIsLoading(false)
        }
    }, [])

    const adminLogin = async (email: string, password: string): Promise<boolean> => {
        setIsLoading(true)
        
        try {
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
        } catch (error) {
            console.error("Admin login error:", error)
            setIsLoading(false)
            return false
        }
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
