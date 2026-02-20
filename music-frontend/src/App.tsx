import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import AxiosInterceptor from "./components/AxiosInterceptor";

// Pages
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import AddSong from "./pages/AddSong";
import Artists from "./pages/Artists";
import PlaylistDetail from "./pages/PlaylistDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";

// If not logged in, force them to /login
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter>
          <AxiosInterceptor>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes (Wrapped in Layout) */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Home />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Search />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Library />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-song"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AddSong />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/artists"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Artists />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/playlist/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PlaylistDetail />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AxiosInterceptor>
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;
