import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Plus, Minus, Hand, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  useKeyPress,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomNode } from "@/components/nodes/CustomNode";
import { FeaturesNode } from "@/components/nodes/FeaturesNode";
import { NODE_CATEGORIES, type NodeCategoryId } from "@/lib/nodeCategories";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Transform database edge to React Flow edge format
const transformEdgeToReactFlow = (edge: Tables<"edges">): Edge => ({
  id: edge.id,
  source: edge.source_node_id,
  target: edge.target_node_id,
  type: "default",
  label: edge.label || undefined,
  animated: false,
});

// Arrow key panning component
const ArrowKeyPanner = () => {
  const { getViewport, setViewport } = useReactFlow();
  const arrowUpPressed = useKeyPress("ArrowUp");
  const arrowDownPressed = useKeyPress("ArrowDown");
  const arrowLeftPressed = useKeyPress("ArrowLeft");
  const arrowRightPressed = useKeyPress("ArrowRight");

  const PAN_STEP = 50; // Pixels to pan per keypress

  useEffect(() => {
    const viewport = getViewport();
    let newX = viewport.x;
    let newY = viewport.y;

    if (arrowUpPressed) newY += PAN_STEP;
    if (arrowDownPressed) newY -= PAN_STEP;
    if (arrowLeftPressed) newX += PAN_STEP;
    if (arrowRightPressed) newX -= PAN_STEP;

    if (newX !== viewport.x || newY !== viewport.y) {
      setViewport({ x: newX, y: newY, zoom: viewport.zoom }, { duration: 200 });
    }
  }, [
    arrowUpPressed,
    arrowDownPressed,
    arrowLeftPressed,
    arrowRightPressed,
    getViewport,
    setViewport,
  ]);

  return null;
};

// Custom controls component
const CustomControls = () => {
  const { zoomIn, zoomOut } = useReactFlow();

  return (
    <Panel position="bottom-left" className="m-4">
      <div className="flex flex-col gap-2 bg-background border border-border rounded-lg p-2 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => zoomIn({ duration: 200 })}
          className="h-10 w-10"
          title="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => zoomOut({ duration: 200 })}
          className="h-10 w-10"
          title="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="border-t border-border my-1" />

        <Button
          variant="ghost"
          size="icon"
          disabled
          className="h-10 w-10 opacity-50"
          title="Click and drag to pan"
        >
          <Hand className="h-4 w-4" />
        </Button>
      </div>
    </Panel>
  );
};

