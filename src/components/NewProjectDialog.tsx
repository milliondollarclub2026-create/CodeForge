import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { z } from "zod";

const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Project name is required" })
    .max(100, { message: "Project name must be 100 characters or less" }),
  description: z
    .string()
    .trim()
    .max(1000, { message: "Description must be 1000 characters or less" })
    .optional()
    .nullable(),
});

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
}

export const NewProjectDialog = ({
  open,
  onOpenChange,
  onProjectCreated,
}: NewProjectDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate with Zod
      const validation = projectSchema.safeParse({ name, description });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Get authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be signed in to create a project");
        setLoading(false);
        return;
      }

      // Insert project with user_id from session (not user input)
      const { data: projectData, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id, // From session, not user input - prevents spoofing
          name: validation.data.name.trim(),
          description: validation.data.description?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate name error
        if (error.code === "23505") {
          toast.error("A project with this name already exists");
        } else {
          toast.error("Failed to create project. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Create root node for the project
      if (projectData) {
        // Fetch root category
        const { data: rootCategory, error: categoryError } = await supabase
          .from("node_categories")
          .select("id")
          .eq("name", "root")
          .single();

        if (categoryError || !rootCategory) {
          console.error("Failed to fetch root category:", categoryError);
          toast.error("Project created, but root node initialization failed");
        } else {
          // Create root node
          const { error: nodeError } = await supabase.from("nodes").insert({
            project_id: projectData.id,
            category_id: rootCategory.id,
            parent_node_id: null, // Root has no parent
            title: validation.data.name.trim(), // Use project name
            position_x: 0,
            position_y: 0,
            status: "draft",
            priority: null,
          });

          if (nodeError) {
            console.error("Failed to create root node:", nodeError);
            toast.error("Project created, but root node initialization failed");
          }
        }
      }

      toast.success("Project created successfully!");
      setName("");
      setDescription("");
      onOpenChange(false);
      onProjectCreated();
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setDescription("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to organize your work. You can add more details
            later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this project is about..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                maxLength={1000}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

