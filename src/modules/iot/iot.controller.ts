import { Elysia } from 'elysia';
import { redis } from '@/db/redis';
import { authMacro } from '@/plugins/auth.plugin';
import { dbPlugin } from '@/plugins/db.plugin';
import { iotAuthPlugin } from '@/plugins/iot-auth.plugin';
import { IotModel } from './iot.model';
import { IotService } from './iot.service';

const STREAM_KEY = 'stream:iot_telemetry';

export const iotController = new Elysia({ name: 'controller:iot' })
  .use(dbPlugin)
  .use(IotModel)
  .derive(({ db }) => ({ iotService: new IotService(db) }))
  .use(authMacro)
  .post(
    '/claim',
    async ({ body, user, iotService }) => {
      return await iotService.claimDevice(user.id, body.macAddress);
    },
    {
      auth: true,
      body: 'Iot.ClaimDeviceBody',
      detail: {
        summary: 'Registro dispositivo IoT na conta do usuário',
        description:
          'Permite que um usuário registre um dispositivo IoT usando seu endereço MAC. O dispositivo será associado à conta do usuário para futuras interações.',
      },
    },
  )
  .guard(
    {
      headers: 'Iot.TelemetryHeaders',
      body: 'Iot.TelemetryBody',
      detail: {
        summary: 'Receber telemetria de dispositivos IoT',
        description:
          'Endpoint para receber dados de telemetria enviados por dispositivos IoT. Os dados são armazenados em um stream Redis para processamento assíncrono posterior. Requer autenticação específica para dispositivos IoT usando o plugin iotAuthPlugin.',
      },
    },
    (app) =>
      app.use(iotAuthPlugin).post('/telemetry', async ({ headers, body, set }) => {
        const deviceId = headers['x-device-id'];

        await redis.xadd(STREAM_KEY, '*', 'deviceId', deviceId, 'payload', JSON.stringify(body));

        set.status = 202;
        return { success: true };
      }),
  );
