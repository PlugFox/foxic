import { Route, Router } from '@solidjs/router';
import { ProtectedRoute, PublicRoute } from './components/routes';
import { AuthProvider } from './contexts/auth.context';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import './styles/app.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Route
          path="/login"
          component={() => (
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          )}
        />
        <Route
          path="/"
          component={() => (
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          )}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;