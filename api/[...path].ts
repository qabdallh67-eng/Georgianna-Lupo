import { createApp } from '../server.ts';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: any, res: any) {
  try {
    appPromise ||= createApp();
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('[vercel-api] application startup failed:', error);
    return res.status(500).json({
      error: 'API_STARTUP_FAILED',
      message_ar: 'تعذر تشغيل خدمات المنصة حالياً. يرجى المحاولة لاحقاً.',
      message_en: 'Platform API failed to start. Please try again later.',
    });
  }
}
