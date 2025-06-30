"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { checkUsernameAvailability, checkEmailAvailability } from "@/lib/services/auth"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const { register, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length >= 3) {
        try {
          const available = await checkUsernameAvailability(formData.username)
          setUsernameAvailable(available)
        } catch (error) {
          console.error('Error checking username:', error)
          setUsernameAvailable(null)
        }
      } else {
        setUsernameAvailable(null)
      }
    }

    const timeoutId = setTimeout(checkUsername, 300)
    return () => clearTimeout(timeoutId)
  }, [formData.username])

  // Check email availability
  useEffect(() => {
    const checkEmail = async () => {
      if (formData.email.includes("@")) {
        try {
          const available = await checkEmailAvailability(formData.email)
          setEmailAvailable(available)
        } catch (error) {
          console.error('Error checking email:', error)
          setEmailAvailable(null)
        }
      } else {
        setEmailAvailable(null)
      }
    }

    const timeoutId = setTimeout(checkEmail, 300)
    return () => clearTimeout(timeoutId)
  }, [formData.email])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError("Username is required")
      return false
    }
    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long")
      return false
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError("Username can only contain letters, numbers, and underscores")
      return false
    }
    if (usernameAvailable === false) {
      setError("Username is already taken")
      return false
    }
    if (!formData.firstName.trim()) {
      setError("First name is required")
      return false
    }
    if (!formData.lastName.trim()) {
      setError("Last name is required")
      return false
    }
    if (!formData.email.trim()) {
      setError("Email is required")
      return false
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Please enter a valid email address")
      return false
    }
    if (emailAvailable === false) {
      setError("Email is already registered")
      return false
    }
    if (!formData.password) {
      setError("Password is required")
      return false
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    if (!acceptTerms) {
      setError("Please accept the terms and conditions")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) return

    const success = await register({
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    })

    if (success) {
      toast({
        title: "Account created!",
        description: "Welcome to Apple Store. You have been automatically signed in.",
      })
      router.push("/")
    } else {
      setError("Username or email already exists. Please try different credentials.")
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">Sign up to start shopping for Apple products</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`pr-10 ${
                    usernameAvailable === true
                      ? "border-green-500"
                      : usernameAvailable === false
                        ? "border-red-500"
                        : ""
                  }`}
                  required
                />
                {formData.username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameAvailable === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </div>
              {formData.username && (
                <p
                  className={`text-xs ${
                    usernameAvailable === true
                      ? "text-green-600"
                      : usernameAvailable === false
                        ? "text-red-600"
                        : "text-slate-500"
                  }`}
                >
                  {usernameAvailable === true
                    ? "Username is available"
                    : usernameAvailable === false
                      ? "Username is already taken"
                      : "Checking availability..."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`pr-10 ${
                    emailAvailable === true ? "border-green-500" : emailAvailable === false ? "border-red-500" : ""
                  }`}
                  required
                />
                {formData.email.includes("@") && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {emailAvailable === true ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : emailAvailable === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </div>
              {formData.email.includes("@") && (
                <p
                  className={`text-xs ${
                    emailAvailable === true
                      ? "text-green-600"
                      : emailAvailable === false
                        ? "text-red-600"
                        : "text-slate-500"
                  }`}
                >
                  {emailAvailable === true
                    ? "Email is available"
                    : emailAvailable === false
                      ? "Email is already registered"
                      : "Checking availability..."}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm">
                I agree to the{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || usernameAvailable === false || emailAvailable === false}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
