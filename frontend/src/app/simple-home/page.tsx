"use client"

import Link from "next/link"
import { TopSellers } from "@/components/top-sellers"
import { NewArrivals } from "@/components/new-arrivals"
import { PersonalizedRecommendations } from "@/components/personalized-recommendations"

export default function SimpleHomePage() {
  // Example: You might get user preferences from auth context or user profile
  const userCategoryPreferences = ["1", "3", "5"] // Example category IDs from user's browsing history

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="text-center space-y-8">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Discover Amazing
              <span className="text-blue-400 block lg:inline"> Products</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Find the perfect products with our smart recommendations tailored just for you
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300">
                  Shop Now
                </button>
              </Link>
              <Link href="/discover">
                <button className="bg-transparent border border-white text-white hover:bg-white hover:text-slate-900 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300">
                  Explore Recommendations
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Personalized Recommendations - Show first if user has preferences */}
      {userCategoryPreferences.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-pink-50 to-rose-50">
          <PersonalizedRecommendations 
            categoryIds={userCategoryPreferences}
            limit={6}
            title="Based on Your Interests"
            className="container mx-auto px-4"
          />
        </section>
      )}

      {/* Top Sellers */}
      <section className="py-20 bg-white">
        <TopSellers 
          limit={6} 
          className="container mx-auto px-4"
        />
      </section>

      {/* New Arrivals */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <NewArrivals 
          limit={6} 
          className="container mx-auto px-4"
        />
      </section>

      {/* Quick Navigation */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Explore More</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Link href="/products?filter=top_sellers">
              <button className="w-full bg-transparent border border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-white px-6 py-3 rounded-lg transition-all duration-300">
                🔥 View All Top Sellers
              </button>
            </Link>
            <Link href="/products?filter=new_arrivals">
              <button className="w-full bg-transparent border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-6 py-3 rounded-lg transition-all duration-300">
                ✨ See All New Arrivals
              </button>
            </Link>
            <Link href="/discover">
              <button className="w-full bg-transparent border border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-white px-6 py-3 rounded-lg transition-all duration-300">
                💖 Discover More
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Free Shipping</h3>
              <p className="text-slate-600">Free shipping on orders over $99</p>
            </div>
            <div>
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Warranty</h3>
              <p className="text-slate-600">1-year warranty on all products</p>
            </div>
            <div>
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎧</span>
              </div>
              <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
              <p className="text-slate-600">Round-the-clock customer support</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
