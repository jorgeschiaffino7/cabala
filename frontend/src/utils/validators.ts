import { PATTERNS } from './constants';

/**
 * Validate email format
 */
export const validateEmail = (email: string): string | true => {
  if (!email) return 'El email es requerido';
  if (!PATTERNS.EMAIL.test(email)) return 'Email inválido';
  return true;
};

/**
 * Validate password
 */
export const validatePassword = (password: string): string | true => {
  if (!password) return 'La contraseña es requerida';
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  return true;
};

/**
 * Validate password confirmation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmation: string
): string | true => {
  if (!confirmation) return 'Confirma tu contraseña';
  if (password !== confirmation) return 'Las contraseñas no coinciden';
  return true;
};

/**
 * Validate query text
 */
export const validateQueryText = (text: string): string | true => {
  if (!text || text.trim() === '') {
    return 'Por favor ingresa un texto para analizar';
  }
  
  if (text.length > 500) {
    return 'El texto no puede exceder 500 caracteres';
  }
  
  return true;
};

/**
 * Validate required field
 */
export const validateRequired = (
  value: string | null | undefined,
  fieldName = 'Este campo'
): string | true => {
  if (!value || value.trim() === '') {
    return `${fieldName} es requerido`;
  }
  return true;
};

/**
 * Validate name
 */
export const validateName = (name: string): string | true => {
  if (!name) return 'El nombre es requerido';
  if (name.length < 2) return 'El nombre debe tener al menos 2 caracteres';
  if (name.length > 50) return 'El nombre no puede exceder 50 caracteres';
  return true;
};

/**
 * Check if text contains Hebrew characters
 */
export const hasHebrewCharacters = (text: string): boolean => {
  return PATTERNS.HEBREW.test(text);
};

/**
 * Validate URL format
 */
export const validateUrl = (url: string): string | true => {
  if (!url) return 'La URL es requerida';
  try {
    new URL(url);
    return true;
  } catch {
    return 'URL inválida';
  }
};

/**
 * Validate minimum length
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName = 'Este campo'
): string | true => {
  if (!value) return `${fieldName} es requerido`;
  if (value.length < minLength) {
    return `${fieldName} debe tener al menos ${minLength} caracteres`;
  }
  return true;
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName = 'Este campo'
): string | true => {
  if (!value) return true; // Only validate if value exists
  if (value.length > maxLength) {
    return `${fieldName} no puede exceder ${maxLength} caracteres`;
  }
  return true;
};