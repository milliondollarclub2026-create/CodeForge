import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { CheckSquare, Plus, Pencil, Zap, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureDialog } from "@/components/FeatureDialog";
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

interface Feature {
  id: number;
  title: string;
  description: string;
}

interface FeaturesNodeProps {
  data: {
    id: string;
    title: string;
    features: Feature[];
    onFeaturesUpdate: (nodeId: string, features: Feature[]) => void;
    connectionSide?: "top" | "right" | "bottom" | "left";
  };
}

export const FeaturesNode = memo(({ data }: FeaturesNodeProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null);

  const openAddDialog = () => {
    setEditingFeature(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (feature: Feature) => {
    setEditingFeature(feature);
    setIsDialogOpen(true);
  };

  const handleSaveFeature = (newData: { title: string; description: string }) => {
    let updatedFeatures;
    if (editingFeature) {
      // Editing existing feature
      updatedFeatures = (data.features || []).map((f) =>
        f.id === editingFeature.id ? { ...f, ...newData } : f
      );
    } else {
      // Adding new feature
      const newFeature = { id: Date.now(), ...newData };
      updatedFeatures = [...(data.features || []), newFeature];
    }
    data.onFeaturesUpdate(data.id, updatedFeatures);
  };

  const handleDeleteFeature = () => {
    if (!editingFeature) return;
    const updatedFeatures = (data.features || []).filter(
      (feature) => feature.id !== editingFeature.id
    );
    data.onFeaturesUpdate(data.id, updatedFeatures);
  };

  const handleQuickDelete = (e: React.MouseEvent, feature: Feature) => {
    e.stopPropagation();
    setFeatureToDelete(feature);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!featureToDelete) return;
    const updatedFeatures = (data.features || []).filter(
      (f) => f.id !== featureToDelete.id
    );
    data.onFeaturesUpdate(data.id, updatedFeatures);
    setShowDeleteDialog(false);
    setFeatureToDelete(null);
  };

  const handleAddComment = (e: React.MouseEvent, feature: Feature) => {
    e.stopPropagation();
    // TODO: Implement comment functionality
    console.log("Add comment for:", feature.title);
  };

  // Determine handle position based on connection side
  const connectionSide = data.connectionSide || "left";
  const handlePosition = {
    top: Position.Top,
    right: Position.Right,
    bottom: Position.Bottom,
    left: Position.Left,
  }[connectionSide];

  // Determine handle positioning styles
  const handleStyles = {
    top: { top: -6, left: "50%", transform: "translateX(-50%)" },
    right: { right: -6, top: "50%", transform: "translateY(-50%)" },
    bottom: { bottom: -6, left: "50%", transform: "translateX(-50%)" },
    left: { left: -6, top: "50%", transform: "translateY(-50%)" },
  }[connectionSide];

  // Determine hover zone positioning
  const hoverZoneClasses = {
    top: "absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-12",
    right: "absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-16",
    bottom: "absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-12",
    left: "absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-16",
  }[connectionSide];

  return (
    <>
      <div
        className={cn(
          "relative px-6 py-5 rounded-2xl shadow-2xl",
          "border-2 transition-all duration-200",
          "min-w-[320px] max-w-[400px]",
          "will-change-transform transform-gpu antialiased",
          "[text-rendering:optimizeLegibility]",
          "bg-slate-950",
          "border-blue-500",
          "shadow-blue-500/10"
        )}
      >
        {/* Single dynamic handle with hover zone */}
        <div
          className={hoverZoneClasses}
          onMouseEnter={() => setIsHandleHovered(true)}
          onMouseLeave={() => setIsHandleHovered(false)}
        >
          <Handle
            type="target"
            position={handlePosition}
            id={connectionSide}
            className={cn(
              "!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-700 transition-opacity duration-200",
              isHandleHovered ? "!opacity-100" : "!opacity-0"
            )}
            style={handleStyles}
          />
        </div>

        {/* Icon and Title */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white leading-tight">
              {data.title}
            </h3>
          </div>
          <Button onClick={openAddDialog} size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-1" />
            Add Feature
          </Button>
        </div>

        {/* Feature list */}
        <div className="space-y-3">
          {(data.features || []).map((feature) => (
            <div key={feature.id} className="relative group cursor-pointer p-3 pr-14 rounded-md bg-slate-900/50 border border-transparent hover:border-blue-500/50 transition-colors" onClick={() => openEditDialog(feature)}>
                <div className="flex items-start gap-3">
                  <CheckSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                  <div>
                    <p className="font-bold text-sm text-slate-100">{feature.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{feature.description}</p>
                  </div>
                </div>
                {/* Action icons: Delete, Comment, Edit (right to left) */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleQuickDelete(e, feature)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                  <button
                    onClick={(e) => handleAddComment(e, feature)}
                    className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                    title="Add comment"
                  >
                    <MessageCircle className="h-3 w-3 text-blue-400" />
                  </button>
                  <button
                    onClick={() => openEditDialog(feature)}
                    className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3 text-blue-400" />
                  </button>
                </div>
            </div>
          ))}
          {(!data.features || data.features.length === 0) && (
            <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded-lg">
                <p className="text-xs text-slate-500">No features added yet.</p>
                <p className="text-xs text-slate-500">Click "Add Feature" to get started.</p>
            </div>
          )}
        </div>
      </div>
      <FeatureDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveFeature}
        onDelete={handleDeleteFeature}
        feature={editingFeature}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{featureToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

FeaturesNode.displayName = "FeaturesNode";