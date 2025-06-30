import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Star, Truck, Shield, Headphones } from "lucide-react"

const featuredProducts = [
  {
    id: 1,
    name: "iPhone 15 Pro",
    price: 999,
    originalPrice: 1099,
    image: "/placeholder.svg?height=300&width=300",
    rating: 4.8,
    reviews: 1247,
    badge: "Best Seller",
  },
  {
    id: 2,
    name: "MacBook Air M3",
    price: 1299,
    image: "/placeholder.svg?height=300&width=300",
    rating: 4.9,
    reviews: 892,
    badge: "New",
  },
  {
    id: 3,
    name: 'iPad Pro 12.9"',
    price: 1099,
    image: "/placeholder.svg?height=300&width=300",
    rating: 4.7,
    reviews: 634,
    badge: "Popular",
  },
]

const categories = [
  {
    name: "iPhone",
    image: "/placeholder.svg?height=200&width=200",
    count: "12 models",
    href: "/products?category=iphone",
  },
  {
    name: "iPad",
    image: "/placeholder.svg?height=200&width=200",
    count: "8 models",
    href: "/products?category=ipad",
  },
  {
    name: "MacBook",
    image: "/placeholder.svg?height=200&width=200",
    count: "6 models",
    href: "/products?category=macbook",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700">
                  New Arrivals
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  The Future of
                  <span className="text-blue-400"> Technology</span>
                </h1>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Discover the latest iPhone, iPad, and MacBook models. Experience innovation at its finest with
                  cutting-edge technology and elegant design.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
                  Shop Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 bg-background text-foreground hover:bg-accent hover:text-accent-foreground border border-border"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative">
              <Image
                src="/placeholder.svg?height=500&width=500"
                alt="Latest iPhone"
                width={500}
                height={500}
                className="mx-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Shop by Category</h2>
            <p className="text-slate-600 text-lg">Find the perfect Apple device for your needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {categories.map((category) => (
              <Link key={category.name} href={category.href}>
                <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                  <CardContent className="p-8 text-center">
                    <div className="mb-6">
                      <Image
                        src={category.image || "/placeholder.svg"}
                        alt={category.name}
                        width={200}
                        height={200}
                        className="mx-auto group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                    <p className="text-slate-600">{category.count}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-slate-600 text-lg">Our most popular and newest devices</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="relative mb-4">
                    {product.badge && (
                      <Badge className="absolute top-2 left-2 z-10 bg-red-500 hover:bg-red-600">{product.badge}</Badge>
                    )}
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      width={300}
                      height={300}
                      className="w-full h-64 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-slate-600">({product.reviews})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">${product.price}</span>
                      {product.originalPrice && (
                        <span className="text-lg text-slate-500 line-through">${product.originalPrice}</span>
                      )}
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Free Shipping</h3>
              <p className="text-slate-600">Free shipping on orders over $99</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Warranty</h3>
              <p className="text-slate-600">1-year warranty on all products</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-purple-600" />
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
