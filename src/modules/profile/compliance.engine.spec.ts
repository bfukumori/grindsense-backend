import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { Temporal } from '@js-temporal/polyfill';
import { AppError } from '@/utils/app-error';
import { resolveOnboardingCompliance } from './compliance.engine';

describe('Domain Policy: resolveOnboardingCompliance', () => {
  let nowSpy: ReturnType<typeof spyOn>;

  const MOCK_TODAY = Temporal.ZonedDateTime.from({
    year: 2026,
    month: 4,
    day: 13,
    timeZone: 'America/Sao_Paulo',
  });

  beforeAll(() => {
    nowSpy = spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(MOCK_TODAY);
  });

  afterAll(() => {
    nowSpy.mockRestore();
  });

  it('it should return ACTIVE and isMinor: false for an adult (>= 16 years)', () => {
    const result = resolveOnboardingCompliance({
      birthDateString: '1990-05-15', // Idade: 35 anos na data mockada
    });

    expect(result.isMinor).toBe(false);
    expect(result.accountStatus).toBe('ACTIVE');
    expect(result.birthDate.toString()).toBe('1990-05-15');
  });

  it('it should return PENDING_GUARDIAN_CONSENT for a minor (< 16) WITH guardian email', () => {
    const result = resolveOnboardingCompliance({
      birthDateString: '2015-10-10', // Idade: 10 anos na data mockada
      guardianEmail: 'parent@domain.com',
    });

    expect(result.isMinor).toBe(true);
    expect(result.accountStatus).toBe('PENDING_GUARDIAN_CONSENT');
  });

  it('it should throw AppError (Fail-fast) if a minor (< 16) does not provide guardian email', () => {
    expect(() => {
      resolveOnboardingCompliance({
        birthDateString: '2015-10-10', // Idade: 10 anos
        guardianEmail: undefined,
      });
    }).toThrow(new AppError(400, 'E-mail do responsável é obrigatório para menores de 16 anos.'));
  });

  describe('Edge Cases de Calendário (Boundary Testing)', () => {
    it('it should consider ADULTO exactly on the 16th birthday', () => {
      const result = resolveOnboardingCompliance({
        birthDateString: '2010-04-13', // Nasceu no mesmo dia e mês da data mockada
      });

      expect(result.isMinor).toBe(false);
      expect(result.accountStatus).toBe('ACTIVE');
    });

    it('it should consider MENOR DE IDADE exactly 1 day before the 16th birthday', () => {
      const result = resolveOnboardingCompliance({
        birthDateString: '2010-04-14',
        guardianEmail: 'parent@domain.com',
      });

      expect(result.isMinor).toBe(true);
      expect(result.accountStatus).toBe('PENDING_GUARDIAN_CONSENT');
    });

    it('should throw AppError if birth date is in the future', () => {
      expect(() => {
        resolveOnboardingCompliance({
          birthDateString: '8222-12-08',
        });
      }).toThrow(new AppError(400, 'Data de nascimento não pode estar no futuro.'));
    });
  });
});
