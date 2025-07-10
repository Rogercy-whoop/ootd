'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, TrendingUp, AlertCircle } from 'lucide-react';
import type { ClothingItem } from '@/lib/types';
import { getGenderSpecificCategories } from '@/ai/flows/tag-categories';
import type { Gender } from '@/lib/types';

interface ClosetGapsProps {
  closetItems: ClothingItem[];
  gender?: Gender;
  onAddItem?: () => void;
}

interface CategoryStats {
  name: string;
  totalItems: number;
  subCategories: {
    name: string;
    count: number;
    examples: string[];
  }[];
  completion: number;
  missing: string[];
}

export function ClosetGaps({ closetItems, gender, onAddItem }: ClosetGapsProps) {
  const categories = getGenderSpecificCategories(gender);
  
  const analyzeCloset = (): CategoryStats[] => {
    const stats: CategoryStats[] = [];
    
    Object.entries(categories).forEach(([categoryName, subCategories]) => {
      const categoryItems = closetItems.filter(item => {
        const itemCategory = item.category.toLowerCase();
        const itemSubCategory = item.subCategory.toLowerCase();
        return subCategories.some(sub => 
          itemSubCategory.includes(sub) || itemCategory.includes(categoryName.slice(0, -1))
        );
      });

      const subCategoryStats = subCategories.map(subCategory => {
        const items = categoryItems.filter(item => 
          item.subCategory.toLowerCase().includes(subCategory)
        );
        return {
          name: subCategory,
          count: items.length,
          examples: items.map(item => item.subCategory)
        };
      });

      const totalItems = categoryItems.length;
      const completion = Math.min((totalItems / 5) * 100, 100); // 5 items per category is considered complete
      
      // Find missing essential items
      const missing = subCategories.filter(subCategory => {
        const hasItem = categoryItems.some(item => 
          item.subCategory.toLowerCase().includes(subCategory)
        );
        return !hasItem;
      }).slice(0, 3); // Show top 3 missing items

      stats.push({
        name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
        totalItems,
        subCategories: subCategoryStats,
        completion,
        missing
      });
    });

    return stats.sort((a, b) => b.totalItems - a.totalItems);
  };

  const categoryStats = analyzeCloset();
  const totalItems = closetItems.length;
  const overallCompletion = Math.min((totalItems / 25) * 100, 100); // 25 items total is considered complete

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-green-600';
    if (completion >= 60) return 'text-yellow-600';
    if (completion >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (completion: number) => {
    if (completion >= 80) return 'bg-green-500';
    if (completion >= 60) return 'bg-yellow-500';
    if (completion >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Closet Overview
          </CardTitle>
          <CardDescription>
            Your closet completion and suggested improvements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Completion</span>
            <span className={`text-sm font-bold ${getCompletionColor(overallCompletion)}`}>
              {Math.round(overallCompletion)}%
            </span>
          </div>
          <Progress value={overallCompletion} className="h-2" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{totalItems} items in closet</span>
            <span>Goal: 25+ items</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryStats.map((category) => (
          <Card key={category.name} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Badge variant="secondary">{category.totalItems} items</Badge>
              </div>
              <CardDescription>
                {category.missing.length > 0 ? (
                  <span className="text-orange-600">
                    Missing: {category.missing.slice(0, 2).join(', ')}
                    {category.missing.length > 2 && '...'}
                  </span>
                ) : (
                  'Well stocked!'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion</span>
                <span className={`text-sm font-bold ${getCompletionColor(category.completion)}`}>
                  {Math.round(category.completion)}%
                </span>
              </div>
              <Progress 
                value={category.completion} 
                className="h-2"
                style={{
                  '--progress-background': getProgressColor(category.completion)
                } as React.CSSProperties}
              />
              
              {/* Subcategory breakdown */}
              <div className="space-y-2">
                {category.subCategories
                  .filter(sub => sub.count > 0)
                  .slice(0, 3)
                  .map((sub) => (
                    <div key={sub.name} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{sub.name}</span>
                      <Badge variant="outline" className="text-xs">{sub.count}</Badge>
                    </div>
                  ))}
              </div>

              {/* Missing items suggestions */}
              {category.missing.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <AlertCircle className="w-3 h-3" />
                    <span>Consider adding:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {category.missing.slice(0, 3).map((item) => (
                      <Badge key={item} variant="outline" className="text-xs capitalize">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Button */}
      {onAddItem && (
        <div className="text-center">
          <Button onClick={onAddItem} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Items to Closet
          </Button>
        </div>
      )}
    </div>
  );
} 