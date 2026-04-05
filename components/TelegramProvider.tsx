'use client';

import { useEffect } from 'react';
import {
  init,
  mountViewport,
  expandViewport,
  disableVerticalSwipes,
  mountMiniApp,
  bindMiniAppCssVars,
  bindViewportCssVars,
} from '@telegram-apps/sdk';

export default function TelegramProvider() {
  useEffect(() => {
    try {
      init();
    } catch {
      // Telegram Mini Apps 環境外では何もしない
      return;
    }

    (async () => {
      try {
        if (mountViewport.isAvailable()) {
          await mountViewport();
          bindViewportCssVars();
          if (expandViewport.isAvailable()) {
            await expandViewport();
          }
        }

        if (disableVerticalSwipes.isAvailable()) {
          disableVerticalSwipes();
        }

        if (mountMiniApp.isAvailable()) {
          await mountMiniApp();
          bindMiniAppCssVars();
        }
      } catch {
        // 初期化エラーは無視
      }
    })();
  }, []);

  return null;
}
