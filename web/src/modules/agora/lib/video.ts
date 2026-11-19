const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

/** Incrustación en modo de privacidad mejorada. Solo se arma con un identificador válido, nunca con una URL recibida. */
export function embedUrl(videoId: string): string | null {
  return isValidVideoId(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
    : null;
}

export function watchUrl(videoId: string): string | null {
  return isValidVideoId(videoId)
    ? `https://www.youtube.com/watch?v=${videoId}`
    : null;
}
