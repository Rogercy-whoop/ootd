"use client";

import { ModelViewer } from '@/components/ModelViewer';

export default function ModelPreviewPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-4">3D Human Body Model Preview</h1>
      <div className="w-full max-w-2xl h-[600px]">
        <ModelViewer scale={1} />
      </div>
    </div>
  );
} 