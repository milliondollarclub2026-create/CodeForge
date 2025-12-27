import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlowForgeLogo } from "./FlowForgeLogo";
import { UserAvatar } from "@/components/UserAvatar";
import {
  PanelLeftClose,
  PanelRightClose,
  FolderKanban,
  FileText,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const navLinks = [
  {
    path: "/",
    icon: FolderKanban,
    title: "Projects",
  },
  {
    path: "/prd-document",
    icon: FileText,
    title: "PRD Document",
  },
];

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Failed to sign out");
      } else {
        toast.success("Signed out successfully");
        navigate("/auth");
      }
    } catch (error) {
      toast.error("An unexpected error occurred during sign out");
    }
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-background border-r z-50 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col flex-1">
        {/* Header with Logo and Toggle */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center">
            <FlowForgeLogo />
            {!isCollapsed && (
              <span className="ml-3 text-lg font-semibold">FlowForge</span>
            )}
          </div>
          {!isCollapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(true)}
                >
                  <PanelLeftClose className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Collapsed Toggle */}
        {isCollapsed && (
          <div className="px-4 py-3">
             <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-full"
                        onClick={() => setIsCollapsed(false)}
                    >
                        <PanelRightClose className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Tooltip key={link.title} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-11",
                      isCollapsed && "justify-center",
                      isActive && "border-2 border-primary"
                    )}
                    onClick={() => navigate(link.path)}
                  >
                    <link.icon className="h-5 w-5 text-primary" />
                    {!isCollapsed && <span className="ml-3">{link.title}</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">{link.title}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-14",
                isCollapsed && "justify-center"
              )}
            >
              <div className="flex items-center">
                {user ? (
                  <UserAvatar
                    name={user.email || "User"}
                    className="h-8 w-8"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted" />
                )}
                {!isCollapsed && user && (
                  <div className="ml-3 text-left overflow-hidden flex-1 min-w-0">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <p className="text-sm font-medium leading-none truncate">
                          {user.user_metadata?.full_name || user.email}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {user.user_metadata?.full_name || user.email}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="right">{user.email}</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">My Account</p>
              {user && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground font-normal truncate">
                      {user.email}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="right">{user.email}</TooltipContent>
                </Tooltip>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
};