import {createClient} from '@supabase/supabase-js';
// Publishable values already used by the original browser app. Vercel envs override them.
const url=import.meta.env.VITE_SUPABASE_URL||'https://kodoaetpgezdkecmexbm.supabase.co';
const key=import.meta.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_w5RgkvbP_uIPWfhAJHxElQ_1AOHSv3M';
export const supabase=url&&key?createClient(url,key):null;
