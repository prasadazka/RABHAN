import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { UserProfilePage } from '@/pages/UserProfilePage';
import { ContractorsPage } from '@/pages/ContractorsPage';
import { ContractorProfilePage } from '@/pages/ContractorProfilePage';
import { QuotesPage } from '@/pages/QuotesPage';
import { QuoteDetailPage } from '@/pages/QuoteDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { LoansPage } from '@/pages/LoansPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { CompliancePage } from '@/pages/CompliancePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import '@/styles/globals.css';

// React Query configuration for API caching and state management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * RABHAN Admin Dashboard Application
 * Saudi Arabia's first SAMA-compliant solar BNPL platform administration interface
 * 
 * Features:
 * - Zero-trust authentication with role-based access control
 * - Real-time dashboard with KPIs and compliance monitoring
 * - Full Arabic/English localization with RTL support
 * - Saudi cultural adaptation and Islamic finance compliance
 * - Mobile-first responsive design with WCAG 2.1 AAA accessibility
 */
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <div className="min-h-screen bg-background text-foreground">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  
                  {/* Protected Dashboard Routes */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <Routes>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/users" element={<UsersPage />} />
                            <Route path="/users/:userId" element={<UserProfilePage />} />
                            <Route path="/contractors" element={<ContractorsPage />} />
                            <Route path="/contractors/:contractorId" element={<ContractorProfilePage />} />
                            <Route path="/quotes" element={<QuotesPage />} />
                            <Route path="/quotes/:quoteId" element={<QuoteDetailPage />} />
                            <Route path="/products" element={<ProductsPage />} />
                            <Route path="/loans" element={<LoansPage />} />
                            <Route path="/analytics" element={<AnalyticsPage />} />
                            <Route path="/compliance" element={<CompliancePage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            
                            {/* Catch-all route for 404 */}
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                          </Routes>
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>

                {/* Global Toast Notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'calc(var(--radius) - 2px)',
                    },
                    success: {
                      iconTheme: {
                        primary: 'hsl(var(--primary))',
                        secondary: 'hsl(var(--primary-foreground))',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: 'hsl(var(--destructive))',
                        secondary: 'hsl(var(--destructive-foreground))',
                      },
                    },
                  }}
                />

                {/* Loading Spinner Overlay */}
                <React.Suspense fallback={<LoadingSpinner />}>
                  {/* Content is rendered through routes */}
                </React.Suspense>
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;