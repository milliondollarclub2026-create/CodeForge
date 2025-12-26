import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

interface AddUserFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  parentNodeId: string;
  parentPosition: { x: number; y: number };
  onNodeCreated: (node: any) => void;
}

const userFlowSchema = z.object({
  flow_name: z.string().min(1, "Flow name is required").max(100, "Flow name must be 100 characters or less").transform(s => s.trim()),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be 500 characters or less").transform(s => s.trim()),
  start_state: z.string().min(1, "Start state is required").max(100, "Start state must be 100 characters or less").transform(s => s.trim()),
  end_state: z.string().min(1, "End state is required").max(100, "End state must be 100 characters or less").transform(s => s.trim()),
  steps: z.array(z.string().min(1, "Step cannot be empty").max(200, "Step must be 200 characters or less")).min(2, "At least 2 steps required"),
  notes: z.string().max(2000, "Notes must be 2000 characters or less").optional().transform(s => s ? s.trim() : undefined)
});

export const AddUserFlowModal = ({
  isOpen,
  onClose,
  projectId,
  parentNodeId,
  parentPosition,
  onNodeCreated,
}: AddUserFlowModalProps) => {
  const [formData, setFormData] = useState({
    flow_name: "",
    description: "",
    start_state: "",
    end_state: "",
    steps: ["", ""],
    notes: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, ""]
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length <= 2) {
      toast.error("Minimum 2 steps required");
      return;
    }
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? value : step)
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      // Validate form data
      const validated = userFlowSchema.parse(formData);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify project ownership
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      // Get user_flows category ID
      const { data: category } = await supabase
        .from('node_categories')
        .select('id')
        .eq('name', 'user_flows')
        .single();

      if (!category) throw new Error('User Flows category not found');

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
          title: validated.flow_name,
          position_x: position_x,
          position_y: position_y,
          status: 'draft',
          metadata: {
            flow_name: validated.flow_name,
            description: validated.description,
            start_state: validated.start_state,
            end_state: validated.end_state,
            steps: validated.steps,
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
      toast.success(`User flow "${validated.flow_name}" created`);

      // Callback to parent to update React Flow
      onNodeCreated(node);

      // Reset form and close modal
      setFormData({
        flow_name: "",
        description: "",
        start_state: "",
        end_state: "",
        steps: ["", ""],
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
        console.error('Error creating user flow:', error);
        toast.error('Failed to create user flow');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Add User Flow</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Flow Name Field */}
          <div className="space-y-2">
            <Label htmlFor="flow_name">
              Flow Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="flow_name"
              value={formData.flow_name}
              onChange={(e) => setFormData(prev => ({ ...prev, flow_name: e.target.value }))}
              placeholder="e.g., User Signup Flow, Product Purchase, Password Reset"
              className={`bg-slate-800 border-slate-700 focus:ring-purple-500 ${errors.flow_name ? "border-red-500" : ""}`}
              autoFocus
            />
            {errors.flow_name && (
              <p className="text-sm text-red-500">{errors.flow_name}</p>
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
              placeholder="e.g., Complete user registration process from signup to email verification"
              rows={3}
              className={`bg-slate-800 border-slate-700 focus:ring-purple-500 ${errors.description ? "border-red-500" : ""}`}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Start State Field */}
          <div className="space-y-2">
            <Label htmlFor="start_state">
              Start State <span className="text-red-500">*</span>
            </Label>
            <Input
              id="start_state"
              value={formData.start_state}
              onChange={(e) => setFormData(prev => ({ ...prev, start_state: e.target.value }))}
              placeholder="e.g., Homepage, Login page, Product detail page"
              className={`bg-slate-800 border-slate-700 focus:ring-purple-500 ${errors.start_state ? "border-red-500" : ""}`}
            />
            <p className="text-sm text-slate-400">Where does this flow begin?</p>
            {errors.start_state && (
              <p className="text-sm text-red-500">{errors.start_state}</p>
            )}
          </div>

          {/* End State Field */}
          <div className="space-y-2">
            <Label htmlFor="end_state">
              End State <span className="text-red-500">*</span>
            </Label>
            <Input
              id="end_state"
              value={formData.end_state}
              onChange={(e) => setFormData(prev => ({ ...prev, end_state: e.target.value }))}
              placeholder="e.g., Dashboard, Order confirmation, User profile"
              className={`bg-slate-800 border-slate-700 focus:ring-purple-500 ${errors.end_state ? "border-red-500" : ""}`}
            />
            <p className="text-sm text-slate-400">Where does this flow end?</p>
            {errors.end_state && (
              <p className="text-sm text-red-500">{errors.end_state}</p>
            )}
          </div>

          {/* Steps Field */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Flow Steps <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                onClick={addStep}
                size="sm"
                className="h-8 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </div>
            <p className="text-sm text-slate-400">Add each step in order. Minimum 2 steps required.</p>

            <div className="space-y-3">
              {formData.steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`step-${index}`} className="text-xs text-slate-400">
                      Step {index + 1}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`step-${index}`}
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                        placeholder="e.g., User clicks signup button"
                        className="bg-slate-800 border-slate-700 focus:ring-purple-500"
                      />
                      {formData.steps.length > 2 && (
                        <Button
                          type="button"
                          onClick={() => removeStep(index)}
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.steps && (
              <p className="text-sm text-red-500">{errors.steps}</p>
            )}
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g., Error handling: Show 'Email already exists' if duplicate. Alternative path: Social login available."
              rows={5}
              className={`bg-slate-800 border-slate-700 focus:ring-purple-500 font-mono text-sm ${errors.notes ? "border-red-500" : ""}`}
            />
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
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? "Creating..." : "Create Flow"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
