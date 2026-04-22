import type { ChangeEvent } from 'react';
import { useCanvasStore } from '../stores/CanvasStore';

type UseImageUploadReturn = {
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  clearImage: () => void;
};

/** Provides a file-input change handler that reads a file as a data URL and stores it. */
export function useImageUpload(): UseImageUploadReturn {
  const { setBgImage } = useCanvasStore();

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      setBgImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => setBgImage(null);

  return { handleImageUpload, clearImage };
}
