'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Users, UserCheck, UserX } from 'lucide-react';
import type { Gender } from '@/lib/types';

interface GenderSelectionProps {
  onGenderSelect: (gender: Gender) => void;
  selectedGender?: Gender;
}

const genderOptions: { value: Gender; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'male',
    label: 'Male',
    description: 'I identify as male',
    icon: <User className="w-6 h-6" />
  },
  {
    value: 'female',
    label: 'Female',
    description: 'I identify as female',
    icon: <User className="w-6 h-6" />
  },
  {
    value: 'non-binary',
    label: 'Non-binary',
    description: 'I identify as non-binary',
    icon: <Users className="w-6 h-6" />
  },
  {
    value: 'prefer-not-to-say',
    label: 'Prefer not to say',
    description: 'I prefer not to specify',
    icon: <UserX className="w-6 h-6" />
  }
];

export function GenderSelection({ onGenderSelect, selectedGender }: GenderSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline mb-2">Tell us about yourself</h2>
        <p className="text-muted-foreground">
          This helps us provide more accurate clothing suggestions and better organize your closet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {genderOptions.map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedGender === option.value
                ? 'ring-2 ring-accent bg-accent/5'
                : 'hover:bg-secondary/30'
            }`}
            onClick={() => onGenderSelect(option.value)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedGender === option.value ? 'bg-accent text-accent-foreground' : 'bg-secondary'
                }`}>
                  {option.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{option.label}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            {selectedGender === option.value && (
              <CardContent className="pt-0">
                <Badge variant="secondary" className="text-xs">
                  Selected
                </Badge>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>You can change this later in your settings.</p>
      </div>
    </div>
  );
} 