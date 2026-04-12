import { createHmac, timingSafeEqual } from 'node:crypto';
import { Elysia } from 'elysia';
import { redis } from '@/db/redis';
import { IotModel } from '@/modules/iot/iot.model';

export const iotAuthPlugin = new Elysia({ name: 'plugin:iot-auth' })
  .use(IotModel)
  .onBeforeHandle(async ({ headers, body, status }) => {
    const safeHeaders = headers as Record<string, string | undefined>;
    const deviceId = safeHeaders['x-device-id'];
    const signature = safeHeaders['x-device-signature'];

    if (!deviceId || !signature) {
      return status(401, 'Missing device credentials');
    }

    const secret = await redis.get(`device:secret:${deviceId}`);
    if (!secret) return status(403, 'Unauthorized Device');

    const payload = body as { timestamp?: number } | undefined;
    const payloadTimestamp = payload?.timestamp;

    if (!payloadTimestamp) {
      return status(400, 'Missing timestamp in payload');
    }

    // Prevenção de Replay Attack
    const currentEpochMs = Date.now();

    if (Math.abs(currentEpochMs - payloadTimestamp) > 30_000) {
      return status(401, 'Replay Attack');
    }

    // Validação HMAC
    const expectedSignature = createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.byteLength !== expectedBuffer.byteLength ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return status(403, 'Invalid HMAC');
    }
  });
