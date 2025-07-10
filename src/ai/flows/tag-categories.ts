import type { Gender } from '@/lib/types';

export const CLOTHING_CATEGORIES = {
  male: {
    tops: [
      't-shirt', 'polo shirt', 'dress shirt', 'button-down shirt', 'sweater', 'hoodie', 
      'cardigan', 'tank top', 'turtleneck', 'blazer', 'jacket', 'sweatshirt'
    ],
    bottoms: [
      'jeans', 'pants', 'shorts', 'dress pants', 'chinos', 'khakis', 'joggers', 
      'sweatpants', 'cargo pants', 'slacks', 'trousers'
    ],
    shoes: [
      'sneakers', 'boots', 'dress shoes', 'loafers', 'oxfords', 'athletic shoes', 
      'sandals', 'slides', 'mules', 'chelsea boots'
    ],
    accessories: [
      'hat', 'scarf', 'belt', 'bag', 'jewelry', 'watch', 'sunglasses', 'tie', 'bow tie'
    ],
    outerwear: [
      'coat', 'jacket', 'blazer', 'vest', 'raincoat', 'winter coat', 'leather jacket'
    ]
  },
  female: {
    tops: [
      't-shirt', 'blouse', 'sweater', 'cardigan', 'tank top', 'crop top', 'turtleneck', 
      'dress shirt', 'polo shirt', 'hoodie', 'sweatshirt', 'bodysuit'
    ],
    bottoms: [
      'jeans', 'pants', 'shorts', 'skirt', 'dress pants', 'leggings', 'joggers', 
      'sweatpants', 'culottes', 'palazzo pants', 'skinny jeans'
    ],
    shoes: [
      'sneakers', 'boots', 'sandals', 'flats', 'heels', 'loafers', 'mules', 
      'slides', 'pumps', 'ankle boots', 'athletic shoes'
    ],
    accessories: [
      'hat', 'scarf', 'belt', 'bag', 'jewelry', 'watch', 'sunglasses', 'hair accessories'
    ],
    outerwear: [
      'coat', 'jacket', 'blazer', 'vest', 'raincoat', 'winter coat', 'leather jacket'
    ]
  },
  unisex: {
    tops: [
      't-shirt', 'sweater', 'hoodie', 'cardigan', 'tank top', 'sweatshirt'
    ],
    bottoms: [
      'jeans', 'pants', 'shorts', 'joggers', 'sweatpants'
    ],
    shoes: [
      'sneakers', 'boots', 'sandals', 'slides', 'athletic shoes'
    ],
    accessories: [
      'hat', 'scarf', 'belt', 'bag', 'jewelry', 'watch', 'sunglasses'
    ],
    outerwear: [
      'coat', 'jacket', 'vest', 'raincoat', 'winter coat'
    ]
  }
};

export function getGenderSpecificCategories(gender?: Gender) {
  if (!gender || gender === 'prefer-not-to-say' || gender === 'non-binary') {
    return CLOTHING_CATEGORIES.unisex;
  }
  return CLOTHING_CATEGORIES[gender] || CLOTHING_CATEGORIES.unisex;
} 