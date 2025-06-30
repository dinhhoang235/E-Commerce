'use client'

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react'
import { getCurrentUser, register as registerAPI, updateCurrentUser } from '@/lib/services/auth'

type User = {
    id: number
    username: string
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    avatar?: string
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

interface RegisterData {
    username: string
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
}

type AuthContextType = {
    user: User | null
    isAuthenticated: boolean
    login: (tokens: { access: string; refresh: string }) => Promise<void>
    logout: () => void
    register: (userData: RegisterData) => Promise<boolean>
    updateUser: (userData: Partial<User>) => Promise<User>
    setUserData: (userData: User) => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const logout = useCallback(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
    }, [])
    const fetchProfile = useCallback(async () => {
        try {
            const res = await getCurrentUser();
            setUser(res)
        } catch (error) {
            console.error('Failed to fetch profile:', error)
            logout()
        } finally {
            setIsLoading(false)
        }
    }, [logout])
    const login = useCallback(async (tokens: { access: string; refresh: string }) => {
        localStorage.setItem('access_token', tokens.access)
        localStorage.setItem('refresh_token', tokens.refresh)

        await fetchProfile()
    }, [fetchProfile])

    const register = async (userData: RegisterData): Promise<boolean> => {
        setIsLoading(true)
        try {
            const user = await registerAPI({
                username: userData.username,
                email: userData.email,
                password: userData.password,
                confirm_password: userData.password,
                first_name: userData.firstName,
                last_name: userData.lastName,
                phone: userData.phone,
            })

            // Automatically log in after registration
            await login({
                access: localStorage.getItem('access_token') || '',
                refresh: localStorage.getItem('refresh_token') || '',
            })

            return true
        } catch (error) {
            console.error('Registration failed:', error)
            let message = 'Something went wrong.'

            if (error && typeof error === 'object' && 'response' in error) {
                const apiError = error as { response?: { data?: any } }
                const errorData = apiError.response?.data

                // Handle different types of error responses
                if (errorData) {
                    if (typeof errorData === 'string') {
                        message = errorData
                    } else if (errorData.detail) {
                        message = errorData.detail
                    } else if (errorData.username) {
                        message = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username
                    } else if (errorData.email) {
                        message = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
                    } else if (errorData.non_field_errors) {
                        message = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors
                    } else {
                        // Try to get the first error message from any field
                        const firstError = Object.values(errorData)[0]
                        if (firstError) {
                            message = Array.isArray(firstError) ? firstError[0] : firstError
                        }
                    }
                } else {
                    message = 'Registration failed.'
                }
            } else if (error instanceof Error) {
                message = error.message
            }

            alert(message)
        }

        setIsLoading(false)
        return false
    }

    const updateUser = async (userData: Partial<User>) => {
        try {
            const updated = await updateCurrentUser(userData) // gọi API PATCH
            setUser(updated)
            localStorage.setItem("user", JSON.stringify(updated))
            return updated
        } catch (error) {
            console.error("Failed to update user:", error)
            throw error // Re-throw to allow component to handle
        }
    }

    const setUserData = (userData: User) => {
        setUser(userData)
        localStorage.setItem("user", JSON.stringify(userData))
    }

    // Load user on app start
    useEffect(() => {
        const access = localStorage.getItem('access_token')
        if (access) {
            fetchProfile()
        } else {
            setIsLoading(false)
        }
    }, [fetchProfile])

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                login,
                logout,
                register,
                updateUser,
                setUserData,
                isLoading,
            }}
        >
            {!isLoading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}