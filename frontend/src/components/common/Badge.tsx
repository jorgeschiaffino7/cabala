import { type ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface BadgeProps {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

export const Badge = ({
  variant = 'default',
  size = 'md',
  children,
  className,
}: BadgeProps) => {
  const variants = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};