import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar, Header, MarketTicker, CommandPalette, WatchlistSidebar, AchievementModal, MemoryManager, ProtectedRoute } from './components/layout';
import { Dashboard, Discovery, DiscoveryList, Market, Portfolio, FundDetail, Investment, Shadow, Settings, Agents, Chat, Login, Register, DailyReport } from './pages';
import { useThemeStore } from './store';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
    },
  },
});

function AppContent() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const { setTheme } = useThemeStore();
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    // Always force dark mode
    setTheme('dark');
    document.documentElement.classList.add('dark');
  }, [setTheme]);

  // Listen for memory manager open event from CommandPalette
  useEffect(() => {
    const handleOpenMemory = () => setIsMemoryOpen(true);
    window.addEventListener('openMemoryManager', handleOpenMemory);
    return () => window.removeEventListener('openMemoryManager', handleOpenMemory);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      <CommandPalette />
      <AchievementModal />
      <WatchlistSidebar />
      <MemoryManager isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} />
      {!isAuthPage && <Sidebar />}
      <div className={!isAuthPage ? "ml-[260px]" : "w-full"}>
        {!isAuthPage && <MarketTicker />}
        {!isAuthPage && <Header />}
        <main className={`${!isAuthPage ? 'h-[calc(100vh-104px)]' : 'min-h-screen'} overflow-y-auto bg-[#0a0a0f]`}>
          <Routes>
            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/discovery" element={<ProtectedRoute><Discovery /></ProtectedRoute>} />
            <Route path="/discovery/view/:type" element={<ProtectedRoute><DiscoveryList /></ProtectedRoute>} />
            <Route path="/discovery/view/:type/:slug" element={<ProtectedRoute><DiscoveryList /></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
            <Route path="/fund/:code" element={<ProtectedRoute><FundDetail /></ProtectedRoute>} />
            <Route path="/fund" element={<ProtectedRoute><Market /></ProtectedRoute>} />
            <Route path="/investment" element={<ProtectedRoute><Investment /></ProtectedRoute>} />
            <Route path="/shadow" element={<ProtectedRoute><Shadow /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><DailyReport /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
