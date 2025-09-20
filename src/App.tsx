import { Route, Router } from '@solidjs/router';
import { CatchAllRoute, ProtectedRoute, PublicRoute } from './components/routes';
import { AuthProvider } from './contexts/auth.context';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import ProjectPage from './pages/project';
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
        <Route
          path="/project/:id"
          component={() => (
            <ProtectedRoute>
              <ProjectPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/*all" component={CatchAllRoute} />
      </Router>
    </AuthProvider>
  );
}

export default App;