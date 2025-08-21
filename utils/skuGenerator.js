import Product from '../models/product.model.js'

/**
 * Robust SKU Generator for E-commerce Products
 * Generates unique, meaningful, and collision-resistant SKUs
 */

// Category code mappings for jewelry and fashion
const CATEGORY_CODES = {
  'Fashion': 'FSH',
  'Electronics': 'ELE',
  'Beauty': 'BTY',
  'Home & Garden': 'HGD',
  'Sports': 'SPT',
  'Books': 'BOK',
  'Toys': 'TOY',
  'Health': 'HTH',
  'Food': 'FOD',
  'Automotive': 'AUT',
  'Baby & Kids': 'BKD',
  'Pet Supplies': 'PET'
}

// Subcategory code mappings for jewelry
const SUBCATEGORY_CODES = {
  // Fashion subcategories
  'Necklaces': 'NCK',
  'Earrings': 'EAR',
  'Bracelets': 'BRC',
  'Rings': 'RNG',
  'Bangles': 'BNG',
  'Anklets': 'ANK',
  'Brooches': 'BRO',
  'Pendants': 'PND',
  'Chains': 'CHN',
  'Sets': 'SET',
  'Watches': 'WTC',
  'Sunglasses': 'SUN',
  'Bags': 'BAG',
  'Shoes': 'SHO',
  'Dresses': 'DRS',
  'Tops': 'TOP',
  'Bottoms': 'BTM',
  'Outerwear': 'OUT',
  'Accessories': 'ACC',
  'Traditional': 'TRD',
  // Electronics subcategories
  'Smartphones': 'SMT',
  'Laptops': 'LPT',
  'Tablets': 'TAB',
  'Cameras': 'CAM',
  'Audio': 'AUD',
  'Gaming': 'GAM',
  'Smart Home': 'SMH',
  'Wearables': 'WER',
  // Beauty subcategories
  'Skincare': 'SKN',
  'Makeup': 'MKP',
  'Haircare': 'HRC',
  'Fragrance': 'FRG',
  'Tools': 'TLS'
}

// Material code mappings for jewelry
const MATERIAL_CODES = {
  'Gold': 'GLD',
  'Silver': 'SLV',
  'Platinum': 'PLT',
  'Diamond': 'DMD',
  'Pearl': 'PRL',
  'Ruby': 'RBY',
  'Emerald': 'EMR',
  'Sapphire': 'SPH',
  'Stainless Steel': 'SST',
  'Titanium': 'TTN',
  'Copper': 'CPR',
  'Brass': 'BRS',
  'Rose Gold': 'RGD',
  'White Gold': 'WGD',
  'Yellow Gold': 'YGD',
  'Sterling Silver': 'SSL',
  'Gemstone': 'GEM',
  'Crystal': 'CRY',
  'Alloy': 'ALY',
  'Leather': 'LTH',
  'Fabric': 'FBR',
  'Plastic': 'PLS',
  'Wood': 'WOD',
  'Ceramic': 'CER',
  'Glass': 'GLS'
}

// Brand code mappings
const getBrandCode = (brandName) => {
  if (!brandName) return 'UNB' // Unknown Brand
  
  // Remove common words and get initials
  const cleanBrand = brandName
    .replace(/\b(inc|ltd|llc|corp|company|co|&|and)\b/gi, '')
    .trim()
  
  if (cleanBrand.length <= 3) {
    return cleanBrand.toUpperCase().padEnd(3, 'X')
  }
  
  // Get first 3 characters or first letters of words
  const words = cleanBrand.split(/\s+/).filter(word => word.length > 0)
  if (words.length >= 2) {
    return words.slice(0, 3).map(word => word.charAt(0)).join('').toUpperCase().padEnd(3, 'X')
  }
  
  return cleanBrand.substring(0, 3).toUpperCase()
}

// Generate material code from product name or tags
const getMaterialCode = (productName, tags = []) => {
  const searchText = `${productName} ${tags.join(' ')}`.toLowerCase()
  
  // Check for materials in order of priority
  const materialPriority = [
    'diamond', 'platinum', 'gold', 'silver', 'pearl', 'ruby', 'emerald', 'sapphire',
    'stainless steel', 'titanium', 'sterling silver', 'rose gold', 'white gold', 'yellow gold',
    'gemstone', 'crystal', 'copper', 'brass', 'alloy', 'leather', 'fabric', 'wood', 'ceramic'
  ]
  
  for (const material of materialPriority) {
    if (searchText.includes(material.toLowerCase())) {
      return MATERIAL_CODES[material.charAt(0).toUpperCase() + material.slice(1)] || 
             MATERIAL_CODES[material.toUpperCase()] ||
             material.substring(0, 3).toUpperCase()
    }
  }
  
  return 'GEN' // Generic material
}

// Generate sequential number with collision detection
const generateSequentialNumber = async (prefix) => {
  let attempts = 0
  const maxAttempts = 1000
  
  while (attempts < maxAttempts) {
    // Start from a random number to avoid predictable sequences
    const baseNumber = Math.floor(Math.random() * 9000) + 1000 // 4-digit number
    const sku = `${prefix}${baseNumber}`
    
    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku })
    if (!existingProduct) {
      return baseNumber.toString()
    }
    
    attempts++
  }
  
  // Fallback to timestamp-based number if all attempts fail
  const timestamp = Date.now().toString().slice(-4)
  return timestamp
}

