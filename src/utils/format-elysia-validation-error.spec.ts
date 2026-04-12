/** biome-ignore-all lint/suspicious/noExplicitAny: <tests> */
import { describe, expect, it } from 'bun:test';
import type { ValidationError } from 'elysia';
import { formatElysiaValidationError } from './format-elysia-validation-error';

describe('#formatElysiaValidationError utility (unit test)', () => {
  it('should return a generic message if error.all is missing', () => {
    const mockError = { message: 'Custom error' } as ValidationError;

    const result = formatElysiaValidationError(mockError);

    expect(result).toEqual({ message: 'Custom error' });
  });

  it('should format Enum/Union validation errors (anyOf)', () => {
    const mockError = {
      all: [
        {
          path: '/difficulty',
          message: 'Expected string',
          schema: {
            anyOf: [{ const: 'EASY' }, { const: 'MEDIUM' }, { const: 'HARD' }],
          },
        },
      ],
    } as unknown as ValidationError;

    const result = formatElysiaValidationError(mockError) as {
      error: string;
      issues: any[];
    };

    expect(result.error).toBe('Validation Failed');
    expect(result.issues[0]?.path).toBe('difficulty');
    expect(result.issues[0]?.message).toBe('Invalid value. Expected one of: EASY, MEDIUM, HARD');
    expect(result.issues[0]?.expected_options).toEqual(['EASY', 'MEDIUM', 'HARD']);
  });

  it('should format empty body errors (Expected object at root)', () => {
    const mockError = {
      all: [
        {
          path: '',
          message: 'Expected object',
          schema: {
            required: ['title', 'difficulty'],
            properties: { title: { type: 'string' } },
          },
        },
      ],
    } as unknown as ValidationError;

    const result = formatElysiaValidationError(mockError) as {
      error: string;
      issues: any[];
    };

    expect(result.issues[0]?.path).toBe('body');
    expect(result.issues[0]?.message).toBe(
      'Request body is missing or empty. Expected an object with: title, difficulty',
    );
    expect(result.issues[0]?.expected_options).toEqual({
      title: { type: 'string' },
    });
  });

  it('should format missing required property errors (type 45)', () => {
    const mockError = {
      all: [
        {
          path: '/title',
          type: 45,
          message: 'Expected string',
          schema: {},
        },
      ],
    } as unknown as ValidationError;

    const result = formatElysiaValidationError(mockError) as {
      error: string;
      issues: any[];
    };

    expect(result.issues[0]?.path).toBe('title');
    expect(result.issues[0]?.message).toBe("Property 'title' is required but missing.");
    expect(result.issues[0]?.expected_options).toBeUndefined();
  });

  it('should format missing required property errors by message content', () => {
    const mockError = {
      all: [
        {
          path: '/email',
          type: 0,
          message: 'Required property missing',
          schema: {},
        },
      ],
    } as unknown as ValidationError;

    const result = formatElysiaValidationError(mockError) as {
      error: string;
      issues: any[];
    };

    expect(result.issues[0]?.path).toBe('email');
    expect(result.issues[0]?.message).toBe("Property 'email' is required but missing.");
  });
});
