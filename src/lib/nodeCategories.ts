import { Zap, Code, Database, GitBranch } from "lucide-react";

export const NODE_CATEGORIES = {
  feature: {
    id: "feature",
    name: "Features",
    color: "#3b82f6",
    icon: Zap,
  },
  tech_stack: {
    id: "tech_stack",
    name: "Tech Stack",
    color: "#f59e0b",
    icon: Code,
  },
  database: {
    id: "database",
    name: "Database",
    color: "#ec4899",
    icon: Database,
  },
  user_flows: {
    id: "user_flows",
    name: "User Flows",
    color: "#a855f7",
    icon: GitBranch,
  },
} as const;

export type NodeCategoryId = keyof typeof NODE_CATEGORIES;
