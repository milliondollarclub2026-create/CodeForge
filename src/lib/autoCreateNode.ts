import { supabase } from '@/integrations/supabase/client';
import { SuggestionGroup, SuggestionItem } from '@/types/chat';
import { NODE_CATEGORIES, NodeCategoryId } from './nodeCategories';
import { toast } from 'sonner';

/**
 * Check if a singleton node (Features or Tech Stack) already exists
 */
async function checkSingletonNodeExists(
  projectId: string,
  categoryName: 'Features' | 'Tech Stack'
): Promise<{ exists: boolean; nodeId?: string }> {
  // Map display names to database names
  const dbCategoryName = categoryName === 'Features' ? 'feature' : 'tech_stack';

  const { data: category } = await supabase
    .from('node_categories')
    .select('id')
    .eq('name', dbCategoryName)
    .single();

  if (!category) return { exists: false };

  const { data: existingNodes } = await supabase
    .from('nodes')
    .select('id')
    .eq('project_id', projectId)
    .eq('category_id', category.id)
    .limit(1);

  if (existingNodes && existingNodes.length > 0) {
    return { exists: true, nodeId: existingNodes[0].id };
  }

  return { exists: false };
}

/**
 * Check if a multi-instance node (Database or User Flow) with the same title exists
 */
async function checkMultiInstanceNodeExists(
  projectId: string,
  categoryName: 'Database' | 'User Flows',
  title: string
): Promise<{ exists: boolean; nodeId?: string }> {
  // Map display names to database names
  const dbCategoryName = categoryName === 'Database' ? 'database' : 'user_flows';

  const { data: category } = await supabase
    .from('node_categories')
    .select('id')
    .eq('name', dbCategoryName)
    .single();

  if (!category) return { exists: false };

  const { data: existingNodes } = await supabase
    .from('nodes')
    .select('id, title')
    .eq('project_id', projectId)
    .eq('category_id', category.id)
    .eq('title', title)
    .limit(1);

  if (existingNodes && existingNodes.length > 0) {
    return { exists: true, nodeId: existingNodes[0].id };
  }

  return { exists: false };
}

/**
 * Get the root node for a project
 */
async function getRootNode(projectId: string) {
  const { data: rootNode, error } = await supabase
    .from('nodes')
    .select('id, position_x, position_y')
    .eq('project_id', projectId)
    .is('parent_node_id', null)
    .single();

  if (error || !rootNode) {
    console.error('Root node error:', error);
    toast.error('Project root node not found. Please refresh the page.');
    throw new Error('Root node not found for project');
  }

  return rootNode;
}

/**
 * Calculate position for new node around root node
 */
function calculateNodePosition(
  rootPosition: { x: number; y: number },
  existingNodesCount: number
): { x: number; y: number } {
  const gap = 200;
  const nodeHeight = 150;
  const nodeWidth = 350;

  // Position nodes in a circular pattern around root
  const angle = (existingNodesCount * 90) % 360; // 0, 90, 180, 270 degrees
  const radians = (angle * Math.PI) / 180;

  const x = rootPosition.x + Math.cos(radians) * (nodeWidth + gap);
  const y = rootPosition.y + Math.sin(radians) * (nodeHeight + gap);

  return { x, y };
}

/**
 * Create a new node on the canvas
 */
