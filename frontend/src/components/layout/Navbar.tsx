import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROUTES, APP_NAME } from '@/utils/constants';
import { Button } from '@/components/common/Button';
import { Container } from './Container';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { getInitials } from '@/utils/helpers';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <Container>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">ג</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.DASHBOARD}
                  className={`text-sm font-medium transition-colors ${
                    isActive(ROUTES.DASHBOARD)
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to={ROUTES.HISTORY}
                  className={`text-sm font-medium transition-colors ${
                    isActive(ROUTES.HISTORY)
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Historial
                </Link>
                <Link
                  to={ROUTES.PRICING}
                  className={`text-sm font-medium transition-colors ${
                    isActive(ROUTES.PRICING)
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Planes
                </Link>

                {/* User Menu */}
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center gap-2 rounded-full hover:bg-gray-100 p-2 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {getInitials(user?.user_metadata?.full_name || user?.email || '')}
                      </span>
                    </div>
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="p-2">
                        <div className="px-3 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.user_metadata?.full_name || 'Usuario'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                          </p>
                        </div>

                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to={ROUTES.SETTINGS}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } group flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-gray-700`}
                            >
                              <CogIcon className="h-4 w-4" />
                              Configuración
                            </Link>
                          )}
                        </Menu.Item>

                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleSignOut}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } group flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-gray-700`}
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4" />
                              Cerrar sesión
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.PRICING}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Planes
                </Link>
                <Link
                  to={ROUTES.ABOUT}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Acerca de
                </Link>
                <Link to={ROUTES.LOGIN}>
                  <Button variant="ghost" size="sm">
                    Iniciar sesión
                  </Button>
                </Link>
                <Link to={ROUTES.REGISTER}>
                  <Button variant="primary" size="sm">
                    Registrarse
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <Link
                  to={ROUTES.DASHBOARD}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to={ROUTES.HISTORY}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Historial
                </Link>
                <Link
                  to={ROUTES.PRICING}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Planes
                </Link>
                <Link
                  to={ROUTES.SETTINGS}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Configuración
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg text-left"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to={ROUTES.PRICING}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Planes
                </Link>
                <Link
                  to={ROUTES.ABOUT}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Acerca de
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="ghost" size="sm" fullWidth>
                    Iniciar sesión
                  </Button>
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="primary" size="sm" fullWidth>
                    Registrarse
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </Container>
    </nav>
  );
};