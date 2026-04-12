import { Elysia, t } from 'elysia';

export const IotModel = new Elysia({ name: 'model:iot' }).model({
  'Iot.ClaimDeviceBody': t.Object({
    macAddress: t.String({
      pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
    }),
  }),
  'Iot.TelemetryHeaders': t.Object({
    'x-device-id': t.String(),
    'x-device-signature': t.String(),
  }),
  'Iot.TelemetryBody': t.Object({
    bpm: t.Number(),
    spo2: t.Optional(t.Number()),
    timestamp: t.Number(),
  }),
});
