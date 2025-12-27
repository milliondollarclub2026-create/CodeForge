import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  Code2,
  Monitor,
  Server,
  Cloud,
  Wrench,
  Plug,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTechStackModal, TechStackEntry, TechCategory } from "@/components/AddTechStackModal";
import { EditTechStackModal } from "@/components/EditTechStackModal";
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

interface TechStackNodeProps {
  data: {
    id: string;
    title: string;
    techStack: TechStackEntry[];
    onTechStackUpdate: (nodeId: string, techStack: TechStackEntry[]) => void;
    connectionSide?: "top" | "right" | "bottom" | "left";
  };
}

const CATEGORY_ICONS: Record<TechCategory, React.ComponentType<{ className?: string }>> = {
  core_language: Code2,
  frontend_framework: Monitor,
  backend_framework: Server,
  external_service: Cloud,
  dev_tool: Wrench,
  third_party_api: Plug,
};

const CATEGORY_LABELS: Record<TechCategory, string> = {
  core_language: "Core Language",
  frontend_framework: "Frontend Framework",
  backend_framework: "Backend Framework",
  external_service: "External Service",
  dev_tool: "Dev Tool",
  third_party_api: "Third-Party API",
};

export const TechStackNode = memo(({ data }: TechStackNodeProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TechStackEntry | null>(null);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TechStackEntry | null>(null);

  const openAddDialog = () => {
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (entry: TechStackEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleSaveNewEntry = (newData: Omit<TechStackEntry, "id">) => {
    const newEntry: TechStackEntry = { id: Date.now(), ...newData };
    const updatedTechStack = [...(data.techStack || []), newEntry];
    data.onTechStackUpdate(data.id, updatedTechStack);
  };

  const handleSaveEditedEntry = (updatedData: Omit<TechStackEntry, "id">) => {
    if (!editingEntry) return;
    const updatedTechStack = (data.techStack || []).map((entry) =>
      entry.id === editingEntry.id ? { ...entry, ...updatedData } : entry
    );
    data.onTechStackUpdate(data.id, updatedTechStack);
  };

  const handleDeleteEntry = () => {
    if (!editingEntry) return;
    const updatedTechStack = (data.techStack || []).filter(
      (entry) => entry.id !== editingEntry.id
    );
    data.onTechStackUpdate(data.id, updatedTechStack);
  };

  const handleQuickDelete = (e: React.MouseEvent, entry: TechStackEntry) => {
    e.stopPropagation();
    setEntryToDelete(entry);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!entryToDelete) return;
    const updatedTechStack = (data.techStack || []).filter(
      (item) => item.id !== entryToDelete.id
    );
    data.onTechStackUpdate(data.id, updatedTechStack);
    setShowDeleteDialog(false);
    setEntryToDelete(null);
  };

  const handleAddComment = (e: React.MouseEvent, entry: TechStackEntry) => {
    e.stopPropagation();
    // TODO: Implement comment functionality
    console.log("Add comment for:", entry.name);
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

  const renderEntryDetails = (entry: TechStackEntry) => {
    const details: string[] = [];

    switch (entry.category) {
      case "core_language":
        if (entry.version) details.push(`v${entry.version}`);
        if (entry.type_system) details.push(entry.type_system);
        break;
      case "frontend_framework":
        if (entry.version) details.push(`v${entry.version}`);
        if (entry.state_management) details.push(entry.state_management);
        if (entry.styling_approach) details.push(entry.styling_approach);
        break;
      case "backend_framework":
        if (entry.version) details.push(`v${entry.version}`);
        if (entry.orm) details.push(`ORM: ${entry.orm}`);
        break;
      case "external_service":
        if (entry.provider) details.push(entry.provider);
        if (entry.purpose) details.push(entry.purpose);
        break;
      case "dev_tool":
        if (entry.tool_category) details.push(entry.tool_category);
        if (entry.purpose) details.push(entry.purpose);
        break;
      case "third_party_api":
        if (entry.provider) details.push(entry.provider);
        if (entry.purpose) details.push(entry.purpose);
        if (entry.authentication_method) details.push(entry.authentication_method);
        break;
    }

    return details.join(" • ");
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
          "border-amber-500",
          "shadow-amber-500/10"
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
              "!w-3 !h-3 !bg-amber-500 !border-2 !border-amber-700 transition-opacity duration-200",
              isHandleHovered ? "!opacity-100" : "!opacity-0"
            )}
            style={handleStyles}
          />
        </div>

        {/* Icon and Title */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Server className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white leading-tight">
              {data.title}
            </h3>
          </div>
          <Button
            onClick={openAddDialog}
            size="sm"
            className="h-9 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Tech
          </Button>
        </div>

        {/* Tech Stack List */}
        <div className="space-y-3">
          {(data.techStack || []).map((entry) => {
            const Icon = CATEGORY_ICONS[entry.category];
            return (
              <div
                key={entry.id}
                className="relative group cursor-pointer p-3 pr-14 rounded-md bg-slate-900/50 border border-transparent hover:border-amber-500/50 transition-colors"
                onClick={() => openEditDialog(entry)}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-100">{entry.name}</p>
                      <span className="text-xs text-slate-500 px-1.5 py-0.5 rounded bg-slate-800/50">
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                    </div>
                    {renderEntryDetails(entry) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {renderEntryDetails(entry)}
                      </p>
                    )}
                  </div>
                </div>
                {/* Action icons: Delete, Comment, Edit (right to left) */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleQuickDelete(e, entry)}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                  <button
                    onClick={(e) => handleAddComment(e, entry)}
                    className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                    title="Add comment"
                  >
                    <MessageCircle className="h-3 w-3 text-amber-400" />
                  </button>
                  <button
                    onClick={() => openEditDialog(entry)}
                    className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3 text-amber-400" />
                  </button>
                </div>
              </div>
            );
          })}
          {(!data.techStack || data.techStack.length === 0) && (
            <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">No tech stack added yet.</p>
              <p className="text-xs text-slate-500">Click "Add Tech" to get started.</p>
            </div>
          )}
        </div>
      </div>

      <AddTechStackModal
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={handleSaveNewEntry}
      />

      {editingEntry && (
        <EditTechStackModal
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={handleSaveEditedEntry}
          onDelete={handleDeleteEntry}
          entry={editingEntry}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tech Stack Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entryToDelete?.name}"? This action cannot be undone.
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

TechStackNode.displayName = "TechStackNode";
