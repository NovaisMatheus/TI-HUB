// HTTP validation writes fixtures and must never target the operational database by default.
if (process.env.HUB_ALLOW_TEST_DATA !== 'true') {
  throw new Error(
    'Este teste grava dados fictícios. Use uma base descartável de homologação e defina HUB_ALLOW_TEST_DATA=true somente no processo de teste. pnpm test não altera a base de uso.',
  );
}
