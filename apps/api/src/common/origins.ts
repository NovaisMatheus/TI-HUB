export function allowedOrigins() {
  const values = [
    process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    ...(process.env.CORS_ORIGINS ?? '').split(','),
  ];
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => {
          const url = new URL(value);
          if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.pathname !== '/' ||
            url.search ||
            url.hash
          )
            throw new Error(
              'Configure CORS_ORIGIN/CORS_ORIGINS com origens http/https, sem caminhos ou credenciais.',
            );
          return url.origin;
        }),
    ),
  ];
}
export function originAllowed(origin: string) {
  return allowedOrigins().includes(origin);
}
