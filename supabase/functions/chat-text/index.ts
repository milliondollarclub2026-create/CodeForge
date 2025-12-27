import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.0'

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  history: Message[]
  projectId: string
  projectTitle: string
  projectDescription?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history, projectTitle, projectDescription }: ChatRequest = await req.json()

    // Build system prompt with project context
    const systemPrompt = `You are a PRD assistant helping users define their app: "${projectTitle}" - ${projectDescription || 'No description provided'}.

Context nodes to help user populate:
1. Features - ONE node per project, contains array of feature items
2. Tech Stack - ONE node per project, contains array of tech entries
3. User Flows - MULTIPLE nodes allowed, one per distinct user flow (Login Flow, Checkout Flow, etc.)
4. Database - MULTIPLE nodes allowed, one per entity (User, Product, Order, etc.)

CRITICAL NODE RULES:
- Features Node: Maximum 1 per project. All features are items in metadata.features[]
- Tech Stack Node: Maximum 1 per project. All tech entries in metadata.techStack[]
- User Flow Nodes: Multiple allowed. Each represents one complete flow.
- Database Nodes: Multiple allowed. Each represents one database entity.

Your role:
- Ask ONE focused question at a time about each context node type
- Provide exactly 4 relevant options per question
- After gathering enough context, provide CONCRETE SUGGESTIONS for items to add to nodes
- For Features/Tech Stack: All items go into the single node
- For User Flows/Database: Each gets its own node

Format your response with:

[QUESTION_TEXT]

OPTIONS:
1. [Option 1]
2. [Option 2]
3. [Option 3]
4. [Option 4]

SUGGESTIONS:
{
  "type": "features|tech_stack|user_flows|database",
  "items": [
    {
      "title": "Feature title",
      "description": "Detailed description",
      "actionLabel": "Add to Features"
    }
  ]
}

Professional and clear language for non-technical users.`

    // Build messages for Claude
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse OPTIONS from response
    const optionsMatch = assistantMessage.match(/OPTIONS:\s*\n([\s\S]*?)(?:\n\n|SUGGESTIONS:|$)/)
    let options: string[] = []

    if (optionsMatch) {
      options = optionsMatch[1]
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(option => option.length > 0)
    }

    // Parse SUGGESTIONS from response
    const suggestionsMatch = assistantMessage.match(/SUGGESTIONS:\s*\n({[\s\S]*?})\s*(?:\n\n|$)/)
    let suggestions = null

    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1])
      } catch (e) {
        console.error('Failed to parse suggestions:', e)
      }
    }

    // Remove OPTIONS and SUGGESTIONS sections from message
    let cleanMessage = assistantMessage
      .replace(/OPTIONS:\s*\n[\s\S]*?(?=\n\n|SUGGESTIONS:|$)/, '')
      .replace(/SUGGESTIONS:\s*\n{[\s\S]*?}\s*(?:\n\n|$)/, '')
      .trim()

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        options: options.length >= 4 ? options : undefined,
        suggestions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
