'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { generateOutfitIdea, type GenerateOutfitIdeaOutput } from '@/ai/flows/generate-outfit-idea';
import { tagClothingItem } from '@/ai/flows/tag-clothing-item';
import { removeBackground } from '@/ai/flows/remove-background';
import { fetchWeather } from '@/ai/tools/weather';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCloset } from '@/context/ClosetContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Zap, Heart, AlertCircle, RefreshCw, Upload, X, PartyPopper, Loader2, Info, Sun, Cloud, Snowflake, Eye } from 'lucide-react';
import type { ClothingItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useUI } from '@/context/UIContext';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { GenderSelection } from '@/components/GenderSelection';

const onboardingPrompts = [
  {}, // 0: welcome
  { title: "Add your first top", description: "Let's start with tops. Upload a photo of a t-shirt, sweater, or blouse." },
  { title: "Add your second top", description: "Great! Now upload another top." },
  { title: "Add your first bottom", description: "Time for bottoms. Upload a photo of your favorite pants, jeans, or a skirt." },
  { title: "Add your second bottom", description: "Excellent. Please upload one more bottom." },
  { title: "Add a pair of shoes", description: "Almost there! Finally, upload a photo of a pair of shoes." },
];

export default function OutfitGeneratorPage() {
  const { closetItems, inspirationItems, addInspirationItem, addClosetItem, loading: closetLoading } = useCloset();
  const { user, loading: authLoading } = useAuth();
  const { setLoginModalOpen } = useUI();
  
  const [occasion, setOccasion] = useState('');
  const [ignoreCloset, setIgnoreCloset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outfitIdea, setOutfitIdea] = useState<GenerateOutfitIdeaOutput | null>(null);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [testingMode, setTestingMode] = useState(false);
  const { toast } = useToast();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [showManualLocation, setShowManualLocation] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0:welcome, 1:gender, 2-6:uploads, 7:done
  const [onboardingPreview, setOnboardingPreview] = useState<string | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingLoadingMessage, setOnboardingLoadingMessage] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // User preferences
  const { preferences, updateGender } = useUserPreferences();

  // Daily Login Prompt state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Get user location for weather
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Unable to retrieve your location. Weather features will be disabled.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings or allow location access when prompted.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Weather features will be disabled.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Weather features will be disabled.';
              break;
            default:
              errorMessage = 'Unable to retrieve your location. Weather features will be disabled.';
          }
          
          setLocationError(errorMessage);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  // Fetch weather when location is available
  useEffect(() => {
    if (location) {
      fetchWeather(location).then(setWeather);
    }
  }, [location]);

  // Onboarding trigger logic for new guest users
  useEffect(() => {
    if (!closetLoading && closetItems.length === 0) {
      const onboardingComplete = sessionStorage.getItem('onboardingComplete');
      const isTestingMode = localStorage.getItem('testingMode') === 'true';
      
      // For testing: Skip onboarding if testing mode is enabled
      if (isTestingMode) {
        console.log('Testing mode enabled - skipping onboarding');
        return;
      }
      
      // For real users: Make onboarding mandatory
      if (!onboardingComplete) {
        setShowOnboarding(true);
        setOnboardingStep(0);
      }
    }
  }, [closetLoading, closetItems]);
  
  // "Once a day" prompt to encourage signup for guest users.
  useEffect(() => {
    if (authLoading) return; // Wait until auth state is determined
    
    if (!user) { // Only show prompt if user is a guest
      const lastPrompted = localStorage.getItem('lastLoginPromptTimestamp');
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (!lastPrompted || (now - parseInt(lastPrompted)) > oneDay) {
        setShowLoginPrompt(true);
        localStorage.setItem('lastLoginPromptTimestamp', now.toString());
      }
    }
  }, [user, authLoading]);

  const handleGenerate = async () => {
    if (!testingMode && closetItems.length < 5) {
      toast({
        variant: 'destructive',
        title: 'Action Required',
        description: 'Please finish the first-time user instructions before starting. Add at least 5 items to your closet.',
      });
      return;
    }
    setError(null);
    setLoading(true);
    setOutfitIdea(null);
    setCurrentOutfitIndex(0);

    try {
      // Sanitize closet items by removing the large image data to prevent exceeding server action limits.
      const sanitizedClosetItems = (!ignoreCloset && closetItems.length > 0)
        ? closetItems.map(({ photoDataUri, ...rest }) => rest)
        : undefined;
      
      // Sanitize inspiration items for the same reason.
      const sanitizedInspirationItems = (inspirationItems.length > 0)
        ? inspirationItems.map(inspiration => ({
            description: inspiration.description,
            // The AI prompt currently only uses the description, but we send sanitized
            // items to match the schema and allow for future prompt enhancements.
            items: inspiration.items.map(({ photoDataUri, ...rest }) => rest),
          }))
        : undefined;

      const result = await generateOutfitIdea({
        latitude: location?.latitude,
        longitude: location?.longitude,
        occasion: occasion || undefined,
        closetItems: sanitizedClosetItems,
        inspirationItems: sanitizedInspirationItems,
      });
      setOutfitIdea(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate an outfit idea. Please try again. ${errorMessage}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTryAnotherOutfit = () => {
    if (outfitIdea?.alternativeOutfits && outfitIdea.alternativeOutfits.length > 0) {
      setCurrentOutfitIndex((prev) => {
        const nextIndex = (prev + 1) % (outfitIdea.alternativeOutfits!.length + 1);
        return nextIndex;
      });
    }
  };

  const getCurrentOutfit = () => {
    if (!outfitIdea) return null;
    
    if (currentOutfitIndex === 0) {
      return {
        outfitDescription: outfitIdea.outfitDescription,
        itemIds: outfitIdea.itemIds,
        reason: "Primary suggestion"
      };
    }
    
    const alternativeIndex = currentOutfitIndex - 1;
    if (outfitIdea.alternativeOutfits && outfitIdea.alternativeOutfits[alternativeIndex]) {
      return outfitIdea.alternativeOutfits[alternativeIndex];
    }
    
    return null;
  };

  const currentOutfit = getCurrentOutfit();
  const suggestedItems = (currentOutfit?.itemIds || [])
    .map(id => closetItems.find(item => item.id === id))
    .filter((item): item is ClothingItem => !!item);

  const handleSaveInspiration = () => {
    if (currentOutfit) {
      addInspirationItem({
        description: currentOutfit.outfitDescription,
        items: suggestedItems,
      });
      toast({
        title: "Saved to Inspiration!",
        description: "You can find your saved outfit in the Inspiration tab.",
      });
    }
  };

  const handlePromptLogin = () => {
      setShowLoginPrompt(false);
      setLoginModalOpen(true);
  }

  const handleManualLocationSubmit = async () => {
    if (!manualLocation.trim()) return;
    
    try {
      // Use a geocoding service to convert city name to coordinates
      const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(manualLocation)}&limit=1&appid=YOUR_API_KEY`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLocation({ latitude: lat, longitude: lon });
        setLocationError(null);
        setShowManualLocation(false);
        setManualLocation('');
      } else {
        setLocationError('Location not found. Please try a different city name.');
      }
    } catch (error) {
      setLocationError('Failed to set location. Please try again.');
    }
  };

  const toggleTestingMode = () => {
    const newMode = !testingMode;
    setTestingMode(newMode);
    localStorage.setItem('testingMode', newMode.toString());
    
    if (newMode) {
      toast({
        title: "Testing Mode Enabled",
        description: "Onboarding is now skipped. You can test the app without uploading 5 items.",
      });
    } else {
      toast({
        title: "Testing Mode Disabled",
        description: "Onboarding is now mandatory for new users.",
      });
    }
  };

  // --- Onboarding Handlers ---
  const handleOnboardingOpenChange = (open: boolean) => {
    if (!open) {
      if (onboardingStep === 6) {
          handleCompleteOnboarding();
      }
    }
    setShowOnboarding(open);
  }

  const handleCompleteOnboarding = () => {
    sessionStorage.setItem('onboardingComplete', 'true');
    setShowOnboarding(false);
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
      const result = await tagClothingItem({ photoDataUri: newPreview, gender: preferences.gender });
      
      addClosetItem({
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
  
  const getWeatherIcon = (weatherString: string | null) => {
    if (!weatherString) return <Sun className="w-5 h-5 text-muted-foreground" />;
    const lowerCaseWeather = weatherString.toLowerCase();
    if (lowerCaseWeather.includes('snow') || lowerCaseWeather.includes('freezing')) return <Snowflake className="w-5 h-5 text-blue-400" />;
    if (lowerCaseWeather.includes('cloud') || lowerCaseWeather.includes('overcast')) return <Cloud className="w-5 h-5 text-gray-400" />;
    if (lowerCaseWeather.includes('rain') || lowerCaseWeather.includes('drizzle')) return <Cloud className="w-5 h-5 text-blue-500" />;
    return <Sun className="w-5 h-5 text-yellow-500" />;
  };
  // --- End Onboarding Handlers ---


  return (
    <div className="container mx-auto max-w-4xl">
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

          {onboardingStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">
                  Personalize Your Experience
                </DialogTitle>
                <DialogDescription>
                  Help us provide better clothing suggestions and organize your closet more effectively.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <GenderSelection 
                  onGenderSelect={updateGender}
                  selectedGender={preferences.gender}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={() => setOnboardingStep(2)} 
                  className="w-full text-lg"
                  disabled={!preferences.gender}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {(onboardingStep >= 2 && onboardingStep <= 6) && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">
                  {onboardingPrompts[onboardingStep - 1].title}
                </DialogTitle>
                <DialogDescription>
                  {onboardingPrompts[onboardingStep - 1].description}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {!onboardingPreview && !onboardingLoading &&(
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
                  ) : `Add Item (${onboardingStep - 1}/5)`}
                </Button>
              </DialogFooter>
            </>
          )}

          {onboardingStep === 7 && (
             <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">All Set!</DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  Your closet is ready to go. You can now generate your first outfit idea!
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm">Wanna add more now? You can always add more items from the "My Closet" page.</p>
              <DialogFooter className="sm:justify-end pt-4">
                <Button onClick={handleCompleteOnboarding}>Start Generating</Button>
                 <Button variant="secondary" asChild>
                    <Link href="/closet" onClick={handleCompleteOnboarding}>Add More Items</Link>
                 </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Daily Login Prompt Dialog for Guests */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Info className="w-6 h-6 text-accent" />
                    Save Your Progress
                  </DialogTitle>
                  <DialogDescription className="pt-2 text-base">
                      Want to save your closet and inspiration across devices? Create a free account!
                      <br/><br/>
                      Without an account, your data is only stored in this browser and can be lost.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-end gap-2 pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                        Continue as Guest
                    </Button>
                  </DialogClose>
                  <Button onClick={handlePromptLogin}>
                      Login / Sign Up
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Main Page Content */}
      <div className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">
          Style Your Moment
        </h1>
        <p className="mt-4 text-lg text-foreground/80">
          Let our AI craft the perfect outfit for you, based on your closet, your style, and the weather.
        </p>
        
        {/* Testing Mode Toggle - Only visible in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Switch
              id="testing-mode"
              checked={testingMode}
              onCheckedChange={toggleTestingMode}
            />
            <Label htmlFor="testing-mode" className="text-sm">
              Testing Mode (Skip Onboarding)
            </Label>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-lg">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight font-headline flex items-center gap-2">
            <Zap className="w-6 h-6 text-accent" />
            Create Your Outfit
          </h3>
          <p className="text-sm text-muted-foreground">
            Describe an occasion for a tailored suggestion, or leave it blank for a general idea.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            New here? Feel free to add one or two items whenever you're free! The more items in your closet, the better your outfit suggestions will be.
          </p>
        </div>
        <div className="p-6 pt-0 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="occasion" className="font-semibold font-headline">What are you dressing for? (Optional)</Label>
            <Textarea
              id="occasion"
              placeholder="e.g., 'Casual brunch with friends', 'A formal wedding', 'Work from home'"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="min-h-[100px] text-base"
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {weather ? (
                  <>
                   {getWeatherIcon(weather)}
                   <span>{weather}</span>
                  </>
                ) : locationError ? (
                  <div className="flex flex-col gap-1">
                  <span className="text-xs text-destructive">{locationError}</span>
                    <button
                      onClick={() => setShowManualLocation(!showManualLocation)}
                      className="text-xs text-accent hover:underline"
                    >
                      {showManualLocation ? 'Cancel' : 'Enter location manually'}
                    </button>
                  </div>
                ) : (
                  <>
                    <Skeleton className="w-5 h-5 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </>
                )}
             </div>

             {closetLoading ? (
               <div className="flex items-center space-x-2">
                 <Skeleton className="h-6 w-11" />
                 <Skeleton className="h-5 w-24" />
               </div>
             ) : (
                closetItems.length > 0 && (
                    <div className="flex items-center space-x-2">
                        <Switch id="ignore-closet-toggle" checked={ignoreCloset} onCheckedChange={setIgnoreCloset} />
                        <Label htmlFor="ignore-closet-toggle" className="text-sm font-medium">Not from my closet</Label>
                    </div>
                )
             )}
          </div>
          
          {showManualLocation && (
            <div className="flex gap-2 items-center p-3 bg-secondary/30 rounded-lg">
              <input
                type="text"
                placeholder="Enter city name (e.g., New York, London)"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                onKeyPress={(e) => e.key === 'Enter' && handleManualLocationSubmit()}
              />
              <Button
                onClick={handleManualLocationSubmit}
                disabled={!manualLocation.trim()}
                size="sm"
              >
                Set
              </Button>
            </div>
          )}
          
          {!ignoreCloset && !closetLoading && closetItems.length === 0 && !showOnboarding && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Your Closet is Empty!</AlertTitle>
              <AlertDescription>
                For personalized outfit suggestions, <Link href="/closet" className="font-semibold underline">add some items</Link> to your digital wardrobe. We'll give you general ideas in the meantime.
              </AlertDescription>
            </Alert>
          )}

          {!ignoreCloset && !closetLoading && closetItems.length > 0 && closetItems.length < 5 && (
            <Alert variant="default" className="bg-accent/10 border-accent/50">
              <AlertCircle className="h-4 w-4 text-accent/80" />
              <AlertTitle className="text-black font-semibold">Your Closet is a Great Start!</AlertTitle>
              <AlertDescription className="text-black">
                For more varied and accurate suggestions, try <Link href="/closet" className="font-semibold underline">adding more items</Link> to your closet. The more we know, the better your outfits!
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button onClick={handleGenerate} disabled={loading || (!location && !locationError)} className="w-full text-lg py-6 font-headline">
            {loading ? 'Styling...' : 'Generate Outfit'}
          </Button>

          {loading && (
            <div className="space-y-4 pt-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {outfitIdea && (
            <div className="rounded-lg border bg-secondary/30 mt-6 p-6 text-card-foreground shadow-sm">
                <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-semibold leading-none tracking-tight font-headline flex items-center gap-2 pr-4">
                        <Lightbulb className="w-6 h-6 text-accent" />
                        Your Outfit Idea
                        {outfitIdea.alternativeOutfits && outfitIdea.alternativeOutfits.length > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">
                            ({currentOutfitIndex + 1} of {outfitIdea.alternativeOutfits.length + 1})
                          </span>
                        )}
                    </h3>
                     <TooltipProvider>
                        <div className="flex items-center -mt-1 -mr-2 gap-1">
                            {outfitIdea.alternativeOutfits && outfitIdea.alternativeOutfits.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleTryAnotherOutfit} className="text-accent hover:text-primary">
                                        <RefreshCw className="w-5 h-5" />
                                        <span className="sr-only">Try Another Outfit</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Try another outfit option</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleGenerate} disabled={loading} className="text-accent hover:text-primary">
                                        <RefreshCw className="w-5 h-5" />
                                        <span className="sr-only">Regenerate</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Generate new ideas</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleSaveInspiration} className="text-accent hover:text-primary">
                                        <Heart className="w-6 h-6 hover:fill-current" />
                                        <span className="sr-only">Save to Inspiration</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Save to Inspiration</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" asChild className="text-accent hover:text-primary">
                                        <Link href="/viewer">
                                            <Eye className="w-5 h-5" />
                                            <span className="sr-only">View in 3D</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>View in 3D</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </div>
                
                <div className="pt-6">
                    <p className="text-foreground/90 whitespace-pre-wrap">{currentOutfit?.outfitDescription}</p>
                    {currentOutfit?.reason && currentOutfit.reason !== "Primary suggestion" && (
                      <p className="text-sm text-muted-foreground mt-2 italic">Why this works: {currentOutfit.reason}</p>
                    )}
                </div>

                {/* Weather Warnings */}
                {outfitIdea.weatherWarnings && outfitIdea.weatherWarnings.length > 0 && (
                  <div className="pt-4">
                    <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-800">Weather Alert</AlertTitle>
                      <AlertDescription className="text-yellow-700">
                        {outfitIdea.weatherWarnings.map((warning, index) => (
                          <div key={index} className="mt-1">• {warning}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Missing Items Suggestions */}
                {outfitIdea.missingItems && outfitIdea.missingItems.length > 0 && (
                  <div className="pt-4">
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Consider Adding</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        {outfitIdea.missingItems.map((item, index) => (
                          <div key={index} className="mt-1">• {typeof item === 'string' ? item : (item as any).name || (item as any).description || 'Item'}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {suggestedItems.length > 0 && (
                  <div className="pt-6">
                    <h4 className="font-headline text-lg font-semibold mb-4">Suggested Items from Your Closet</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      {suggestedItems.map(item => (
                        <div key={item.id} className="rounded-lg overflow-hidden border bg-card shadow-sm">
                          <Image
                            src={item.photoDataUri}
                            alt={item.subCategory}
                            width={200}
                            height={200}
                            className="object-cover w-full h-40"
                          />
                          <p className="text-sm p-2 text-center font-medium capitalize truncate">{item.subCategory}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
