import { memo, useState, useRef } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Folder, Database, Lock, Globe, Users, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NodeHandleButton } from "./NodeHandleButton";
import type { NodeCategoryId } from "@/lib/nodeCategories";

interface CustomNodeProps {
  data: {
    id: string;
    title: string;
    description: string | null;
    category_id: string;
    priority: string | null;
    status: string;
    isRoot: boolean;
    onCreateNode?: (parentNodeId: string, categoryId: NodeCategoryId, position: "top" | "right" | "bottom" | "left") => void;
    childCategoryNames?: string[];
    category?: {
      id: string;
      name: string;
    };
    metadata?: {
      entity_name?: string;
      description?: string;
      security_model?: string;
      notes?: string;
    };
    onEditDatabaseEntity?: (node: any) => void;
    onDeleteDatabaseEntity?: (node: any) => void;
  };
}

export const CustomNode = memo(({ data }: CustomNodeProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(data.title);
  const [editedDescription, setEditedDescription] = useState(data.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<"top" | "right" | "bottom" | "left" | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      toast.error("Project name cannot be empty");
      setEditedTitle(data.title);
      setIsEditingTitle(false);
      return;
    }

    if (editedTitle === data.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsSaving(true);

    try {
      // Get project_id from node data
      const { data: nodeData } = await supabase
        .from("nodes")
        .select("project_id")
        .eq("id", data.id)
        .single();

      if (!nodeData) {
        toast.error("Failed to update: Node not found");
        setEditedTitle(data.title);
        setIsEditingTitle(false);
        setIsSaving(false);
        return;
      }

      // Update both nodes table and projects table
      const [nodesUpdate, projectsUpdate] = await Promise.all([
        supabase
          .from("nodes")
          .update({ title: editedTitle.trim() })
          .eq("id", data.id),

        supabase
          .from("projects")
          .update({ name: editedTitle.trim() })
          .eq("id", nodeData.project_id),
      ]);

      if (nodesUpdate.error || projectsUpdate.error) {
        console.error("Update errors:", { nodesUpdate, projectsUpdate });
        toast.error("Failed to update project name");
        setEditedTitle(data.title);
      } else {
        toast.success("Project name updated");
        // Optimistic update
        data.title = editedTitle.trim();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An error occurred");
      setEditedTitle(data.title);
    } finally {
      setIsEditingTitle(false);
      setIsSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    if (editedDescription === (data.description || "")) {
      setIsEditingDescription(false);
      return;
    }

    setIsSaving(true);

    try {
      const { data: nodeData } = await supabase
        .from("nodes")
        .select("project_id")
        .eq("id", data.id)
        .single();

      if (!nodeData) {
        toast.error("Failed to update: Node not found");
        setEditedDescription(data.description || "");
        setIsEditingDescription(false);
        setIsSaving(false);
        return;
      }

      // Update projects table only (nodes table doesn't have description field)
      const { error } = await supabase
        .from("projects")
        .update({ description: editedDescription.trim() || null })
        .eq("id", nodeData.project_id);

      if (error) {
        console.error("Update error:", error);
        toast.error("Failed to update description");
        setEditedDescription(data.description || "");
      } else {
        toast.success("Description updated");
        // Optimistic update
        data.description = editedDescription.trim() || null;
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An error occurred");
      setEditedDescription(data.description || "");
    } finally {
      setIsEditingDescription(false);
      setIsSaving(false);
    }
  };

  const handleHandleMouseEnter = (position: "top" | "right" | "bottom" | "left") => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredHandle(position);
  };

  const handleHandleMouseLeave = () => {
    // Delay hiding the buttons by 500ms for better UX
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredHandle(null);
    }, 500);
  };

  // Helper function to render security badge
  function renderSecurityBadge(securityModel: string) {
    const badges = {
      public: {
        icon: Globe,
        label: 'Public Access',
        colorClasses: 'bg-green-900/30 text-green-400 border-green-700'
      },
      private_owner: {
        icon: Lock,
        label: 'Owner Only',
        colorClasses: 'bg-blue-900/30 text-blue-400 border-blue-700'
      },
      private_user: {
        icon: Users,
        label: 'Authenticated Users',
        colorClasses: 'bg-orange-900/30 text-orange-400 border-orange-700'
      }
    };

    const badge = badges[securityModel as keyof typeof badges] || badges.private_owner;
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium ${badge.colorClasses}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{badge.label}</span>
      </div>
    );
  }

  // Check if this is a database entity node
  const isDatabaseEntity = data.category?.name === 'database';

  // Render database entity node
  if (isDatabaseEntity) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="w-[300px] rounded-lg border-2 border-pink-500 bg-slate-900 p-4 shadow-lg hover:shadow-xl transition-shadow cursor-help">
              {/* Top Handle */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-12 flex items-center justify-center">
                <Handle
                  type="target"
                  position={Position.Top}
                  className="!w-3 !h-3 !bg-pink-500 !border-2 !border-slate-950"
                />
              </div>

              {/* Header with Icon and Title */}
              <div className="flex items-start gap-3 mb-3">
                <Database className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-base truncate">
                    {data.title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-300 mb-3 line-clamp-2 leading-relaxed">
                {data.metadata?.description || 'No description provided'}
              </p>

              {/* Security Badge */}
              <div className="mb-3">
                {renderSecurityBadge(data.metadata?.security_model || 'private_owner')}
              </div>

              {/* Notes Preview (if exists) */}
              {data.metadata?.notes && (
                <div className="mb-3 p-3 rounded-md bg-slate-800/50 border border-slate-700">
                  <p className="text-xs text-slate-400 font-mono line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {data.metadata.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-700">
                <button
                  onClick={() => data.onEditDatabaseEntity?.(data)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => data.onDeleteDatabaseEntity?.(data)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-sm p-4 bg-slate-800 border-slate-700" sideOffset={10}>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-base mb-1 text-white">{data.title}</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.metadata?.description}
                </p>
              </div>

              {data.metadata?.notes && (
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-xs font-semibold text-slate-400 mb-1">NOTES:</p>
                  <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap leading-relaxed">
                    {data.metadata.notes}
                  </p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        // Base styles - premium feel
        "relative px-6 py-5 rounded-2xl shadow-2xl",
        "border-2 transition-all duration-200",
        "min-w-[280px] max-w-[400px]",
        // GPU acceleration for text sharpness
        "will-change-transform transform-gpu antialiased",
        "[text-rendering:optimizeLegibility]",

        // Root node - white outline with dark interior
        data.isRoot && [
          "bg-slate-950", // Solid dark background
          "border-white", // Solid white outline
          "shadow-white/10",
        ],

        // Non-root node - slate (will be enhanced later for different categories)
        !data.isRoot && [
          "bg-gradient-to-br from-slate-800/80 to-slate-900/60",
          "border-slate-600/60",
          "shadow-slate-900/40",
        ]
      )}
    >
      {/* Handles on all 4 sides for root nodes */}
      {data.isRoot ? (
        <>
          {/* Top Handle */}
          <div
            onMouseEnter={() => handleHandleMouseEnter("top")}
            onMouseLeave={handleHandleMouseLeave}
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-12 flex items-center justify-center"
          >
            <Handle
              type="source"
              position={Position.Top}
              id="top"
              className="!w-3 !h-3 !bg-white !border-2 !border-slate-950"
            />
          </div>

          {/* Right Handle */}
          <div
            onMouseEnter={() => handleHandleMouseEnter("right")}
            onMouseLeave={handleHandleMouseLeave}
            className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-16 flex items-center justify-center"
          >
            <Handle
              type="source"
              position={Position.Right}
              id="right"
              className="!w-3 !h-3 !bg-white !border-2 !border-slate-950"
            />
          </div>

          {/* Left Handle */}
          <div
            onMouseEnter={() => handleHandleMouseEnter("left")}
            onMouseLeave={handleHandleMouseLeave}
            className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-16 flex items-center justify-center"
          >
            <Handle
              type="source"
              position={Position.Left}
              id="left"
              className="!w-3 !h-3 !bg-white !border-2 !border-slate-950"
            />
          </div>
        </>
      ) : (
        // Top Handle only for non-root
        <div
          onMouseEnter={() => handleHandleMouseEnter("top")}
          onMouseLeave={handleHandleMouseLeave}
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-12 flex items-center justify-center"
        >
          <Handle
            type="target"
            position={Position.Top}
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-950"
          />
        </div>
      )}

      {/* Handle buttons for node creation - Root nodes */}
      {data.isRoot && data.onCreateNode && (
        <>
          {hoveredHandle === "top" && (
            <NodeHandleButton
              position="top"
              onCreateNode={(categoryId) => data.onCreateNode!(data.id, categoryId, "top")}
              onMouseEnter={() => handleHandleMouseEnter("top")}
              onMouseLeave={handleHandleMouseLeave}
              disabledCategories={data.childCategoryNames}
            />
          )}
          {hoveredHandle === "bottom" && (
            <NodeHandleButton
              position="bottom"
              onCreateNode={(categoryId) => data.onCreateNode!(data.id, categoryId, "bottom")}
              onMouseEnter={() => handleHandleMouseEnter("bottom")}
              onMouseLeave={handleHandleMouseLeave}
              disabledCategories={data.childCategoryNames}
            />
          )}
          {hoveredHandle === "right" && (
            <NodeHandleButton
              position="right"
              onCreateNode={(categoryId) => data.onCreateNode!(data.id, categoryId, "right")}
              onMouseEnter={() => handleHandleMouseEnter("right")}
              onMouseLeave={handleHandleMouseLeave}
              disabledCategories={data.childCategoryNames}
            />
          )}
          {hoveredHandle === "left" && (
            <NodeHandleButton
              position="left"
              onCreateNode={(categoryId) => data.onCreateNode!(data.id, categoryId, "left")}
              onMouseEnter={() => handleHandleMouseEnter("left")}
              onMouseLeave={handleHandleMouseLeave}
              disabledCategories={data.childCategoryNames}
            />
          )}
        </>
      )}

      {/* Handle buttons for node creation - Non-root nodes */}
      {!data.isRoot && data.onCreateNode && hoveredHandle === "bottom" && (
        <NodeHandleButton
          position="bottom"
          onCreateNode={(categoryId) => data.onCreateNode!(data.id, categoryId, "bottom")}
          onMouseEnter={() => handleHandleMouseEnter("bottom")}
          onMouseLeave={handleHandleMouseLeave}
          disabledCategories={data.childCategoryNames}
        />
      )}

      {/* Icon and Title on same row - only for root */}
      {data.isRoot && (
        <div className="mb-3 flex items-center gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 border border-white/30 flex items-center justify-center">
            <Folder className="w-5 h-5 text-white/80" />
          </div>

          {/* Project Title - Editable + Badge */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={() => handleSaveTitle()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setEditedTitle(data.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  disabled={isSaving}
                  autoFocus
                  className="w-full text-base font-bold text-white bg-transparent border-b-2 border-purple-500 outline-none px-0 py-0 leading-tight min-h-[1.5rem]"
                />
              ) : (
                <h3
                  onClick={() => !isSaving && setIsEditingTitle(true)}
                  className="text-base font-bold text-white leading-tight cursor-text hover:text-purple-200 transition-colors px-0 py-0 min-h-[1.5rem]"
                >
                  {data.title}
                </h3>
              )}
            </div>
            <Badge
              variant="outline"
              className="flex-shrink-0 bg-white/10 border-white/30 text-white text-xs px-2 py-0.5"
            >
              root
            </Badge>
          </div>
        </div>
      )}

      {/* Title for non-root nodes */}
      {!data.isRoot && (
        <h3 className="text-base font-bold text-white leading-tight mb-3">
          {data.title}
        </h3>
      )}

      {/* Project Description - Editable Inner Rectangle (root only) */}
      {data.isRoot && (
        <div className="mt-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
          {isEditingDescription ? (
            <div>
              <textarea
                value={editedDescription}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 200) {
                    setEditedDescription(value);
                  }
                }}
                onBlur={() => handleSaveDescription()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditedDescription(data.description || "");
                    setIsEditingDescription(false);
                  }
                }}
                disabled={isSaving}
                autoFocus
                rows={3}
                maxLength={200}
                placeholder="Add project description..."
                className="w-full text-xs text-slate-300 bg-transparent outline-none border-b border-purple-500 px-0 resize-none leading-relaxed min-h-[3rem]"
              />
              <div className="text-xs text-slate-500 mt-1 text-right">
                {editedDescription.length}/200 characters
              </div>
            </div>
          ) : (
            <p
              onClick={() => !isSaving && setIsEditingDescription(true)}
              className="text-xs text-slate-300 leading-relaxed line-clamp-3 cursor-text hover:text-slate-200 transition-colors min-h-[3rem] px-0"
            >
              {data.description || "Click to add description..."}
            </p>
          )}
        </div>
      )}

      {/* Status Badge - Only for non-root nodes */}
      {!data.isRoot && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {data.status}
          </span>
        </div>
      )}

      {/* Bottom Handle (for outgoing connections) */}
      <div
        onMouseEnter={() => handleHandleMouseEnter("bottom")}
        onMouseLeave={handleHandleMouseLeave}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-12 flex items-center justify-center"
      >
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={`!w-3 !h-3 !border-2 !border-slate-950 ${
            data.isRoot ? "!bg-white" : "!bg-purple-500"
          }`}
        />
      </div>
    </div>
  );
});

CustomNode.displayName = "CustomNode";
