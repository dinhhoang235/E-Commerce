"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  MapPin,
  CreditCard,
  Package,
  Globe,
  Check,
  X,
  Loader2,
  Heart,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { WishlistSummary } from "@/components/wishlist-summary"
import { useToast } from "@/hooks/use-toast"
import { AvatarUpload } from "@/components/avatar-upload"
import { 
  checkUsernameAvailability, 
  checkEmailAvailability, 
  changePassword,
  updateAddress,
  createAddress 
} from "@/lib/services/auth"
import { userOrdersApi, type Order } from "@/lib/services/orders"

export default function AccountPage() {
  const { user, logout, updateUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [profileData, setProfileData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    avatar: "",
  })

  const [addressData, setAddressData] = useState({
    address_line1: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [notificationSettings, setNotificationSettings] = useState({
    orderUpdates: true,
    marketingEmails: false,
    securityAlerts: true,
    productUpdates: false,
  })

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: "",
    color: "slate",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    setProfileData({
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone: user.phone || "",
      avatar: user.avatar || "",
    })

    setAddressData({
      address_line1: user.address?.address_line1 || "",
      city: user.address?.city || "",
      state: user.address?.state || "",
      zip_code: user.address?.zip_code || "",
      country: user.address?.country || "",
    })
  }, [user, router])

  // Check username availability when editing
  useEffect(() => {
    if (isEditingProfile && profileData.username !== user?.username) {
      const checkUsername = async () => {
        if (profileData.username.length >= 3) {
          const available = await checkUsernameAvailability(profileData.username)
          setUsernameAvailable(available)
        } else {
          setUsernameAvailable(null)
        }
      }

      const timeoutId = setTimeout(checkUsername, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setUsernameAvailable(null)
    }
  }, [profileData.username, isEditingProfile, user?.username])

  // Check email availability when editing
  useEffect(() => {
    if (isEditingProfile && profileData.email !== user?.email) {
      const checkEmail = async () => {
        if (profileData.email.includes("@")) {
          const available = await checkEmailAvailability(profileData.email)
          setEmailAvailable(available)
        } else {
          setEmailAvailable(null)
        }
      }

      const timeoutId = setTimeout(checkEmail, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setEmailAvailable(null)
    }
  }, [profileData.email, isEditingProfile, user?.email])

  // Password strength checker
  useEffect(() => {
    if (passwordData.newPassword) {
      const password = passwordData.newPassword
      let score = 0
      let feedback = ""
      let color = "red"

      // Length check
      if (password.length >= 8) score += 1
      if (password.length >= 12) score += 1

      // Character variety checks
      if (/[a-z]/.test(password)) score += 1
      if (/[A-Z]/.test(password)) score += 1
      if (/[0-9]/.test(password)) score += 1
      if (/[^A-Za-z0-9]/.test(password)) score += 1

      // Determine strength
      if (score < 3) {
        feedback = "Weak - Add more characters and variety"
        color = "red"
      } else if (score < 5) {
        feedback = "Good - Consider adding special characters"
        color = "yellow"
      } else {
        feedback = "Strong - Great password!"
        color = "green"
      }

      setPasswordStrength({ score, feedback, color })
    } else {
      setPasswordStrength({ score: 0, feedback: "", color: "slate" })
    }
  }, [passwordData.newPassword])

  // Fetch orders when orders tab is accessed
  const fetchOrders = async () => {
    try {
      setIsLoadingOrders(true)
      const userOrders = await userOrdersApi.getMyOrders()
      setOrders(userOrders)
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to load your orders. Please try again.",
        variant: "destructive",
      })
      setOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }

  // Helper function to get status badge variant for orders
  const getOrderStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "default"
      case "processing":
      case "shipped":
        return "secondary"
      case "pending":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  // Helper function to format status display text
  const getOrderStatusDisplay = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  // Helper function to count items in an order
  const getOrderItemCount = (order: Order) => {
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => total + item.quantity, 0)
    }
    return order.products?.length || 0
  }

  const validateProfileForm = () => {
    const newErrors: Record<string, string> = {}

    if (!profileData.username.trim()) {
      newErrors.username = "Username is required"
    } else if (profileData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long"
    } else if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores"
    } else if (usernameAvailable === false) {
      newErrors.username = "Username is already taken"
    }

    if (!profileData.first_name.trim()) {
      newErrors.firstName = "First name is required"
    }
    if (!profileData.last_name.trim()) {
      newErrors.lastName = "Last name is required"
    }
    if (!profileData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = "Please enter a valid email address"
    } else if (emailAvailable === false) {
      newErrors.email = "Email is already registered"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {}

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required"
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required"
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long"
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      newErrors.newPassword = "New password must be different from current password"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return

    try {
      setIsEditingProfile(false)

      // Update user context
      const updatedUser = await updateUser({
        username: profileData.username,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        phone: profileData.phone,
        avatar: profileData.avatar,
      })

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      })

      // Reset availability checks
      setUsernameAvailable(null)
      setEmailAvailable(null)
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
      setIsEditingProfile(true) // Re-enable editing on error
    }
  }

  const handleSaveAddress = async () => {
    if (!user) return

    // Validate required fields
    const requiredFields = ['address_line1', 'city', 'state', 'zip_code', 'country']
    const missingFields = requiredFields.filter(field => !addressData[field as keyof typeof addressData]?.trim())
    
    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      })
      return
    }

    try {
      // Check if user has an existing address
      const hasExistingAddress = user.address && user.address.id

      if (hasExistingAddress) {
        // Update existing address
        await updateAddress(addressData)
        
        // Update user context
        await updateUser({
          address: {
            ...user.address,
            address_line1: addressData.address_line1,
            city: addressData.city,
            state: addressData.state,
            zip_code: addressData.zip_code,
            country: addressData.country,
          },
        })

        toast({
          title: "Address updated",
          description: "Your address has been updated successfully.",
        })
      } else {
        // Create new address with default country if not provided
        const addressToCreate = {
          ...addressData,
          country: addressData.country || 'VN', // Default to Vietnam country code
        }
        
        const newAddress = await createAddress(addressToCreate)
        
        // Update user context with the new address
        await updateUser({
          address: newAddress,
        })

        toast({
          title: "Address created",
          description: "Your address has been created successfully.",
        })
      }
    } catch (error) {
      console.error('Failed to save address:', error)
      toast({
        title: "Error",
        description: "Failed to save address. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return

    try {
      setIsChangingPassword(true)

      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword
      )

      // Reset password form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      })
    } catch (error: any) {
      console.error('Failed to change password:', error)
      
      // Handle API error messages
      let errorMessage = "Failed to change password. Please try again."
      if (error?.response?.data) {
        const errorData = error.response.data
        if (errorData.old_password) {
          errorMessage = Array.isArray(errorData.old_password) ? errorData.old_password[0] : errorData.old_password
        } else if (errorData.new_password) {
          errorMessage = Array.isArray(errorData.new_password) ? errorData.new_password[0] : errorData.new_password
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSaveNotifications = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated.",
    })
  }

  const handleDeleteAccount = () => {
    // In a real app, this would show a confirmation dialog
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      logout()
      router.push("/")
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-slate-600">Manage your account information and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6" onValueChange={(value) => {
          if (value === "orders" && orders.length === 0 && !isLoadingOrders) {
            fetchOrders()
          }
        }}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <AvatarUpload
                  value={profileData.avatar}
                  onChange={(value) => setProfileData((prev) => ({ ...prev, avatar: value }))}
                  userName={`${profileData.first_name} ${profileData.last_name}`}
                />

                <Separator />

                {/* Profile Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, username: e.target.value }))}
                        className={`pr-10 ${
                          errors.username
                            ? "border-red-500"
                            : usernameAvailable === true
                              ? "border-green-500"
                              : usernameAvailable === false
                                ? "border-red-500"
                                : ""
                        }`}
                        disabled={!isEditingProfile}
                      />
                      {isEditingProfile &&
                        profileData.username !== user.username &&
                        profileData.username.length >= 3 && (
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
                    {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
                    {isEditingProfile && profileData.username !== user.username && (
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
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, first_name: e.target.value }))}
                        className={errors.firstName ? "border-red-500" : ""}
                        disabled={!isEditingProfile}
                      />
                      {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, last_name: e.target.value }))}
                        className={errors.lastName ? "border-red-500" : ""}
                        disabled={!isEditingProfile}
                      />
                      {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                        className={`pr-10 ${
                          errors.email
                            ? "border-red-500"
                            : emailAvailable === true
                              ? "border-green-500"
                              : emailAvailable === false
                                ? "border-red-500"
                                : ""
                        }`}
                        disabled={!isEditingProfile}
                      />
                      {isEditingProfile && profileData.email !== user.email && profileData.email.includes("@") && (
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
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                    {isEditingProfile && profileData.email !== user.email && profileData.email.includes("@") && (
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
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditingProfile}
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  {isEditingProfile ? (
                    <>
                      <Button
                        onClick={handleSaveProfile}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={usernameAvailable === false || emailAvailable === false}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingProfile(false)
                          setUsernameAvailable(null)
                          setEmailAvailable(null)
                          setErrors({})
                          // Reset form data
                          setProfileData({
                            username: user.username || "",
                            first_name: user.first_name || "",
                            last_name: user.last_name || "",
                            email: user.email || "",
                            phone: user.phone || "",
                            avatar: user.avatar || "",
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={addressData.address_line1}
                      onChange={(e) => setAddressData((prev) => ({ ...prev, address_line1: e.target.value }))}
                    />
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={addressData.city}
                      onChange={(e) => setAddressData((prev) => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={addressData.state}
                      onChange={(e) => setAddressData((prev) => ({ ...prev, state: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={addressData.zip_code}
                      onChange={(e) => setAddressData((prev) => ({ ...prev, zip_code: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={addressData.country}
                      onChange={(e) => setAddressData((prev) => ({ ...prev, country: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select a country</option>
                      <option value="VN">Vietnam</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="SG">Singapore</option>
                      <option value="JP">Japan</option>
                    </select>
                  </div>
                </div>

                <Button onClick={handleSaveAddress} className="bg-blue-600 hover:bg-blue-700">
                  Save Address
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-slate-500 mb-4">No payment methods saved</p>
                  <Button variant="outline">Add Payment Method</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              {/* Change Password */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="mr-2 h-5 w-5" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        className={errors.currentPassword ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-500" />
                        )}
                      </Button>
                    </div>
                    {errors.currentPassword && <p className="text-sm text-red-500">{errors.currentPassword}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className={errors.newPassword ? "border-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-500" />
                        )}
                      </Button>
                    </div>
                    {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}

                    {/* Password Strength Indicator */}
                    {passwordData.newPassword && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength.color === "red"
                                  ? "bg-red-500"
                                  : passwordStrength.color === "yellow"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                            />
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              passwordStrength.color === "red"
                                ? "border-red-500 text-red-500"
                                : passwordStrength.color === "yellow"
                                  ? "border-yellow-500 text-yellow-500"
                                  : "border-green-500 text-green-500"
                            }
                          >
                            {passwordStrength.color === "red"
                              ? "Weak"
                              : passwordStrength.color === "yellow"
                                ? "Good"
                                : "Strong"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">{passwordStrength.feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className={errors.confirmPassword ? "border-red-500" : ""}
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
                    {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isChangingPassword ? "Changing Password..." : "Change Password"}
                  </Button>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Login Sessions</h3>
                      <p className="text-sm text-slate-600">Manage your active login sessions</p>
                    </div>
                    <Button variant="outline">View Sessions</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Account Recovery</h3>
                      <p className="text-sm text-slate-600">Set up account recovery options</p>
                    </div>
                    <Button variant="outline">Setup Recovery</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Once you delete your account, there is no going back. Please be certain.
                    </AlertDescription>
                  </Alert>
                  <div className="mt-4">
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Order Updates</h3>
                      <p className="text-sm text-slate-600">Get notified about your order status</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.orderUpdates}
                      onChange={(e) => setNotificationSettings((prev) => ({ ...prev, orderUpdates: e.target.checked }))}
                      className="rounded"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Marketing Emails</h3>
                      <p className="text-sm text-slate-600">Receive emails about new products and offers</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.marketingEmails}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, marketingEmails: e.target.checked }))
                      }
                      className="rounded"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Security Alerts</h3>
                      <p className="text-sm text-slate-600">Get notified about security-related activities</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.securityAlerts}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, securityAlerts: e.target.checked }))
                      }
                      className="rounded"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Product Updates</h3>
                      <p className="text-sm text-slate-600">Get notified about new product releases</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.productUpdates}
                      onChange={(e) =>
                        setNotificationSettings((prev) => ({ ...prev, productUpdates: e.target.checked }))
                      }
                      className="rounded"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} className="bg-blue-600 hover:bg-blue-700">
                  Save Preferences
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Profile Visibility</h3>
                      <p className="text-sm text-slate-600">Control who can see your profile information</p>
                    </div>
                    <Button variant="outline">Manage</Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Data Export</h3>
                      <p className="text-sm text-slate-600">Download a copy of your data</p>
                    </div>
                    <Button variant="outline">Export Data</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Order History
                  </div>
                  {orders.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchOrders}
                      disabled={isLoadingOrders}
                    >
                      {isLoadingOrders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Refresh
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>Loading your orders...</span>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <p className="text-slate-500 mb-4">No orders yet</p>
                    <Button variant="outline" asChild>
                      <Link href="/products">Start Shopping</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">Order #{order.id}</h3>
                            <Badge variant={getOrderStatusVariant(order.status)}>
                              {getOrderStatusDisplay(order.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            Placed on {new Date(order.date).toLocaleDateString()}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">
                              {getOrderItemCount(order)} item{getOrderItemCount(order) !== 1 ? "s" : ""}
                            </p>
                            <p className="font-bold">${parseFloat(order.total).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/orders/${order.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {orders.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" asChild>
                          <Link href="/orders">View All Orders ({orders.length})</Link>
                        </Button>
                      </div>
                    )}
                    
                    {orders.length <= 5 && orders.length > 0 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" asChild>
                          <Link href="/orders">View Order History</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wishlist">
            <WishlistSummary />
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-600">
              Need help?{" "}
              <a href="/support" className="text-blue-600 hover:text-blue-700">
                Contact Support
              </a>
            </p>
          </div>
          <Button variant="destructive" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
