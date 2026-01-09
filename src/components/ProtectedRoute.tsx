import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicAccess } from "@/contexts/PublicAccessContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isOfflineSession } = useAuth();
  const { isPublicAccess } = usePublicAccess();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Allow access if user exists OR if public access is valid
  if (!user && !isPublicAccess) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