// Canvas component
const ProjectDetailCanvas = ({ projectId }: { projectId: string }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const { setCenter, getNode } = useReactFlow();
  const hasCentered = useRef(false);

  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
    features: FeaturesNode
  }), []);

  const calculateChildPosition = (
    parentNode: Node,
    direction: "top" | "right" | "bottom" | "left"
  ) => {
    const gap = 200;
    const nodeWidth = 350;
    const nodeHeight = 150;

    switch (direction) {
      case "bottom":
        return { x: parentNode.position.x, y: parentNode.position.y + nodeHeight + gap };
      case "right":
        return { x: parentNode.position.x + nodeWidth + gap, y: parentNode.position.y };
      case "left":
        return { x: parentNode.position.x - nodeWidth - gap, y: parentNode.position.y };
      case "top":
        return { x: parentNode.position.x, y: parentNode.position.y - nodeHeight - gap };
    }
  };

  const handleFeaturesUpdate = async (nodeId: string, features: any[]) => {
    // Update the local node data first for immediate UI feedback
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, features } }
          : node
      )
    );

    // Then, save the updated features to the database
    try {
      const { error } = await supabase
        .from("nodes")
        .update({ metadata: { features } })
        .eq("id", nodeId);

      if (error) {
        toast.error("Failed to save features.");
        console.error("Error updating features:", error);
        // Here you might want to add logic to revert the optimistic update
      }
    } catch (error) {
      toast.error("An unexpected error occurred while saving features.");
      console.error("Catch block error updating features:", error);
    }
  };

  const handleCreateNode = useCallback(async (
    parentNodeId: string,
    categoryId: NodeCategoryId,
    position: "top" | "right" | "bottom" | "left"
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get parent node for position calculation using the hook to avoid stale state
      const parentNode = getNode(parentNodeId);
      
      if (!parentNode) {
        toast.error("Parent node not found");
        return;
      }

      // Get category from database
      const { data: category } = await supabase
        .from("node_categories")
        .select("id")
        .eq("name", categoryId)
        .single();

      if (!category) {
        toast.error("Category not found");
        return;
      }

      // Calculate position
      const newPosition = calculateChildPosition(parentNode, position);
      
      const title = categoryId === "feature" 
        ? "Features" 
        : `New ${NODE_CATEGORIES[categoryId].name}`;

      // Create node in database
      const { data: newNode, error: nodeError } = await supabase
        .from("nodes")
        .insert({
          project_id: projectId,
          category_id: category.id,
          parent_node_id: parentNodeId,
          title: title,
          position_x: newPosition.x,
          position_y: newPosition.y,
          status: "draft",
          priority: null,
        })
        .select()
        .single();

      if (nodeError || !newNode) {
        toast.error("Failed to create node");
        return;
      }

      // Define opposite handles for connection
      const oppositeHandle = {
        top: "bottom",
        bottom: "top",
        right: "left",
        left: "right",
      };

      // Create edge in database
      console.log("🔍 Creating edge:", {
        source_handle: position,
        target_handle: oppositeHandle[position],
        source_node_id: parentNodeId,
        target_node_id: newNode.id,
      });

      const { data: newEdge, error: edgeError } = await supabase
        .from("edges")
        .insert({
          project_id: projectId,
          source_node_id: parentNodeId,
          target_node_id: newNode.id,
          source_handle: position,
          target_handle: oppositeHandle[position],
          edge_type: "parent_child",
          label: null,
        })
        .select()
        .single();

      console.log("🔍 Edge creation result:", { newEdge, edgeError });

      if (edgeError || !newEdge) {
        console.error("❌ Edge creation error:", edgeError);

        // Rollback: Delete the node we just created
        await supabase.from("nodes").delete().eq("id", newNode.id);

        toast.error(`Failed to create connection: ${edgeError?.message || "Unknown error"}`);
        return;
      }

      // Determine node type based on category
      const nodeType = categoryId === "feature" ? "features" : "custom";
      const isFeatureNode = categoryId === "feature";

      // Optimistic update: Add node to canvas
      const reactFlowNode: Node = {
        id: newNode.id,
        type: nodeType,
        position: { x: newNode.position_x, y: newNode.position_y },
        data: isFeatureNode
          ? {
              id: newNode.id,
              title: newNode.title,
              features: [],
              onFeaturesUpdate: handleFeaturesUpdate,
              connectionSide: oppositeHandle[position],
            }
          : {
              id: newNode.id,
              title: newNode.title,
              description: null,
              category_id: newNode.category_id,
              priority: newNode.priority,
              status: newNode.status,
              isRoot: false,
              onCreateNode: handleCreateNode,
            },
      };

      // Optimistic update: Add edge to canvas
      const reactFlowEdge: Edge = {
        id: newEdge.id,
        source: parentNodeId,
        target: newNode.id,
        sourceHandle: newEdge.source_handle || undefined,
        targetHandle: newEdge.target_handle || undefined,
        type: isFeatureNode ? "smoothstep" : "default",
        animated: isFeatureNode,
        style: isFeatureNode ? {
          strokeDasharray: "5,5",
          stroke: "#3b82f6",
          strokeWidth: 2,
        } : undefined,
      };

      console.log("🔍 React Flow Edge object:", reactFlowEdge);
      console.log("🔍 Is Feature Node:", isFeatureNode);
      console.log("🔍 Parent Node ID:", parentNodeId);
      console.log("🔍 New Node ID:", newNode.id);

      setNodes((prevNodes) => [...prevNodes, reactFlowNode]);
      setEdges((prevEdges) => {
        const newEdges = [...prevEdges, reactFlowEdge];
        console.log("🔍 All edges after adding:", newEdges);
        return newEdges;
      });

      toast.success(`${NODE_CATEGORIES[categoryId].name} node created`);
    } catch (error) {
      console.error("Error creating node:", error);
      toast.error("An unexpected error occurred");
    }
  }, [projectId, setNodes, setEdges, handleFeaturesUpdate, getNode]);

  const handleNodeDragStop = async (event: any, node: Node) => {
    // Save new position to database for all nodes (including root)
    try {
      const { error } = await supabase
        .from("nodes")
        .update({
          position_x: node.position.x,
          position_y: node.position.y,
        })
        .eq("id", node.id);

      if (error) {
        console.error("Failed to save position:", error);
        toast.error("Failed to save node position");
      }
    } catch (error) {
      console.error("Error saving position:", error);
    }
  };

  useEffect(() => {
    const fetchNodesAndEdges = async () => {
      setLoading(true);

      // Verify user ownership (defense in depth)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch full project data (not just id) to get description
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!projectData) {
        console.error("Unauthorized or project not found");
        return;
      }

      // Fetch nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from("nodes")
        .select("*")
        .eq("project_id", projectId);

      if (nodesError) {
        console.error("Error fetching nodes:", nodesError);
        setLoading(false);
        return;
      }

      // Fetch edges
      const { data: edgesData, error: edgesError } = await supabase
        .from("edges")
        .select("*")
        .eq("project_id", projectId);

      if (edgesError) {
        console.error("Error fetching edges:", edgesError);
      }

      // Fetch all categories to determine node types
      const { data: categoriesData } = await supabase
        .from("node_categories")
        .select("id, name");

      const categoryMap = new Map(
        (categoriesData || []).map((cat) => [cat.id, cat.name])
      );

      // Create a map of parent IDs to their child nodes
      const parentToChildrenMap = new Map<string, any[]>();
      (nodesData || []).forEach(node => {
        if (node.parent_node_id) {
          if (!parentToChildrenMap.has(node.parent_node_id)) {
            parentToChildrenMap.set(node.parent_node_id, []);
          }
          parentToChildrenMap.get(node.parent_node_id)!.push(node);
        }
      });

      // Transform nodes to React Flow format WITH project description for root nodes
      const flowNodes = (nodesData || []).map(node => {
        const isRoot = node.parent_node_id === null;
        const categoryName = categoryMap.get(node.category_id);
        const isFeatureNode = categoryName === "feature";

        if (isFeatureNode) {
          // Parse metadata field - it may be stored as JSON string or object
          let features = [];
          try {
            const metadata = (node as any).metadata;
            if (typeof metadata === 'string') {
              const parsed = JSON.parse(metadata);
              features = parsed?.features || [];
            } else if (metadata && typeof metadata === 'object') {
              features = metadata.features || [];
            }
          } catch (e) {
            console.error("Failed to parse metadata:", e);
          }

          // Find the edge connecting to this feature node to get connection side
          const incomingEdge = edgesData?.find(e => e.target_node_id === node.id);
          const connectionSide = incomingEdge?.target_handle || "left";

          return {
            id: node.id,
            type: "features",
            position: { x: node.position_x, y: node.position_y },
            data: {
              id: node.id,
              title: node.title,
              features,
              onFeaturesUpdate: handleFeaturesUpdate,
              connectionSide,
            },
          };
        }

        // Get child categories for the current node
        const children = parentToChildrenMap.get(node.id) || [];
        const childCategoryNames = children.map(child => categoryMap.get(child.category_id)).filter(Boolean);

        return {
          id: node.id,
          type: "custom",
          position: { x: node.position_x, y: node.position_y },
          data: {
            id: node.id,
            title: node.title,
            description: isRoot ? projectData.description : null,
            category_id: node.category_id,
            priority: node.priority,
            status: node.status,
            isRoot,
            onCreateNode: handleCreateNode,
            childCategoryNames,
          },
        };
      });

      // Transform edges to React Flow format with special styling for feature edges
      const flowEdges = (edgesData || []).map(edge => {
        // Check if target is a feature node
        const targetNode = nodesData?.find(n => n.id === edge.target_node_id);
        const targetCategoryName = targetNode ? categoryMap.get(targetNode.category_id) : null;
        const isFeatureEdge = targetCategoryName === "feature";

        return {
          id: edge.id,
          source: edge.source_node_id,
          target: edge.target_node_id,
          sourceHandle: edge.source_handle || undefined,
          targetHandle: edge.target_handle || undefined,
          type: isFeatureEdge ? "smoothstep" : "default",
          label: edge.label || undefined,
          animated: isFeatureEdge,
          style: isFeatureEdge ? {
            strokeDasharray: "5,5",
            stroke: "#3b82f6",
            strokeWidth: 2,
          } : undefined,
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges || []);
      setLoading(false);
    };

    if (projectId) {
      fetchNodesAndEdges();
    }
  }, [projectId]);

  // Auto-center on root node after nodes load
  useEffect(() => {
    if (nodes.length > 0 && !loading && !hasCentered.current) {
      // Find root node (always at position 0, 0)
      const rootNode = nodes.find((node) => node.data.isRoot);

      if (rootNode) {
        // Center on root node at 100% zoom with smooth animation
        setTimeout(() => {
          setCenter(rootNode.position.x, rootNode.position.y, {
            zoom: 1,
            duration: 300,
          });
        }, 100);
        hasCentered.current = true;
      }
    }
  }, [nodes, loading, setCenter]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={() => {}}
      onNodeDragStop={handleNodeDragStop}
      // Pan & Zoom Configuration
      panOnDrag={true}
      zoomOnScroll={true}
      panOnScroll={false}
      minZoom={0.1} // 10% minimum zoom
      maxZoom={4} // 400% maximum zoom
      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      // Interactive mode - nodes can be dragged and selected
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      className="bg-background"
    >
      {/* Dot Grid Background */}
      <Background
        variant={BackgroundVariant.Dots}
        gap={20} // 20px spacing
        size={1} // 1px dot radius
        color="hsl(var(--border))" // Theme color
      />

      {/* Arrow Key Panning */}
      <ArrowKeyPanner />

      {/* Custom Controls */}
      <CustomControls />
    </ReactFlow>
  );
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState("");

  useEffect(() => {
    if (!id) {
      navigate("/");
      return;
    }

    verifyAndLoadProject();
  }, [id, navigate]);

  // Update edited name when project loads
  useEffect(() => {
    if (project) {
      setEditedProjectName(project.name);
    }
  }, [project]);

  const verifyAndLoadProject = async () => {
    setVerifying(true);
    setLoading(true);

    try {
      // Get authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be signed in to view projects");
        navigate("/auth");
        return;
      }

      // Verify ownership with explicit user_id filter
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id) // Verify ownership - RLS also protects
        .maybeSingle();

      if (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project");
        navigate("/");
        return;
      }

      if (!data) {
        // Generic message - don't reveal if project exists but user lacks access
        toast.error("Project not found");
        navigate("/");
        return;
      }

      setProject(data);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
      navigate("/");
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        toast.error("Failed to sign out");
      } else {
        toast.success("Signed out successfully");
        navigate("/auth");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleSaveProjectName = async () => {
    if (!editedProjectName.trim()) {
      toast.error("Project name cannot be empty");
      setEditedProjectName(project?.name || "");
      setIsEditingProjectName(false);
      return;
    }

    if (editedProjectName === project?.name) {
      setIsEditingProjectName(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !project) return;

      // Get root node ID
      const { data: rootNode } = await supabase
        .from("nodes")
        .select("id")
        .eq("project_id", project.id)
        .is("parent_node_id", null)
        .single();

      if (!rootNode) {
        toast.error("Failed to update: Root node not found");
        setIsEditingProjectName(false);
        return;
      }

      // Update both tables in parallel
      const [projectUpdate, nodeUpdate] = await Promise.all([
        supabase
          .from("projects")
          .update({ name: editedProjectName.trim() })
          .eq("id", project.id)
          .eq("user_id", user.id),

        supabase
          .from("nodes")
          .update({ title: editedProjectName.trim() })
          .eq("id", rootNode.id)
      ]);

      if (projectUpdate.error || nodeUpdate.error) {
        console.error("Update errors:", { projectUpdate, nodeUpdate });
        toast.error("Failed to update project name");
        setEditedProjectName(project.name);
      } else {
        toast.success("Project name updated");
        // Optimistic update
        setProject({ ...project, name: editedProjectName.trim() });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An error occurred");
      setEditedProjectName(project?.name || "");
    } finally {
      setIsEditingProjectName(false);
    }
  };

  if (verifying || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-6 w-6 border-2 border-foreground border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-16 flex items-center justify-between px-4">
          {/* Left: Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="h-9"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>

          {/* Center: Project Title */}
          <div className="flex items-center gap-2 max-w-md">
            {isEditingProjectName ? (
              <input
                type="text"
                value={editedProjectName}
                onChange={(e) => setEditedProjectName(e.target.value)}
                onBlur={handleSaveProjectName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveProjectName();
                  if (e.key === "Escape") {
                    setEditedProjectName(project.name);
                    setIsEditingProjectName(false);
                  }
                }}
                autoFocus
                className="text-lg font-semibold bg-transparent border-b-2 border-purple-500 outline-none px-2 py-1"
              />
            ) : (
              <>
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {project.name}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingProjectName(true)}
                  className="h-8 w-8 hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Right: Sign Out Button */}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="h-9"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Infinite Canvas - Full height below header */}
      <div className="h-[calc(100vh-4rem)]">
        <ReactFlowProvider>
          <ProjectDetailCanvas projectId={id!} />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default ProjectDetail;

