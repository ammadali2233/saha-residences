/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase?: import('./lib/supabase').Supabase;
    userId?: string | null;
    aal?: string | null;
    profile?: { display_name: string; role: 'admin' | 'staff' | 'partner' };
  }
}
