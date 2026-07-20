import { cn } from '@/utils/helpers';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

export const Spinner = ({ size = 'md', className, color = 'primary' }: SpinnerProps) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  const colors = {
    primary: 'border-gray-300 border-t-blue-600',
    white: 'border-gray-300 border-t-white',
    gray: 'border-gray-300 border-t-gray-600',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full',
        sizes[size],
        colors[color],
        className
      )}
    />
  );
};

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Loading = ({ text = 'Cargando...', size = 'md' }: LoadingProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Spinner size={size} />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
};