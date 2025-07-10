import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Define Category interface
interface Category {
  id: string | number
  name: string
  slug: string
}

interface Product {
  id: string | number
  name: string
  description: string
  specs?: Record<string, string>
  category: string | Category
  features?: string[]
}

interface ProductSpecsProps {
  product: Product
}

export function ProductSpecs({ product }: ProductSpecsProps) {
  // Get specifications from the product data or generate fallback specifications
  const getSpecifications = () => {
    // If product has specs field, use that first
    if (product.specs && Object.keys(product.specs).length > 0) {
      return product.specs;
    }
    
    // Get category slug for fallback specifications
    const categorySlug = typeof product.category === 'object' ? product.category.slug : product.category;
    
    // Fallback specifications based on product category
    switch (categorySlug) {
      case "iphone":
        return {
          Display: `Super Retina XDR display, ${product.name.includes("Pro Max") ? "6.7" : product.name.includes("Pro") ? "6.1" : "6.1"} inch`,
          Chip: product.name.includes("15") ? "A17 Pro chip" : "A16 Bionic chip",
          Camera: product.name.includes("Pro") ? "48MP Main, Ultra Wide, Telephoto" : "12MP Dual camera system",
          "Front Camera": "12MP TrueDepth camera",
          "Water Resistance": "IP68 (maximum depth of 6 meters up to 30 minutes)",
          Battery: "Up to 29 hours video playback",
          "Operating System": "iOS 17",
        }
      case "ipad":
        return {
          Display: `${product.name.includes("Pro") ? "Liquid Retina XDR" : "Liquid Retina"} display`,
          Chip: product.name.includes("M2") ? "M2 chip" : product.name.includes("Air") ? "M1 chip" : "A14 Bionic chip",
          Camera: "12MP Wide camera",
          "Front Camera": "12MP Ultra Wide front camera",
          "Operating System": "iPadOS 17",
        }
      case "macbook":
        return {
          Display: `Liquid Retina display`,
          Chip: product.name.includes("M3") ? "M3 chip" : "M2 chip",
          Memory: "Up to 24GB unified memory",
          Storage: "Up to 2TB SSD storage",
          "Operating System": "macOS Sonoma",
        }
      default:
        // If we can't determine the category, try to generate specs from product features
        if (product.features && product.features.length > 0) {
          const featureSpecs: Record<string, string> = {};
          product.features.forEach((feature, index) => {
            const key = `Feature ${index + 1}`;
            featureSpecs[key] = feature;
          });
          return featureSpecs;
        }
        return {};
    }
  }

  const specifications = getSpecifications()

  // Check if we have any specifications to display
  const hasSpecifications = specifications && Object.keys(specifications).length > 0;

  if (!hasSpecifications) {
    return (
      <div className="py-4 text-center text-slate-500">
        No specifications available for this product.
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Specification</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(specifications).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{key}</TableCell>
              <TableCell>{value || "N/A"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
