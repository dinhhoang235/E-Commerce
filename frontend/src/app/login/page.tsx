"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, User, Mail } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { login as loginApi } from "@/lib/services/auth"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const { login, isLoading } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("") // Clear previous errors
        
        try {
            const token = await loginApi({
                username_or_email: email,
                password
            })
            await login({
                access: token.access,
                refresh: token.refresh,
            })
            toast({
                title: "Welcome back!",
                description: "You have been successfully signed in.",
            })
            router.push("/")
        } catch (error: unknown) {
            console.error("Login failed:", error)
            let message = "Something went wrong."
            if (error instanceof Error) {
                message = error.message
            } else if (error && typeof error === 'object' && 'response' in error) {
                const apiError = error as { response?: { data?: { detail?: string } } }
                message = apiError.response?.data?.detail || "Login failed."
            }
            setError(message) // Use error state instead of alert
        }
    }

    // Clear error when user starts typing
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value)
        if (error) setError("")
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value)
        if (error) setError("")
    }

    return (
        <div className="container mx-auto px-4 py-16 flex justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
                    <CardDescription className="text-center">
                        Enter your username or email and password to access your account
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="usernameOrEmail">Username or Email</Label>
                            <div className="relative">
                                <Input
                                    id="usernameOrEmail"
                                    type="text"
                                    placeholder="Enter username or email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className="pl-10"
                                    required
                                />
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                    {email.includes('@') ? <Mail className="h-4 w-4 text-slate-500" /> : <User className="h-4 w-4 text-slate-500" />}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-slate-500" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-slate-500" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>

                        <div className="text-center text-sm">
                            {"Don't have an account? "}
                            <Link href="/register" className="text-blue-600 hover:underline font-medium">
                                Sign up
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}