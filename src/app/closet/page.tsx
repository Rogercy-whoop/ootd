
'use client';

import { useState } from 'react';
import Image from 'next/image';
// import { tagClothingItem } from '@/ai/flows/tag-clothing-item';
import { removeBackground } from '@/ai/flows/remove-background';
import { tagClothingItem } from '@/ai/flows/tag-clothing-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCloset } from '@/context/ClosetContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Plus, Trash2, X, Loader2, Grid, List } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OrganizedCloset } from '@/components/OrganizedCloset';
import { cn } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/context/AuthContext';

export default function ClosetPage() {
  const { closetItems, addClosetItem, removeClosetItem, loading: closetLoading } = useCloset();
  const { user } = useAuth();
  const { setUpgradeModalOpen, setLoginModalOpen } = useUI();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'organized' | 'grid'>('organized');
  const { toast } = useToast();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const resizeImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        if (!event.target?.result) {
            return reject(new Error("Failed to read file."));
        }
        img.src = event.target.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Could not get canvas context'));
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.9));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processFile = async (selectedFile: File) => {
    // In a production app, you would check a `isPremium` flag from your Firestore database
    // after a successful payment. For now, we'll assume no one is premium.
    const isPremium = false;

    if (closetItems.length >= 5) {
      if (!user) { // If it's a guest user
        setLoginModalOpen(true);
        toast({
            title: "Create an Account to Add More",
            description: "Please log in or sign up to add more than 5 items. Your current closet will be saved.",
            duration: 5000,
        });
        setIsDraggingOver(false);
        return;
      } else if (!isPremium) { // If it's a logged-in, non-premium user
        setUpgradeModalOpen(true);
        setIsDraggingOver(false);
        return;
      }
    }

    const fileType = selectedFile.type.toLowerCase();
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (!supportedTypes.includes(fileType)) {
      setError("Invalid file type. Please upload a PNG, JPG, or WEBP image.");
      toast({
        variant: 'destructive',
        title: "Upload Error",
        description: "Please upload a valid image file (PNG, JPG, WEBP).",
      });
      setIsDraggingOver(false);
      return;
    }
    
    setError(null);
    setLoading(true);
    setLoadingMessage("Preparing image...");

    try {
      const resizedDataUrl = await resizeImage(selectedFile, 1024); // Resize to max 1024px
      setPreview(resizedDataUrl);
    } catch(e) {
      console.error(e);
      setError("There was an error processing your image. Please try a different one.");
      toast({
        variant: 'destructive',
        title: "Image Processing Failed",
        description: "There was an error preparing your image. Please try a different file.",
      });
    } finally {
      setLoading(false);
      setLoadingMessage(null);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!preview) {
      setError('Please select a file to upload.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      setLoadingMessage('Removing background...');
      const removedBgResult = await removeBackground({ photoDataUri: preview });
      const newPreview = removedBgResult.photoDataUri;
      
      setLoadingMessage('Analyzing item...');
      const result = await tagClothingItem({ photoDataUri: newPreview });
      
      await addClosetItem({
        photoDataUri: newPreview,
        category: result.category,
        subCategory: result.subCategory,
        tags: result.tags,
        dominantColors: result.dominantColors,
        hasPattern: result.hasPattern,
        patternDescription: result.patternDescription || '',
      });

      cancelUpload();
      toast({
        title: "Success!",
        description: "Your item has been added to your closet.",
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to process the item. ${errorMessage}`);
      toast({
          variant: 'destructive',
          title: "Processing Failed",
          description: `There was an error processing your item. Please try again.`,
      });
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMessage(null);
    }
  };

  const cancelUpload = () => {
    setPreview(null);
    setError(null);
    setLoading(false);
    setLoadingMessage(null);
  }

  return (
    <TooltipProvider>
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">My Closet</h1>
        <p className="mt-2 text-lg text-foreground/80">
          Upload your clothes and build your digital wardrobe. You have {closetItems.length} items.
        </p>
      </div>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <Plus className="w-6 h-6 text-accent" /> Add New Item
          </CardTitle>
          <CardDescription>Upload a photo of a clothing item. We'll resize it, remove the background, and tag it for you.</CardDescription>
        </CardHeader>
        <CardContent>
          {!preview && !loading && (
            <div className="flex items-center justify-center w-full">
              <label 
                htmlFor="dropzone-file"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/30 transition-colors",
                  isDraggingOver ? "bg-accent/30 border-accent" : "hover:bg-secondary/50"
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP</p>
                </div>
                <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
              </label>
            </div>
          )}
          {(preview || loading) && (
            <div className="relative w-full max-w-sm mx-auto flex items-center justify-center h-64">
              {loading && !preview && (
                 <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    <p className="text-muted-foreground">{loadingMessage || "Processing..."}</p>
                 </div>
              )}
              {preview && (
                <>
                  <Image src={preview} alt="Clothing preview" width={300} height={400} className="rounded-lg object-contain w-full h-full shadow-md" />
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8" onClick={cancelUpload}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
          {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
        {preview && !loading && (
        <CardFooter>
          <Button onClick={handleSubmit} disabled={loading} className="w-full font-headline text-lg py-6">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {loadingMessage || 'Processing...'}
              </>
            ) : 'Add to Closet'}
          </Button>
        </CardFooter>
        )}
      </Card>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-3xl font-bold">Your Wardrobe</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'organized' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('organized')}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              Organized
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-2"
            >
              <Grid className="w-4 h-4" />
              Grid
            </Button>
          </div>
        </div>
        
        {closetLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
          </div>
        ) : viewMode === 'organized' ? (
          <OrganizedCloset 
            closetItems={closetItems} 
            onRemoveItem={removeClosetItem} 
            loading={closetLoading}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {closetItems.map(item => (
              <Card key={item.id} className="overflow-hidden group relative shadow-md hover:shadow-xl transition-shadow flex flex-col">
                <CardContent className="p-0 bg-secondary/20">
                  <Image src={item.photoDataUri} alt={item.subCategory} width={300} height={400} className="object-contain w-full h-64" />
                </CardContent>
                <CardHeader className="p-4 flex-1">
                  <CardTitle className="text-lg font-headline capitalize">{item.subCategory}</CardTitle>
                  <CardDescription className="capitalize">{item.category}</CardDescription>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(item.tags || []).slice(0, 3).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </CardHeader>
                 <CardFooter className="p-4 pt-0">
                   <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">Colors:</p>
                      {(item.dominantColors || []).map(color => (
                        <Tooltip key={color}>
                          <TooltipTrigger asChild>
                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color }} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{color}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                </CardFooter>
                <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8" onClick={() => removeClosetItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
