import { useState } from 'react';
import { copyToClipboard } from '@/utils/helpers';
import { useToast } from '@/context/ToastContext';
import { TOAST_MESSAGES } from '@/utils/constants';

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<void>;
}

/**
 * Hook to copy text to clipboard with toast notification
 */
export const useCopyToClipboard = (): UseCopyToClipboardReturn => {
  const [copied, setCopied] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  const copy = async (text: string) => {
    const success = await copyToClipboard(text);
    
    if (success) {
      setCopied(true);
      showSuccess(TOAST_MESSAGES.COPY_SUCCESS);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      showError(TOAST_MESSAGES.COPY_ERROR);
    }
  };

  return {
    copied,
    copy,
  };
};