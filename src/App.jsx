import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Criando a configuração do React Query
const queryClient = new QueryClient()

function App() {
  return (
    // Essa linha é OBRIGATÓRIA para o site funcionar
    <QueryClientProvider client={queryClient}>
      <Pages />
      <Toaster />
    </QueryClientProvider>
  )
}

export default App