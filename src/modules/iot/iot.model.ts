import { Elysia, t } from 'elysia';

export const IotModel = new Elysia({ name: 'model:iot' }).model({
  'Iot.ClaimDeviceBody': t.Object({
    macAddress: t.String({
      pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
      error: 'Endereço MAC inválido. Formato esperado: AA:BB:CC:DD:EE:FF.',
    }),
  }),
  'Iot.TelemetryHeaders': t.Object({
    'x-device-id': t.String({
      error: 'O cabeçalho x-device-id é obrigatório.',
    }),
    'x-device-signature': t.String({
      error: 'A assinatura do dispositivo é obrigatória.',
    }),
  }),
  'Iot.TelemetryBody': t.Object({
    bpm: t.Number({ error: 'Frequência cardíaca (BPM) deve ser um número.' }),
    spo2: t.Optional(t.Number({ error: 'Saturação (SpO2) deve ser um número.' })),
    timestamp: t.Number({ error: 'O timestamp da leitura é obrigatório.' }),
  }),
});
