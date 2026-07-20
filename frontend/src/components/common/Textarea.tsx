import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = false, className, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-lg border px-4 py-2 text-sm transition-colors resize-none',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
            className
          )}
          rows={4}
          {...props}
        />
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';