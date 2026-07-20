import { Link } from 'react-router-dom';
import { Container } from './Container';
import { APP_NAME, ROUTES } from '@/utils/constants';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <Container>
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link to={ROUTES.HOME} className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">ג</span>
                </div>
                <span className="font-semibold text-lg text-gray-900">
                  {APP_NAME}
                </span>
              </Link>
              <p className="text-sm text-gray-600 max-w-md">
                Asistente de estudio académico para análisis de gematría e
                interpretación de textos sagrados. Combinando cálculo determinista
                con inteligencia artificial.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Navegación</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to={ROUTES.HOME}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link
                    to={ROUTES.PRICING}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Planes
                  </Link>
                </li>
                <li>
                  <Link
                    to={ROUTES.ABOUT}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Acerca de
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Términos de uso
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Política de privacidad
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-center text-gray-600">
              © {currentYear} {APP_NAME}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
};