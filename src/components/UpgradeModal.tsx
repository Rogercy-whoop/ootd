
'use client';

import { useUI } from '@/context/UIContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Crown } from 'lucide-react';

// The Stripe payment links were removed for the public launch: nothing in the app
// granted Premium after a payment, so taking money would have sold a feature that
// doesn't exist yet. The 5-item free limit is unchanged.
export function UpgradeModal() {
  const { isUpgradeModalOpen, setUpgradeModalOpen } = useUI();

  return (
    <Dialog open={isUpgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
              <Crown className="w-10 h-10 text-accent" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-headline">Your closet is full</DialogTitle>
          <DialogDescription className="text-center text-base pt-1">
            The free version holds up to 5 closet items. A Premium plan with unlimited items is
            planned but not available yet. For now, remove an item to add a new one.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
