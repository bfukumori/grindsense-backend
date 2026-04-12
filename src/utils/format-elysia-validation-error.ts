/** biome-ignore-all lint/suspicious/noExplicitAny: <works> */
import type { ValidationError } from 'elysia';

export const formatElysiaValidationError = (error: ValidationError) => {
  if (!error.all) return { message: error.message || 'Unknown validation error' };

  const issues = error.all.map((err) => {
    const path = err.path.substring(1) || 'body';
    let message = err.message;
    let expected = null;

    if (err.schema.anyOf) {
      expected = err.schema.anyOf.map((s: any) => s.const || s.type).filter(Boolean);
      message = `Invalid value. Expected one of: ${expected.join(', ')}`;
    } else if (err.message === 'Expected object' && err.path === '') {
      const requiredFields = err.schema?.required || [];
      message = `Request body is missing or empty. Expected an object with: ${requiredFields.join(', ')}`;
      expected = err.schema?.properties;
    } else if (err.type === 45 || err.message.includes('Required')) {
      message = `Property '${path}' is required but missing.`;
    }

    return {
      path,
      message,
      ...(expected && { expected_options: expected }),
    };
  });

  return {
    error: 'Validation Failed',
    issues,
  };
};
