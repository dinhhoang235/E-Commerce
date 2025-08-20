"use client"

import type React from "react"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, ShoppingCart, Menu, Heart, LogOut, Settings, Package } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { useWishlist } from "@/components/wishlist-provider"
import { useAuth } from "@/components/auth-provider"
import { SearchDropdown } from "@/components/search-dropdown"

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [mobileSearchQuery, setMobileSearchQuery] = useState("")
  const [isMobileSearchDropdownOpen, setIsMobileSearchDropdownOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { items } = useCart()
  const { total: wishlistCount } = useWishlist()
  const { user, logout } = useAuth()
  const router = useRouter()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase() || 'U'
  }

  // Handle clicks outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false)
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setIsMobileSearchDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`)
      setSearchQuery("")
      setMobileSearchQuery("")
      setIsSearchDropdownOpen(false)
      setIsMobileSearchDropdownOpen(false)
      setIsMobileSearchOpen(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(searchQuery)
  }

  const handleMobileSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(mobileSearchQuery)
  }

  const handleProductSelect = (productId: string) => {
    router.push(`/products/${productId}`)
    setSearchQuery("")
    setMobileSearchQuery("")
    setIsSearchDropdownOpen(false)
    setIsMobileSearchDropdownOpen(false)
    setIsMobileSearchOpen(false)
  }

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value)
    setIsSearchDropdownOpen(value.trim().length > 0)
  }

  const handleMobileSearchInputChange = (value: string) => {
    setMobileSearchQuery(value)
    setIsMobileSearchDropdownOpen(value.trim().length > 0)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
              <span className="font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-xl">Apple Store</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/products?category=iphone"
              className="text-sm font-medium hover:text-blue-600 transition-colors"
            >
              iPhone
            </Link>
            <Link href="/products?category=ipad" className="text-sm font-medium hover:text-blue-600 transition-colors">
              iPad
            </Link>
            <Link
              href="/products?category=macbook"
              className="text-sm font-medium hover:text-blue-600 transition-colors"
            >
              MacBook
            </Link>
            <Link href="/products" className="text-sm font-medium hover:text-blue-600 transition-colors">
              All Products
            </Link>
          </nav>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 max-w-md mx-8">
            <div ref={searchRef} className="relative w-full">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  className="pl-10 pr-4"
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) {
                      setIsSearchDropdownOpen(true)
                    }
                  }}
                />
              </form>
              <SearchDropdown
                query={searchQuery}
                isOpen={isSearchDropdownOpen}
                onClose={() => setIsSearchDropdownOpen(false)}
                onSelect={handleProductSelect}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Mobile Search */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Wishlist */}
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="hidden sm:flex relative">
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <Badge className="absolute -right-2 -top-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600">
                    {wishlistCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex items-center space-x-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || "/placeholder-user.jpg"} alt={`${user.first_name} ${user.last_name}`} />
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{user.first_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders">
                      <Package className="mr-2 h-4 w-4" />
                      Order History
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Cart */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-600">
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Shopping Cart ({itemCount})</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {items.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">Your cart is empty</p>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.itemId} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden">
                            <img 
                              src={item.image || "/placeholder.jpg"} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.jpg";
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <div className="text-sm text-slate-500 space-y-1">
                              <p>Qty: {item.quantity}</p>
                              {item.color && <p>Color: {item.color}</p>}
                              {item.storage && <p>Storage: {item.storage}</p>}
                            </div>
                            <p className="font-bold">${typeof item.price === 'number' ? (item.price * item.quantity).toFixed(2) : '0.00'}</p>
                          </div>
                        </div>
                      ))}
                      <div className="space-y-2 mt-6">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                          <Link href="/checkout" onClick={() => setIsCartOpen(false)}>Checkout</Link>
                        </Button>
                        <Button variant="outline" className="w-full bg-transparent" asChild>
                          <Link href="/cart" onClick={() => setIsCartOpen(false)}>View Cart</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 mt-6">
                  <Link href="/products?category=iphone" className="text-lg font-medium">
                    iPhone
                  </Link>
                  <Link href="/products?category=ipad" className="text-lg font-medium">
                    iPad
                  </Link>
                  <Link href="/products?category=macbook" className="text-lg font-medium">
                    MacBook
                  </Link>
                  <Link href="/products" className="text-lg font-medium">
                    All Products
                  </Link>
                  {user && (
                    <>
                      <hr className="my-4" />
                      <Link href="/wishlist" className="text-lg font-medium flex items-center">
                        <Heart className="w-5 h-5 mr-2" />
                        Wishlist
                        {wishlistCount > 0 && (
                          <Badge className="ml-2 bg-red-500 hover:bg-red-600">
                            {wishlistCount}
                          </Badge>
                        )}
                      </Link>
                    </>
                  )}
                  {!user && (
                    <>
                      <hr className="my-4" />
                      <Link href="/login" className="text-lg font-medium">
                        Sign In
                      </Link>
                      <Link href="/register" className="text-lg font-medium">
                        Sign Up
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isMobileSearchOpen && (
          <div className="lg:hidden border-t bg-white p-4">
            <div ref={mobileSearchRef} className="relative">
              <form onSubmit={handleMobileSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  className="pl-10 pr-4"
                  value={mobileSearchQuery}
                  onChange={(e) => handleMobileSearchInputChange(e.target.value)}
                  autoFocus
                />
              </form>
              <SearchDropdown
                query={mobileSearchQuery}
                isOpen={isMobileSearchDropdownOpen}
                onClose={() => setIsMobileSearchDropdownOpen(false)}
                onSelect={handleProductSelect}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
