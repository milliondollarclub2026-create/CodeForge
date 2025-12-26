import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { CheckSquare, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureDialog } from "@/components/FeatureDialog";

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
  };
}

export const FeaturesNode = memo(({ data }: FeaturesNodeProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

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
        {/* Handles for connections */}
        <Handle type="source" position={Position.Top} id="top" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />
        <Handle type="target" position={Position.Top} id="top" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />
        <Handle type="source" position={Position.Right} id="right" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />
        <Handle type="target" position={Position.Right} id="right" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />
        <Handle type="source" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />
        <Handle type="target" position={Position.Bottom} id="bottom" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />
        <Handle type="source" position={Position.Left} id="left" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />
        <Handle type="target" position={Position.Left} id="left" className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950" />

        {/* Icon and Title */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-blue-400" />
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
            <div key={feature.id} className="relative group cursor-pointer p-3 rounded-md bg-slate-900/50 border border-transparent hover:border-blue-500/50 transition-colors" onClick={() => openEditDialog(feature)}>
                <p className="font-bold text-sm text-slate-100">{feature.title}</p>
                <p className="text-xs text-slate-400 mt-1">{feature.description}</p>
                 <Pencil className="h-3 w-3 absolute top-2 right-2 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
    </>
  );
});

FeaturesNode.displayName = "FeaturesNode";