import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}: CardProps) => {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-sm',
    bordered: 'bg-white border-2 border-gray-300',
    elevated: 'bg-white shadow-lg',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-xl',
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className }: CardHeaderProps) => {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle = ({ children, className }: CardTitleProps) => {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  );
};

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent = ({ children, className }: CardContentProps) => {
  return (
    <div className={cn('text-gray-700', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = ({ children, className }: CardFooterProps) => {
  return (
    <div className={cn('mt-4 pt-4 border-t border-gray-200', className)}>
      {children}
    </div>
  );
};