export async function autoCreateNode(
  projectId: string,
  categoryName: 'Features' | 'Tech Stack' | 'Database' | 'User Flows',
  title: string,
  metadata: Record<string, any>
): Promise<{ nodeId: string; isNew: boolean }> {
  try {
    // Check if node already exists based on cardinality rules
    let existingCheck;

    if (categoryName === 'Features' || categoryName === 'Tech Stack') {
      // Singleton nodes - check if ANY instance exists
      existingCheck = await checkSingletonNodeExists(projectId, categoryName);
    } else {
      // Multi-instance nodes - check if node with SAME TITLE exists
      existingCheck = await checkMultiInstanceNodeExists(projectId, categoryName, title);
    }

    if (existingCheck.exists && existingCheck.nodeId) {
      // Node already exists, return its ID
      return { nodeId: existingCheck.nodeId, isNew: false };
    }

    // Get category ID - Map display names to database names
    const categoryMap: Record<string, string> = {
      'Features': 'feature',
      'Tech Stack': 'tech_stack',
      'Database': 'database',
      'User Flows': 'user_flows'
    };

    const dbCategoryName = categoryMap[categoryName];

    const { data: category } = await supabase
      .from('node_categories')
      .select('id')
      .eq('name', dbCategoryName)
      .single();

    if (!category) {
      console.error(`Category not found: ${categoryName} (${dbCategoryName})`);
      throw new Error(`Category "${categoryName}" not found in database`);
    }

    // Get root node
    const rootNode = await getRootNode(projectId);

    // Count existing nodes of THIS CATEGORY to determine handle assignment
    const { data: sameCategoryNodes } = await supabase
      .from('nodes')
      .select('id')
      .eq('project_id', projectId)
      .eq('parent_node_id', rootNode.id)
      .eq('category_id', category.id);

    const sameCategoryCount = sameCategoryNodes?.length || 0;

    // Count ALL existing child nodes to calculate position
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('id')
      .eq('project_id', projectId)
      .eq('parent_node_id', rootNode.id);

    const existingCount = existingNodes?.length || 0;

    // Calculate position
    const position = calculateNodePosition(
      { x: rootNode.position_x, y: rootNode.position_y },
      existingCount
    );

    // Create the node
    const { data: newNode, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        project_id: projectId,
        category_id: category.id,
        parent_node_id: rootNode.id,
        title: title,
        position_x: position.x,
        position_y: position.y,
        status: 'draft',
        metadata: metadata,
      })
      .select()
      .single();

    if (nodeError) throw nodeError;

    // Assign handles based on category type
    // Root node SOURCE handles per category (where the edge EXITS from root)
    const rootSourceHandleMap: Record<string, string> = {
      'Features': 'right',      // Features nodes connect from root's RIGHT handle
      'Tech Stack': 'bottom',   // Tech Stack nodes connect from root's BOTTOM handle
      'Database': 'left',       // Database nodes connect from root's LEFT handle
      'User Flows': 'top'       // User Flows nodes connect from root's TOP handle
    };

    // Child node TARGET handles (where the edge ENTERS child node)
    const childTargetHandleMap: Record<string, string> = {
      'Features': 'left',       // Edge enters Features node from the LEFT
      'Tech Stack': 'top',      // Edge enters Tech Stack node from the TOP
      'Database': 'right',      // Edge enters Database node from the RIGHT
      'User Flows': 'bottom'    // Edge enters User Flows node from the BOTTOM
    };

    const sourceHandle = rootSourceHandleMap[categoryName];
    const targetHandle = childTargetHandleMap[categoryName];

    console.log(`🔗 Creating edge for ${categoryName}: root[${sourceHandle}] → node[${targetHandle}]`);

    // Create edge from root to new node
    const { error: edgeError } = await supabase
      .from('edges')
      .insert({
        project_id: projectId,
        source_node_id: rootNode.id,
        target_node_id: newNode.id,
        source_handle: sourceHandle,  // Where edge exits FROM root node
        target_handle: targetHandle,  // Where edge enters TO child node
        edge_type: 'parent_child',
      });

    if (edgeError) {
      console.error('❌ Edge creation failed:', edgeError);
      throw edgeError;
    }

    console.log('✅ Edge created successfully');

    toast.success(`Created ${categoryName} node: ${title}`);

    return { nodeId: newNode.id, isNew: true };
  } catch (error) {
    console.error('Error auto-creating node:', error);
    toast.error(`Failed to create ${categoryName} node`);
    throw error;
  }
}

/**
 * Add a suggestion item to an existing node's metadata
 */
