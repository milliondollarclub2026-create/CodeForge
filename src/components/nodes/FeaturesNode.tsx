import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Zap, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Feature {
  id: string;
  name: string;
}

interface FeaturesNodeProps {
  data: {
    id: string;
    title: string;
    features: Feature[];
    onFeaturesUpdate?: (nodeId: string, features: Feature[]) => void;
  };
}

export const FeaturesNode = memo(({ data }: FeaturesNodeProps) => {
  const [features, setFeatures] = useState<Feature[]>(data.features || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAddFeature = async () => {
    if (!newFeatureName.trim()) {
      toast.error("Feature name cannot be empty");
      return;
    }

    const newFeature: Feature = {
      id: crypto.randomUUID(),
      name: newFeatureName.trim(),
    };

    const updatedFeatures = [...features, newFeature];
    setFeatures(updatedFeatures);
    setNewFeatureName("");
    setIsAdding(false);

    // Save to database
    try {
      const { error } = await supabase
        .from("nodes")
        .update({ metadata: { features: updatedFeatures } })
        .eq("id", data.id);

      if (error) {
        console.error("Failed to save feature:", error);
        toast.error("Failed to save feature");
        setFeatures(features); // Revert
      } else {
        toast.success("Feature added");
        data.onFeaturesUpdate?.(data.id, updatedFeatures);
      }
    } catch (error) {
      console.error("Error saving feature:", error);
      setFeatures(features); // Revert
    }
  };

  const handleEditFeature = async (featureId: string) => {
    if (!editingName.trim()) {
      toast.error("Feature name cannot be empty");
      return;
    }

    const updatedFeatures = features.map((f) =>
      f.id === featureId ? { ...f, name: editingName.trim() } : f
    );

    setFeatures(updatedFeatures);
    setEditingId(null);
    setEditingName("");

    // Save to database
    try {
      const { error } = await supabase
        .from("nodes")
        .update({ metadata: { features: updatedFeatures } })
        .eq("id", data.id);

      if (error) {
        console.error("Failed to update feature:", error);
        toast.error("Failed to update feature");
      } else {
        toast.success("Feature updated");
        data.onFeaturesUpdate?.(data.id, updatedFeatures);
      }
    } catch (error) {
      console.error("Error updating feature:", error);
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    const updatedFeatures = features.filter((f) => f.id !== featureId);
    setFeatures(updatedFeatures);

    // Save to database
    try {
      const { error } = await supabase
        .from("nodes")
        .update({ metadata: { features: updatedFeatures } })
        .eq("id", data.id);

      if (error) {
        console.error("Failed to delete feature:", error);
        toast.error("Failed to delete feature");
        setFeatures(features); // Revert
      } else {
        toast.success("Feature deleted");
        data.onFeaturesUpdate?.(data.id, updatedFeatures);
      }
    } catch (error) {
      console.error("Error deleting feature:", error);
      setFeatures(features); // Revert
    }
  };

  return (
    <div
      className={cn(
        "relative px-5 py-4 rounded-xl shadow-lg",
        "border-2 transition-all duration-200",
        "min-w-[280px] max-w-[350px]",
        "bg-gradient-to-br from-blue-900/40 to-blue-950/60",
        "border-blue-500/60"
      )}
    >
      {/* Top Handle for incoming connection */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950"
      />

      {/* Header with Icon and Title */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-blue-500/30">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
          <Zap className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="text-base font-bold text-white flex-1">{data.title}</h3>
      </div>

      {/* Features List */}
      <div className="space-y-2">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="flex items-center gap-2 p-2 bg-slate-900/40 border border-blue-500/20 rounded-lg hover:border-blue-500/40 transition-colors group"
          >
            {editingId === feature.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleEditFeature(feature.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditFeature(feature.id);
                  if (e.key === "Escape") {
                    setEditingId(null);
                    setEditingName("");
                  }
                }}
                autoFocus
                className="flex-1 h-7 text-sm bg-transparent border-b border-blue-500 text-white"
              />
            ) : (
              <>
                <span
                  onClick={() => {
                    setEditingId(feature.id);
                    setEditingName(feature.name);
                  }}
                  className="flex-1 text-sm text-slate-200 cursor-text hover:text-white transition-colors"
                >
                  {feature.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteFeature(feature.id)}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ))}

        {/* Add Feature Button/Input */}
        {isAdding ? (
          <div className="flex items-center gap-2 p-2 bg-slate-900/40 border border-blue-500/40 rounded-lg">
            <Input
              value={newFeatureName}
              onChange={(e) => setNewFeatureName(e.target.value)}
              onBlur={handleAddFeature}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFeature();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewFeatureName("");
                }
              }}
              placeholder="Feature name..."
              autoFocus
              className="flex-1 h-7 text-sm bg-transparent border-b border-blue-500 text-white placeholder:text-slate-400"
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsAdding(true)}
            className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        )}
      </div>

      {/* Bottom Handle for outgoing connection */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-950"
      />
    </div>
  );
});

FeaturesNode.displayName = "FeaturesNode";
