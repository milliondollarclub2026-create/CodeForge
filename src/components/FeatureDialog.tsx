import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, X } from "lucide-react";

interface Feature {
  id: number;
  title: string;
  description: string;
}

interface FeatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string }) => void;
  onDelete?: () => void;
  feature?: Feature | null;
}

export const FeatureDialog = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  feature,
}: FeatureDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const isEditing = feature != null;

  useEffect(() => {
    if (isOpen && isEditing) {
      setTitle(feature.title);
      setDescription(feature.description);
    } else {
      setTitle("");
      setDescription("");
    }
  }, [isOpen, feature, isEditing]);

  const handleSave = () => {
    if (title.trim()) {
      onSave({ title: title.trim(), description: description.trim() });
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Feature" : "Add New Feature"}</DialogTitle>
        </DialogHeader>
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="grid gap-6 py-4">
          <div className="grid w-full gap-2">
            <Label htmlFor="feature-title">Title</Label>
            <Input
              id="feature-title"
              placeholder="Enter the feature title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-800 border-slate-700 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="grid w-full gap-2">
            <Label htmlFor="feature-description">Description</Label>
            <Textarea
              id="feature-description"
              placeholder="Describe the feature in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] bg-slate-800 border-slate-700 focus:ring-blue-500"
            />
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between">
          <div>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
                aria-label="Delete feature"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