export async function addSuggestionToNode(
  nodeId: string,
  categoryName: 'Features' | 'Tech Stack' | 'Database' | 'User Flows',
  suggestion: SuggestionItem
): Promise<void> {
  try {
    console.log(`🔧 addSuggestionToNode called:`, {
      nodeId,
      categoryName,
      suggestionTitle: suggestion.title
    });

    // Get current node metadata
    const { data: node, error: fetchError } = await supabase
      .from('nodes')
      .select('metadata, title')
      .eq('id', nodeId)
      .single();

    if (fetchError || !node) {
      throw new Error('Node not found');
    }

    console.log(`📦 Current node:`, {
      nodeId,
      nodeTitle: node.title,
      currentMetadata: node.metadata
    });

    let updatedMetadata: Record<string, any> = { ...(node.metadata || {}) };

    // Update metadata based on category
    if (categoryName === 'Features') {
      console.log('➡️ Processing as FEATURES node');
      const features = updatedMetadata.features || [];
      const newId = Math.max(...features.map((f: any) => f.id || 0), 0) + 1;

      updatedMetadata.features = [
        ...features,
        {
          id: newId,
          title: suggestion.title,
          description: suggestion.description,
          ...(suggestion.metadata || {}),
        },
      ];
      console.log('✅ Updated features array:', updatedMetadata.features);
    } else if (categoryName === 'Tech Stack') {
      console.log('➡️ Processing as TECH STACK node');
      const techStack = updatedMetadata.techStack || [];
      const newId = Math.max(...techStack.map((t: any) => t.id || 0), 0) + 1;

      updatedMetadata.techStack = [
        ...techStack,
        {
          id: newId,
          name: suggestion.title,
          description: suggestion.description,
          ...(suggestion.metadata || {}),
        },
      ];
      console.log('✅ Updated techStack array:', updatedMetadata.techStack);
    } else if (categoryName === 'Database') {
      // For database, MERGE with existing metadata to preserve manual entries
      updatedMetadata = {
        ...updatedMetadata, // Preserve existing fields
        entity_name: suggestion.title,
        description: suggestion.description,
        ...(suggestion.metadata || {}),
      };
    } else if (categoryName === 'User Flows') {
      // For user flows, MERGE with existing metadata to preserve manual entries
      updatedMetadata = {
        ...updatedMetadata, // Preserve existing fields
        flow_name: suggestion.title,
        description: suggestion.description,
        ...(suggestion.metadata || {}),
      };
    }

    // Update the node in database
    const { error: updateError } = await supabase
      .from('nodes')
      .update({ metadata: updatedMetadata })
      .eq('id', nodeId);

    if (updateError) throw updateError;

    toast.success(`Added "${suggestion.title}" to ${node.title || categoryName}`);
  } catch (error) {
    console.error('Error adding suggestion to node:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to add suggestion: ${errorMessage}`);
    // Don't throw - let processing continue for other suggestions
  }
}

/**
 * Process AI suggestions: auto-create nodes if needed, then add items
 */
export async function processSuggestions(
  projectId: string,
  suggestions: SuggestionGroup,
  onNodesUpdated: () => void
): Promise<void> {
  try {
    console.log('🔵 processSuggestions called with:', {
      projectId,
      suggestionType: suggestions.type,
      itemCount: suggestions.items.length,
      items: suggestions.items
    });

    const categoryMap: Record<SuggestionGroup['type'], string> = {
      features: 'Features',
      tech_stack: 'Tech Stack',
      database: 'Database',
      user_flows: 'User Flows',
    };

    const categoryName = categoryMap[suggestions.type];
    console.log('🔵 Mapped category:', suggestions.type, '→', categoryName);

    if (!categoryName) {
      console.error('❌ Invalid suggestion type:', suggestions.type);
      toast.error(`Invalid suggestion type: ${suggestions.type}`);
      return;
    }

    if (categoryName === 'Features' || categoryName === 'Tech Stack') {
      // Singleton nodes - create once, add all items to it
      console.log(`🟢 Processing singleton node: ${categoryName}`);
      try {
        const { nodeId, isNew } = await autoCreateNode(
          projectId,
          categoryName,
          categoryName,
          categoryName === 'Features' ? { features: [] } : { techStack: [] }
        );
        console.log(`✅ ${categoryName} node ${isNew ? 'created' : 'found'}:`, nodeId);

        // Add all suggestions to this node (errors handled individually)
        for (const item of suggestions.items) {
          console.log(`📝 Adding item to ${categoryName}:`, item.title);
          await addSuggestionToNode(nodeId, categoryName, item);
        }
      } catch (error) {
        console.error(`❌ Error processing ${categoryName} suggestions:`, error);
        toast.error(`Failed to process ${categoryName}. Please try again.`);
      }
    } else {
      // Multi-instance nodes - create separate node for each item
      console.log(`🟡 Processing multi-instance nodes: ${categoryName}`);
      for (const item of suggestions.items) {
        try {
          console.log(`📝 Creating ${categoryName} node:`, item.title);
          const { nodeId, isNew } = await autoCreateNode(
            projectId,
            categoryName,
            item.title,
            {
              [categoryName === 'Database' ? 'entity_name' : 'flow_name']: item.title,
              description: item.description,
              ...(item.metadata || {}),
            }
          );
          console.log(`✅ ${categoryName} node "${item.title}" ${isNew ? 'created' : 'found'}:`, nodeId);
        } catch (error) {
          console.error(`❌ Error creating ${categoryName} node for ${item.title}:`, error);
          // Continue with next item even if one fails
        }
      }
    }

    // Trigger UI update regardless of errors
    console.log('🔄 Triggering UI update');
    onNodesUpdated();
  } catch (error) {
    console.error('❌ Error processing suggestions:', error);
    toast.error('Failed to process suggestions. Please check the console for details.');
  }
}
