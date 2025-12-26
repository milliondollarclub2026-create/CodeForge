import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Globe, Lock, Users } from "lucide-react";

interface AddDatabaseEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  parentNodeId: string;
  parentPosition: { x: number; y: number };
  onNodeCreated: (node: any) => void;
}

const databaseEntitySchema = z.object({
  entity_name: z.string()
    .min(1, "Entity name is required")
    .max(50, "Entity name must be 50 characters or less")
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      "Must start with a letter and contain only letters, numbers, and underscores"
    )
    .transform(s => {
      const trimmed = s.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }),

  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be 500 characters or less")
    .transform(s => s.trim()),

  security_model: z.enum(["public", "private_owner", "private_user"], {
    required_error: "Please select a security model"
  }),

  notes: z.string()
    .max(2000, "Notes must be 2000 characters or less")
    .optional()
    .transform(s => s ? s.trim() : undefined)
});

export const AddDatabaseEntityModal = ({
  isOpen,
  onClose,
  projectId,
  parentNodeId,
  parentPosition,
  onNodeCreated,
}: AddDatabaseEntityModalProps) => {
  const [formData, setFormData] = useState({
    entity_name: "",
    description: "",
    security_model: "private_owner",
    notes: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Validate form data
      const validated = databaseEntitySchema.parse(formData);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify project ownership (defense in depth with RLS)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      // Get database category ID
      const { data: category } = await supabase
        .from('node_categories')
        .select('id')
        .eq('name', 'database')
        .single();

      if (!category) throw new Error('Database category not found');

      // Calculate position (space siblings horizontally, 250px apart)
      const { data: siblings } = await supabase
        .from('nodes')
        .select('position_x')
        .eq('project_id', projectId)
        .eq('parent_node_id', parentNodeId)
        .order('position_x', { ascending: false })
        .limit(1);

      const position_x = siblings && siblings.length > 0
        ? siblings[0].position_x + 250
        : parentPosition.x;

      const position_y = parentPosition.y + 150;

      // Create node with metadata
      const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          project_id: projectId,
          category_id: category.id,
          parent_node_id: parentNodeId,
          title: validated.entity_name,
          position_x: position_x,
          position_y: position_y,
          status: 'draft',
          metadata: {
            entity_name: validated.entity_name,
            description: validated.description,
            security_model: validated.security_model,
            notes: validated.notes
          }
        })
        .select()
        .single();

      if (nodeError) throw nodeError;

      // Create edge from parent to new node
      const { error: edgeError } = await supabase
        .from('edges')
        .insert({
          project_id: projectId,
          source_node_id: parentNodeId,
          target_node_id: node.id,
          edge_type: 'parent_child'
        });

      if (edgeError) throw edgeError;

      // Success feedback
      toast.success(`Database entity "${validated.entity_name}" created`);

      // Callback to parent to update React Flow
      onNodeCreated(node);

      // Reset form and close modal
      setFormData({
        entity_name: "",
        description: "",
        security_model: "private_owner",
        notes: ""
      });
      onClose();

    } catch (error) {
      if (error instanceof z.ZodError) {
        // Validation errors - map to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        // Database or authentication errors
        console.error('Error creating database entity:', error);
        toast.error('Failed to create database entity');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Add Database Entity</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Entity Name Field */}
          <div className="space-y-2">
            <Label htmlFor="entity_name">
              Entity Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="entity_name"
              value={formData.entity_name}
              onChange={(e) => setFormData(prev => ({ ...prev, entity_name: e.target.value }))}
              onBlur={(e) => {
                // Auto-capitalize on blur
                const value = e.target.value.trim();
                if (value) {
                  setFormData(prev => ({
                    ...prev,
                    entity_name: value.charAt(0).toUpperCase() + value.slice(1)
                  }));
                }
              }}
              placeholder="e.g., Users, Products, Orders, Comments"
              className={`bg-slate-800 border-slate-700 focus:ring-blue-500 ${errors.entity_name ? "border-red-500" : ""}`}
              autoFocus
            />
            <p className="text-sm text-slate-400">
              What is this database table/collection called?
            </p>
            {errors.entity_name && (
              <p className="text-sm text-red-500">{errors.entity_name}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Stores user account information including email, password, profile data"
              rows={3}
              className={`bg-slate-800 border-slate-700 focus:ring-blue-500 ${errors.description ? "border-red-500" : ""}`}
            />
            <p className="text-sm text-slate-400">
              What does this entity represent? What kind of data does it store?
            </p>
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Security Model Radio Group */}
          <div className="space-y-3">
            <Label>
              Security Model <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-slate-400">
              Who can access data in this entity?
            </p>
            <RadioGroup
              value={formData.security_model}
              onValueChange={(value) => setFormData(prev => ({ ...prev, security_model: value }))}
              className="grid gap-3 md:grid-cols-3"
            >
              {/* Public Option */}
              <div>
                <RadioGroupItem
                  value="public"
                  id="public"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="public"
                  className="flex flex-col items-start gap-2 rounded-lg border-2 border-slate-700 bg-slate-800 p-4 hover:bg-slate-800/80 hover:border-green-500/50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-500/10 cursor-pointer transition-all"
                >
                  <Globe className="w-5 h-5 text-green-500" />
                  <div className="space-y-1">
                    <p className="font-medium leading-none">Public</p>
                    <p className="text-sm text-slate-400">
                      Anyone can read this data
                    </p>
                    <p className="text-xs text-slate-500">
                      Blog posts, product catalog
                    </p>
                  </div>
                </Label>
              </div>

              {/* Owner Only Option */}
              <div>
                <RadioGroupItem
                  value="private_owner"
                  id="private_owner"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="private_owner"
                  className="flex flex-col items-start gap-2 rounded-lg border-2 border-slate-700 bg-slate-800 p-4 hover:bg-slate-800/80 hover:border-blue-500/50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-500/10 cursor-pointer transition-all"
                >
                  <Lock className="w-5 h-5 text-blue-500" />
                  <div className="space-y-1">
                    <p className="font-medium leading-none">Owner Only</p>
                    <p className="text-sm text-slate-400">
                      Users access their own records
                    </p>
                    <p className="text-xs text-slate-500">
                      User settings, private projects
                    </p>
                  </div>
                </Label>
              </div>

              {/* Authenticated Users Option */}
              <div>
                <RadioGroupItem
                  value="private_user"
                  id="private_user"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="private_user"
                  className="flex flex-col items-start gap-2 rounded-lg border-2 border-slate-700 bg-slate-800 p-4 hover:bg-slate-800/80 hover:border-orange-500/50 peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-500/10 cursor-pointer transition-all"
                >
                  <Users className="w-5 h-5 text-orange-500" />
                  <div className="space-y-1">
                    <p className="font-medium leading-none">Authenticated Users</p>
                    <p className="text-sm text-slate-400">
                      All logged-in users can access
                    </p>
                    <p className="text-xs text-slate-500">
                      Team resources, shared docs
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            {errors.security_model && (
              <p className="text-sm text-red-500">{errors.security_model}</p>
            )}
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={`e.g.,
- Relationships: Belongs to Users (user_id), has many Projects
- Fields: email (unique), password_hash, email_verified, avatar_url
- Needs email verification tokens with 24h expiry
- Uses soft deletes (deleted_at timestamp)
- Indexes on email and created_at`}
              rows={5}
              className={`bg-slate-800 border-slate-700 focus:ring-blue-500 font-mono text-sm ${errors.notes ? "border-red-500" : ""}`}
            />
            <p className="text-sm text-slate-400">
              Special requirements: relationships, fields, constraints, indexes, or implementation details
            </p>
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Creating..." : "Create Entity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
