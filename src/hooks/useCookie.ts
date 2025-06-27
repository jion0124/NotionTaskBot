import { useCallback } from 'react';

export function useCookie() {
  // クッキー名で値を取得
  const getCookie = useCallback((name: string): string | null => {
    // SSR環境ではdocumentが利用できないため、チェックを追加
    if (typeof document === 'undefined') {
      return null;
    }
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }, []);

  // クッキーを設定
  const setCookie = useCallback((name: string, value: string, options?: {
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }) => {
    // SSR環境ではdocumentが利用できないため、チェックを追加
    if (typeof document === 'undefined') {
      return;
    }

    let cookieString = `${name}=${value}`;
    
    if (options?.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }
    if (options?.path) {
      cookieString += `; path=${options.path}`;
    }
    if (options?.domain) {
      cookieString += `; domain=${options.domain}`;
    }
    if (options?.secure) {
      cookieString += '; secure';
    }
    if (options?.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }
    
    document.cookie = cookieString;
  }, []);

  // クッキーを削除
  const deleteCookie = useCallback((name: string, path?: string) => {
    // SSR環境ではdocumentが利用できないため、チェックを追加
    if (typeof document === 'undefined') {
      return;
    }

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path || '/'};`;
  }, []);

  return { getCookie, setCookie, deleteCookie };
} 