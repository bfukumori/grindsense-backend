import { Temporal } from '@js-temporal/polyfill';
import { AppError } from '@/utils/app-error';

type ComplianceInput = {
  birthDateString: string;
  guardianEmail?: string | undefined;
};

type ComplianceOutput = {
  isMinor: boolean;
  accountStatus: 'PENDING_GUARDIAN_CONSENT' | 'ACTIVE';
  birthDate: Temporal.PlainDate;
};

export function resolveOnboardingCompliance({
  birthDateString,
  guardianEmail,
}: ComplianceInput): ComplianceOutput {
  const birthDate = Temporal.PlainDate.from(birthDateString);
  const today = Temporal.Now.zonedDateTimeISO('America/Sao_Paulo').toPlainDate();

  if (Temporal.PlainDate.compare(birthDate, today) > 0) {
    throw new AppError(400, 'Data de nascimento não pode estar no futuro.');
  }

  const age = birthDate.until(today, { largestUnit: 'years' }).years;
  const isMinor = age < 16;

  if (isMinor && !guardianEmail) {
    throw new AppError(400, 'E-mail do responsável é obrigatório para menores de 16 anos.');
  }

  return {
    isMinor,
    accountStatus: isMinor ? 'PENDING_GUARDIAN_CONSENT' : 'ACTIVE',
    birthDate,
  };
}
