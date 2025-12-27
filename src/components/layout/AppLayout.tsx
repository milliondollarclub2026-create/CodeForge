import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useWindowWidth } from "@/hooks/useWindowWidth";
import { cn } from "@/lib/utils";

const AppLayout = () => {
  const windowWidth = useWindowWidth();
  const [isCollapsed, setIsCollapsed] = useState(windowWidth < 1200);

  useEffect(() => {
    setIsCollapsed(windowWidth < 1200);
  }, [windowWidth]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main
        className="flex-1 overflow-y-auto transition-all duration-300 ease-in-out"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
