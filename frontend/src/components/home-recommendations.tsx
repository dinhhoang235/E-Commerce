"use client"

import { TopSellers } from "@/components/top-sellers"
import { NewArrivals } from "@/components/new-arrivals"
import { PersonalizedRecommendations } from "@/components/personalized-recommendations"

interface HomeRecommendationsProps {
  className?: string
  userCategoryPreferences?: string[]
}

export function HomeRecommendations({ 
  className = "", 
  userCategoryPreferences = []
}: HomeRecommendationsProps) {
  return (
    <div className={`space-y-16 ${className}`}>
      {/* Hero Section - Featured Products */}
      <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Amazing Products
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find the perfect products tailored just for you with our smart recommendations
          </p>
        </div>
      </section>

      {/* Personalized Recommendations - Show first if user has preferences */}
      {userCategoryPreferences.length > 0 && (
        <PersonalizedRecommendations 
          categoryIds={userCategoryPreferences}
          limit={8}
          title="Based on Your Interests"
        />
      )}

      {/* Top Sellers */}
      <TopSellers limit={8} />

      {/* New Arrivals */}
      <NewArrivals limit={8} />

      {/* General Personalized Recommendations */}
      <PersonalizedRecommendations 
        limit={8}
        title="More You Might Like"
      />
    </div>
  )
}
