import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NODE_CATEGORIES, NodeCategoryId } from "@/lib/nodeCategories";
import { cn } from "@/lib/utils";

interface NodeHandleButtonProps {
  position: "top" | "right" | "bottom" | "left";
  onCreateNode: (categoryId: NodeCategoryId) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  disableFeature?: boolean;
}

export const NodeHandleButton = ({ position, onCreateNode, onMouseEnter, onMouseLeave, disableFeature }: NodeHandleButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: "-top-12 left-1/2 -translate-x-1/2",
    right: "-right-12 top-1/2 -translate-y-1/2",
    bottom: "-bottom-12 left-1/2 -translate-x-1/2",
    left: "-left-12 top-1/2 -translate-y-1/2",
  };

  const dropdownAlignClasses = {
    top: "center",
    right: "center",
    bottom: "center",
    left: "center",
  } as const;

  const dropdownSideClasses = {
    top: "top",
    right: "right",
    bottom: "bottom",
    left: "left",
  } as const;

  const availableNodeCategories = Object.entries(NODE_CATEGORIES).filter(
    ([key]) => !(disableFeature && key === "feature")
  );

  return (
    <div
      className={cn("absolute z-20", positionClasses[position])}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="h-6 w-6 rounded-full bg-purple-500 text-white border-none hover:bg-purple-600 transition-all shadow-lg"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={dropdownAlignClasses[position]}
          side={dropdownSideClasses[position]}
          className="w-48"
          sideOffset={12}
        >
          {availableNodeCategories.map(([key, category]) => {
            const Icon = category.icon;
            return (
              <DropdownMenuItem
                key={key}
                onClick={() => {
                  onCreateNode(key as NodeCategoryId);
                  setIsOpen(false);
                }}
                className="cursor-pointer"
              >
                <Icon className="h-4 w-4 mr-2" style={{ color: category.color }} />
                <span style={{ color: category.color }}>{category.name}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
