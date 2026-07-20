import { type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Container } from './Container';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showFooter?: boolean;
}

export const PageLayout = ({
  children,
  title,
  description,
  containerSize = 'lg',
  showFooter = true,
}: PageLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-8">
        <Container size={containerSize}>
          {(title || description) && (
            <div className="mb-8">
              {title && (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-gray-600">
                  {description}
                </p>
              )}
            </div>
          )}
          
          {children}
        </Container>
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
};