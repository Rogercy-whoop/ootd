'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { useCloset } from '@/context/ClosetContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function InspirationPage() {
  const { inspirationItems, removeInspirationItem, loading } = useCloset();

  return (
    <div className="container mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">Outfit Inspiration</h1>
        <p className="mt-2 text-lg text-foreground/80">
          Your saved outfits and ideas.
        </p>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-96">
                <CardContent className="p-4 flex flex-col h-full">
                    <Skeleton className="w-full h-48 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardContent>
            </Card>
          ))}
        </div>
      ) : inspirationItems.length === 0 ? (
        <div className="text-center py-20 bg-secondary/30 rounded-lg">
          <p className="font-headline text-2xl font-semibold mb-2">Nothing here yet!</p>
          <p className="text-muted-foreground">Generate an outfit on the Home page and click the heart icon to save it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {inspirationItems.map((inspiration) => (
            <Card key={inspiration.id} className="flex flex-col group relative shadow-md hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-4">
                 {inspiration.items.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {inspiration.items.slice(0, 4).map((item) => (
                       <div key={item.id} className="aspect-square">
                        <Image
                          src={item.photoDataUri}
                          alt={item.category}
                          width={150}
                          height={150}
                          className="rounded-md object-cover w-full h-full"
                        />
                       </div>
                    ))}
                  </div>
                 ) : (
                   <div className="flex items-center justify-center h-40 bg-secondary/30 rounded-md mb-4">
                      <p className="text-sm text-muted-foreground">General Outfit Suggestion</p>
                   </div>
                 )}
                <p className="whitespace-pre-wrap text-sm text-foreground/90 line-clamp-4">{inspiration.description}</p>
              </CardContent>
              <Button variant="destructive" size="icon" className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full h-8 w-8" onClick={() => removeInspirationItem(inspiration.id)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Inspiration</span>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
