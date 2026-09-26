import type { AdminRole } from '@/lib/auth/types';

export type FaqItemRow = {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  category: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type VideoTutorialRow = {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: string;
  video_url: string;
  description: string | null;
  display_order: number;
  category: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export function canReadCms(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'content' ||
    role === 'support' ||
    role === 'viewer'
  );
}

export function canMutateCms(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

/** Plain-text only — never render as HTML. */
export function sanitizePlainText(value: string, max = 20000): string {
  return value.replace(/\0/g, '').trim().slice(0, max);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidVideoUrl(value: string): boolean {
  if (!isValidHttpUrl(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      host.includes('youtube.com') ||
      host === 'youtu.be' ||
      host.includes('vimeo.com') ||
      host.endsWith('.mp4') ||
      url.pathname.toLowerCase().endsWith('.mp4')
    ) {
      return true;
    }
    // Allow other https hosts (CDN / storage) if clearly a URL
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getVideoPreviewHref(url: string): string | null {
  if (!isValidHttpUrl(url)) return null;
  return url;
}