// Generate check digit for SKU validation (Luhn algorithm variant)
const generateCheckDigit = (sku) => {
  let sum = 0
  let alternate = false
  
  // Convert letters to numbers (A=1, B=2, etc.)
  const skuNumbers = sku.split('').map(char => {
    if (/[A-Z]/.test(char)) {
      return char.charCodeAt(0) - 64 // A=1, B=2, etc.
    }
    return parseInt(char) || 0
  })
  
  // Apply Luhn algorithm
  for (let i = skuNumbers.length - 1; i >= 0; i--) {
    let num = skuNumbers[i]
    if (alternate) {
      num *= 2
      if (num > 9) num = (num % 10) + 1
    }
    sum += num
    alternate = !alternate
  }
  
  return (10 - (sum % 10)) % 10
}

// Main SKU generation function
export const generateSKU = async (productData) => {
  try {
    const {
      name,
      category,
      subcategory,
      brand,
      tags,
      price
    } = productData

    // 1. Category code (3 chars)
    const categoryCode = CATEGORY_CODES[category] || 'GEN'
    
    // 2. Subcategory code (3 chars)
    const subcategoryCode = subcategory ? 
      (SUBCATEGORY_CODES[subcategory] || subcategory.substring(0, 3).toUpperCase()) : 
      'GEN'
    
    // 3. Material code (3 chars) - derived from name and tags
    const materialCode = getMaterialCode(name, tags)
    
    // 4. Brand code (3 chars)
    const brandCode = getBrandCode(brand)
    
    // 5. Price range indicator (1 char)
    let priceCode = 'A'
    if (price) {
      if (price >= 50000) priceCode = 'P' // Premium (50k+)
      else if (price >= 20000) priceCode = 'H' // High (20k-50k)
      else if (price >= 10000) priceCode = 'M' // Medium (10k-20k)
      else if (price >= 5000) priceCode = 'L' // Low (5k-10k)
      else priceCode = 'B' // Budget (<5k)
    }
    
    // 6. Sequential number (4 chars)
    const prefix = `${categoryCode}${subcategoryCode}${materialCode}${brandCode}${priceCode}`
    const sequentialNumber = await generateSequentialNumber(prefix)
    
    // 7. Check digit (1 char)
    const baseSKU = `${prefix}${sequentialNumber}`
    const checkDigit = generateCheckDigit(baseSKU)
    
    // Final SKU format: CAT-SUB-MAT-BRD-P-NNNN-C
    const finalSKU = `${categoryCode}-${subcategoryCode}-${materialCode}-${brandCode}-${priceCode}-${sequentialNumber}-${checkDigit}`
    
    // Validate uniqueness one more time
    const existingProduct = await Product.findOne({ sku: finalSKU })
    if (existingProduct) {
      // Recursive call with slight modification if collision occurs
      return generateSKU({
        ...productData,
        name: `${name}_${Date.now()}` // Add timestamp to make it unique
      })
    }
    
    return finalSKU
    
  } catch (error) {
    console.error('Error generating SKU:', error)
    
    // Fallback SKU generation
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const categoryCode = CATEGORY_CODES[productData.category] || 'GEN'
    
    return `${categoryCode}-FALLBACK-${timestamp}-${random}`
  }
}

// Validate SKU format and check digit
export const validateSKU = (sku) => {
  if (!sku || typeof sku !== 'string') {
    return { valid: false, error: 'SKU is required and must be a string' }
  }
  
  // Check format: XXX-XXX-XXX-XXX-X-NNNN-N
  const skuPattern = /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}-[A-Z]{3}-[A-Z]-\d{4}-\d$/
  if (!skuPattern.test(sku)) {
    return { valid: false, error: 'Invalid SKU format' }
  }
  
  // Extract parts
  const parts = sku.split('-')
  const checkDigit = parseInt(parts[6])
  const baseSKU = parts.slice(0, 6).join('')
  
  // Validate check digit
  const expectedCheckDigit = generateCheckDigit(baseSKU)
  if (checkDigit !== expectedCheckDigit) {
    return { valid: false, error: 'Invalid SKU check digit' }
  }
  
  return { valid: true }
}

// Parse SKU to extract information
export const parseSKU = (sku) => {
  if (!sku || typeof sku !== 'string') {
    return null
  }
  
  const parts = sku.split('-')
  if (parts.length !== 7) {
    return null
  }
  
  const [categoryCode, subcategoryCode, materialCode, brandCode, priceCode, sequentialNumber, checkDigit] = parts
  
  // Reverse lookup for codes
  const category = Object.keys(CATEGORY_CODES).find(key => CATEGORY_CODES[key] === categoryCode)
  const subcategory = Object.keys(SUBCATEGORY_CODES).find(key => SUBCATEGORY_CODES[key] === subcategoryCode)
  const material = Object.keys(MATERIAL_CODES).find(key => MATERIAL_CODES[key] === materialCode)
  
  const priceRanges = {
    'P': 'Premium (৳50,000+)',
    'H': 'High (৳20,000-৳50,000)',
    'M': 'Medium (৳10,000-৳20,000)',
    'L': 'Low (৳5,000-৳10,000)',
    'B': 'Budget (<৳5,000)',
    'A': 'Unspecified'
  }
  
  return {
    categoryCode,
    category,
    subcategoryCode,
    subcategory,
    materialCode,
    material,
    brandCode,
    priceCode,
    priceRange: priceRanges[priceCode],
    sequentialNumber,
    checkDigit,
    isValid: validateSKU(sku).valid
  }
}

// Generate batch SKUs for multiple products
export const generateBatchSKUs = async (productsData) => {
  const results = []
  
  for (const productData of productsData) {
    try {
      const sku = await generateSKU(productData)
      results.push({ productData, sku, success: true })
    } catch (error) {
      results.push({ 
        productData, 
        sku: null, 
        success: false, 
        error: error.message 
      })
    }
  }
  
  return results
}

export default {
  generateSKU,
  validateSKU,
  parseSKU,
  generateBatchSKUs
}
