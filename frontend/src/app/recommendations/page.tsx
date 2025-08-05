import { HomeRecommendations } from "@/components/home-recommendations"

export default function HomePage() {
  // Example: You might get user preferences from auth context or user profile
  const userCategoryPreferences = ["1", "3", "5"] // Example category IDs

  return (
    <div className="container mx-auto px-4 py-8">
      <HomeRecommendations 
        userCategoryPreferences={userCategoryPreferences}
      />
    </div>
  )
}
