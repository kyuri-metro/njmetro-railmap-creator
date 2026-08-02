import { useEffect, useRef } from 'react';

export type IframeToolMessage = {
  source?: string;
  type?: string;
  ok?: boolean;
  yaml?: string;
  json?: string;
  message?: string;
};

export type UseIframeToolMessagesOptions = {
  open: boolean;
  baseUrl: string;
  childSource: string;
  onMessage: (data: IframeToolMessage, context: { origin: string; event: MessageEvent }) => void;
};

/** 监听指定 origin + source 的 iframe postMessage。 */
export function useIframeToolMessages({
  open,
  baseUrl,
  childSource,
  onMessage,
}: UseIframeToolMessagesOptions) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!open || !baseUrl) {
      return;
    }

    let expectedOrigin = '';
    try {
      expectedOrigin = new URL(baseUrl).origin;
    } catch {
      return;
    }

    const onMsg = (event: MessageEvent) => {
      if (expectedOrigin && event.origin !== expectedOrigin) {
        return;
      }

      const data = event.data as IframeToolMessage;
      if (!data || data.source !== childSource) {
        return;
      }

      onMessageRef.current(data, { origin: expectedOrigin, event });
    };

    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [open, baseUrl, childSource]);
}
