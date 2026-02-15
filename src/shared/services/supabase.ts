import { createClient } from '@supabase/supabase-js';
import { createMMKV } from 'react-native-mmkv';
import { env } from '@config/env';

const mmkv = createMMKV({ id: 'supabase-storage' });

const mmkvStorageAdapter = {
  getItem: (key: string): string | null => {
    return mmkv.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    mmkv.set(key, value);
  },
  removeItem: (key: string): void => {
    mmkv.remove(key);
  },
};

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    storage: mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
