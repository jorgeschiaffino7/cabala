import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Container = ({
  children,
  size = 'lg',
  className,
  ...props
}: ContainerProps) => {
  const sizes = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1400px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};