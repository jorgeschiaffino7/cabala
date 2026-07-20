import { type ReactNode } from 'react';
import { cn } from '@/utils/helpers';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert = ({
  variant = 'info',
  title,
  children,
  onClose,
  className,
}: AlertProps) => {
  const variants = {
    success: {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
    },
  };

  const currentVariant = variants[variant];

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4',
        currentVariant.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{currentVariant.icon}</div>
        
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
          )}
          <div className="text-sm">{children}</div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 hover:opacity-70 transition-opacity"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};