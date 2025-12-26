import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Search, Plus, Code2, X, LogOut, LayoutGrid, List } from "lucide-react";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { formatDistanceToNow, format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setLoading(false);
          setProjects([]);
          setFilteredProjects([]);
        } else {
          fetchProjects(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProjects(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Filter projects based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.description &&
          project.description.toLowerCase().includes(query))
    );
    setFilteredProjects(filtered);
  }, [searchQuery, projects]);

  const fetchProjects = async (userId: string) => {
    setLoading(true);
    try {
      // Get authenticated user first
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser || currentUser.id !== userId) {
        setLoading(false);
        return;
      }

      // Query with explicit user_id filter (RLS also protects, but defense in depth)
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId) // CRITICAL: Always filter by user_id
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
        setProjects([]);
        setFilteredProjects([]);
      } else {
        setProjects(data || []);
        setFilteredProjects(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = () => {
    if (user) {
      fetchProjects(user.id);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !user) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectToDelete)
        .eq("user_id", user.id); // Security: verify ownership

      if (error) {
        console.error("Error deleting project:", error);
        toast.error("Failed to delete project");
      } else {
        toast.success("Project deleted successfully");
        fetchProjects(user.id);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        toast.error("Failed to sign out");
      } else {
        toast.success("Signed out successfully");
        navigate("/auth");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-6 w-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-semibold text-foreground mb-3">
            Welcome
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to continue to your account
          </p>
          <Button
            onClick={() => navigate("/auth")}
            className="auth-button h-11 px-8"
          >
            Get started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                Your Projects
              </h1>
              <p className="text-muted-foreground">
                Manage and organize your projects
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="h-9"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>

          {/* Search, View Toggle, and New Project Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex border border-border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-11 w-11 rounded-none"
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="h-11 w-11 rounded-none"
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                className="h-11 px-6 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        </div>

        {/* Projects Display */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <Code2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {projects.length === 0
                  ? "No projects yet"
                  : "No projects found"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {projects.length === 0
                  ? "Get started by creating your first project"
                  : "Try adjusting your search query"}
              </p>
              {projects.length === 0 && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="h-11 px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer hover:shadow-lg transition-shadow border-border hover:border-primary/50 relative"
                onClick={() => handleProjectClick(project.id)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(project.id);
                    setDeleteDialogOpen(true);
                  }}
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>

                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Code2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 truncate">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Updated{" "}
                      {formatDistanceToNow(new Date(project.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer hover:shadow-md transition-shadow border-border hover:border-primary/50"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <Code2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 truncate">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground/70 mb-0.5">Created</div>
                        <div>{format(new Date(project.created_at), "MMM d, yyyy")}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground/70 mb-0.5">Modified</div>
                        <div>{format(new Date(project.updated_at), "MMM d, yyyy")}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProjectCreated={handleProjectCreated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
