import Link from "next/link"
import { Facebook, Twitter, Instagram, Youtube } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-white text-slate-900 p-2 rounded-lg">
                <span className="font-bold text-lg">A</span>
              </div>
              <span className="font-bold text-xl">Apple Store</span>
            </div>
            <p className="text-slate-400">
              Your trusted destination for the latest Apple products with exceptional service and support.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Products</h3>
            <div className="space-y-2">
              <Link
                href="/products?category=iphone"
                className="block text-slate-400 hover:text-white transition-colors"
              >
                iPhone
              </Link>
              <Link href="/products?category=ipad" className="block text-slate-400 hover:text-white transition-colors">
                iPad
              </Link>
              <Link
                href="/products?category=macbook"
                className="block text-slate-400 hover:text-white transition-colors"
              >
                MacBook
              </Link>
              <Link href="/products" className="block text-slate-400 hover:text-white transition-colors">
                All Products
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Support</h3>
            <div className="space-y-2">
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                Contact Us
              </Link>
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                Shipping Info
              </Link>
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                Returns
              </Link>
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                Warranty
              </Link>
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                FAQ
              </Link>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Company</h3>
            <div className="space-y-2">
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                About Us
              </Link>
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                Careers
              </Link>
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="block text-slate-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
          <p>&copy; 2024 Apple Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
