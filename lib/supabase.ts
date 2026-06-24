import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from environment variables.');
}

// Only intercept if we are hitting InsForge
const useInsForgeInterceptor = supabaseUrl.includes('insforge.app');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, useInsForgeInterceptor ? {
  global: {
    fetch: (url, options) => {
      let targetUrl = '';
      if (typeof url === 'string') {
        targetUrl = url;
      } else if (url && typeof url === 'object' && 'url' in url) {
        targetUrl = (url as any).url;
      } else {
        targetUrl = url.toString();
      }

      const replacedUrl = targetUrl.replace('/rest/v1/', '/api/database/records/');
      console.log(`[Supabase Interceptor] Routing ${targetUrl} -> ${replacedUrl}`);
      return fetch(replacedUrl, options);
    }
  }
} : {});

