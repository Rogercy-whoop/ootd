'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ClothingItem } from '@/lib/types';
import { CLOTHING_CATEGORIES } from '@/ai/flows/tag-clothing-item';

interface OrganizedClosetProps {
  closetItems: ClothingItem[];
  onRemoveItem: (id: string) => void;
  loading?: boolean;
}

interface CategorySection {
  title: string;
  subCategories: {
    title: string;
    items: ClothingItem[];
  }[];
}

export function OrganizedCloset({ closetItems, onRemoveItem, loading = false }: OrganizedClosetProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['tops', 'bottoms', 'shoes']));

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const organizeItems = (items: ClothingItem[]): CategorySection[] => {
    const organized: { [key: string]: { [subKey: string]: ClothingItem[] } } = {
      tops: {},
      bottoms: {},
      shoes: {},
      accessories: {},
      outerwear: {},
      other: {}
    };

    items.forEach(item => {
      const category = item.category.toLowerCase();
      const subCategory = item.subCategory.toLowerCase();
      
      // Determine which main category this item belongs to
      let mainCategory = 'other';
      
      if (CLOTHING_CATEGORIES.tops.some(sub => subCategory.includes(sub) || category.includes('top'))) {
        mainCategory = 'tops';
      } else if (CLOTHING_CATEGORIES.bottoms.some(sub => subCategory.includes(sub) || category.includes('bottom'))) {
        mainCategory = 'bottoms';
      } else if (CLOTHING_CATEGORIES.shoes.some(sub => subCategory.includes(sub) || category.includes('shoe'))) {
        mainCategory = 'shoes';
      } else if (CLOTHING_CATEGORIES.accessories.some(sub => subCategory.includes(sub) || category.includes('accessory'))) {
        mainCategory = 'accessories';
      } else if (CLOTHING_CATEGORIES.outerwear.some(sub => subCategory.includes(sub) || category.includes('outerwear'))) {
        mainCategory = 'outerwear';
      }

      if (!organized[mainCategory][subCategory]) {
        organized[mainCategory][subCategory] = [];
      }
      organized[mainCategory][subCategory].push(item);
    });

    // Convert to the format we need for rendering
    return Object.entries(organized)
      .filter(([_, subCategories]) => Object.values(subCategories).some(items => items.length > 0))
      .map(([category, subCategories]) => ({
        title: category.charAt(0).toUpperCase() + category.slice(1),
        subCategories: Object.entries(subCategories)
          .filter(([_, items]) => items.length > 0)
          .map(([subCategory, items]) => ({
            title: subCategory.charAt(0).toUpperCase() + subCategory.slice(1),
            items
          }))
          .sort((a, b) => a.title.localeCompare(b.title))
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  const organizedSections = organizeItems(closetItems);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-64 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (closetItems.length === 0) {
    return (
      <div className="text-center py-20 bg-secondary/30 rounded-lg">
        <p className="text-muted-foreground">Your closet is empty. Add some items to get started!</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {organizedSections.map((section) => (
          <div key={section.title} className="space-y-4">
            <button
              onClick={() => toggleCategory(section.title.toLowerCase())}
              className="flex items-center gap-2 text-2xl font-bold font-headline hover:text-accent transition-colors"
            >
              {expandedCategories.has(section.title.toLowerCase()) ? (
                <ChevronDown className="w-6 h-6" />
              ) : (
                <ChevronRight className="w-6 h-6" />
              )}
              {section.title}
              <span className="text-sm font-normal text-muted-foreground">
                ({section.subCategories.reduce((acc, sub) => acc + sub.items.length, 0)} items)
              </span>
            </button>
            
            {expandedCategories.has(section.title.toLowerCase()) && (
              <div className="space-y-6 ml-6">
                {section.subCategories.map((subCategory) => (
                  <div key={subCategory.title} className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground/80 capitalize">
                      {subCategory.title}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({subCategory.items.length})
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {subCategory.items.map((item) => (
                        <Card key={item.id} className="overflow-hidden group relative shadow-md hover:shadow-xl transition-shadow flex flex-col">
                          <CardContent className="p-0 bg-secondary/20">
                            <Image 
                              src={item.photoDataUri} 
                              alt={item.subCategory} 
                              width={300} 
                              height={400} 
                              className="object-contain w-full h-64" 
                            />
                          </CardContent>
                          <CardHeader className="p-4 flex-1">
                            <CardTitle className="text-lg font-headline capitalize">{item.subCategory}</CardTitle>
                            <CardDescription className="capitalize">{item.category}</CardDescription>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {(item.tags || []).slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardHeader>
                          <div className="p-4 pt-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-muted-foreground">Colors:</p>
                              {(item.dominantColors || []).map(color => (
                                <Tooltip key={color}>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className="w-4 h-4 rounded-full border" 
                                      style={{ backgroundColor: color }} 
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{color}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </div>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8" 
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
} 