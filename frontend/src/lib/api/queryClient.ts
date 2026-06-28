import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // App de un solo usuario: los datos solo cambian desde esta misma sesión
      // (las mutaciones invalidan sus claves), así que un staleTime amplio evita
      // refetches innecesarios sin riesgo de mostrar datos de terceros obsoletos.
      staleTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
