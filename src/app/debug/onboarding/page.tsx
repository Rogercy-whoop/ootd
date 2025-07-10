
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { tagClothingItem } from '@/ai/flows/tag-clothing-item';
import { removeBackground } from '@/ai/flows/remove-background';
import { Button } from '@/components/ui/button';
import { useCloset } from '@/context/ClosetContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, PartyPopper, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';


const onboardingPrompts = [
  {}, // 0: welcome
  { title: "Add your first top", description: "Let's start with tops. Upload a photo of a t-shirt, sweater, or blouse." },
  { title: "Add your second top", description: "Great! Now upload another top." },
  { title: "Add your first bottom", description: "Time for bottoms. Upload a photo of your favorite pants, jeans, or a skirt." },
  { title: "Add your second bottom", description: "Excellent. Please upload one more bottom." },
  { title: "Add a pair of shoes", description: "Almost there! Finally, upload a photo of a pair of shoes." },
];

export default function DebugOnboardingPage() {
  const { addClosetItem } = useCloset();
  const { toast } = useToast();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0:welcome, 1-5:uploads, 6:done
  const [onboardingPreview, setOnboardingPreview] = useState<string | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingLoadingMessage, setOnboardingLoadingMessage] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // --- Onboarding Handlers ---
  const handleOnboardingOpenChange = (open: boolean) => {
    setShowOnboarding(open);
    if (!open) {
      setTimeout(() => setOnboardingStep(0), 500);
    }
  }

  const handleDoneOnboarding = () => {
    setShowOnboarding(false);
    setTimeout(() => setOnboardingStep(0), 500);
  };
  
  const resetOnboardingUploadState = () => {
    setOnboardingPreview(null);
    setOnboardingError(null);
    setOnboardingLoading(false);
    setOnboardingLoadingMessage(null);
  }

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

  const processOnboardingFile = async (selectedFile: File) => {
    const fileType = selectedFile.type.toLowerCase();
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (!supportedTypes.includes(fileType)) {
      setOnboardingError("Invalid file type. Please upload a PNG, JPG, or WEBP image.");
      setIsDraggingOver(false);
      return;
    }
    setOnboardingError(null);
    setOnboardingLoading(true);
    setOnboardingLoadingMessage('Preparing image...');

    try {
        const resizedDataUrl = await resizeImage(selectedFile, 1024);
        setOnboardingPreview(resizedDataUrl);
    } catch(e) {
      console.error(e);
      setOnboardingError("There was an error processing your image. Please try a different one.");
    } finally {
        setOnboardingLoading(false);
        setOnboardingLoadingMessage(null);
    }
  };
  
  const handleOnboardingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processOnboardingFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDraggingOver(false); };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) processOnboardingFile(selectedFile);
  };

  const handleOnboardingSubmit = async () => {
    if (!onboardingPreview) {
      setOnboardingError('Please select a file to upload.');
      return;
    }
    setOnboardingError(null);
    setOnboardingLoading(true);

    try {
      setOnboardingLoadingMessage('Removing background...');
      const removedBgResult = await removeBackground({ photoDataUri: onboardingPreview });
      const newPreview = removedBgResult.photoDataUri;
      
      setOnboardingLoadingMessage('Analyzing item...');
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
      
      toast({
        title: "Item Added!",
        description: "It's now in your digital closet.",
      });

      resetOnboardingUploadState();
      setOnboardingStep(prev => prev + 1);

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setOnboardingError(`Failed to process the item. ${errorMessage}`);
      toast({ variant: 'destructive', title: "Processing Failed", description: `Please try again.` });
    } finally {
      setOnboardingLoading(false);
      setOnboardingLoadingMessage(null);
    }
  };
  // --- End Onboarding Handlers ---

  return (
    <div className="container mx-auto max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">Onboarding Flow Tester</h1>
        <p className="mt-2 text-lg text-foreground/80">
          Click the button below to launch the new user onboarding experience at any time.
        </p>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={() => { setOnboardingStep(0); setShowOnboarding(true); }}>
          Launch Onboarding
        </Button>
      </div>
      
      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={handleOnboardingOpenChange}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          {onboardingStep === 0 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline flex items-center gap-2">
                  <PartyPopper className="w-6 h-6 text-accent" />
                  Let's get started!
                </DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  Welcome to OOTD! To give you the best style advice, let's add five of your most common wear clothes to your new digital closet.
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">This will help us better know your style and assist with better generations!</p>
              <DialogFooter className="sm:justify-end pt-4">
                 <Button onClick={() => setOnboardingStep(1)}>Start Setup</Button>
              </DialogFooter>
            </>
          )}

          {(onboardingStep >= 1 && onboardingStep <= 5) && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">
                  {onboardingPrompts[onboardingStep].title}
                </DialogTitle>
                <DialogDescription>
                  {onboardingPrompts[onboardingStep].description}
                </DialogDescription>
              </DialogHeader>

               <div className="py-4">
                {!onboardingPreview && !onboardingLoading && (
                  <label 
                    htmlFor="onboarding-dropzone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/30 transition-colors",
                      isDraggingOver ? "bg-accent/30 border-accent" : "hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag & drop</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP</p>
                    </div>
                    <Input id="onboarding-dropzone" type="file" className="hidden" onChange={handleOnboardingFileChange} accept="image/png, image/jpeg, image/webp" />
                  </label>
                 )}
                 {(onboardingPreview || onboardingLoading) && (
                   <div className="relative w-48 mx-auto flex items-center justify-center h-48">
                    {onboardingLoading && !onboardingPreview &&(
                       <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-accent" />
                          <p className="text-muted-foreground">{onboardingLoadingMessage || "Processing..."}</p>
                       </div>
                    )}
                    {onboardingPreview && (
                      <>
                        <Image src={onboardingPreview} alt="Clothing preview" width={200} height={200} className="rounded-lg object-contain w-full h-48 shadow-md" />
                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 rounded-full h-7 w-7" onClick={resetOnboardingUploadState}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                 )}
                {onboardingError && <Alert variant="destructive" className="mt-4 text-sm"><AlertDescription>{onboardingError}</AlertDescription></Alert>}
              </div>
              
              <DialogFooter>
                 <Button onClick={handleOnboardingSubmit} disabled={onboardingLoading || !onboardingPreview}>
                  {onboardingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {onboardingLoadingMessage || 'Processing...'}
                    </>
                  ) : `Add Item (${onboardingStep}/5)`}
                </Button>
              </DialogFooter>
            </>
          )}

          {onboardingStep === 6 && (
             <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">All Set!</DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  Your closet is ready to go. You can now generate your first outfit idea!
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm">Wanna add more now? You can always add more items from the "My Closet" page.</p>
              <DialogFooter className="sm:justify-end pt-4">
                <Button onClick={handleDoneOnboarding}>Done</Button>
                 <Button variant="secondary" asChild>
                    <Link href="/closet" onClick={handleDoneOnboarding}>Add More Items</Link>
                 </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
