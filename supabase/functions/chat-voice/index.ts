import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.0'
import OpenAI from 'npm:openai@4.20.1'

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
})

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const historyString = formData.get('history') as string
    const projectTitle = formData.get('projectTitle') as string
    const projectDescription = formData.get('projectDescription') as string | null

    if (!audioFile) {
      throw new Error('No audio file provided')
    }

    // Parse history
    let history: Message[] = []
    if (historyString) {
      try {
        history = JSON.parse(historyString)
      } catch (e) {
        console.error('Failed to parse history:', e)
      }
    }

    // Transcribe audio with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })

    const userMessage = transcription.text

    // Build system prompt
    const systemPrompt = `You are a PRD assistant for: "${projectTitle}"${projectDescription ? ` - ${projectDescription}` : ''}.

CRITICAL DATABASE SCHEMA - You MUST use these exact types and metadata structures:

1. FEATURES NODE (type: "features")
   - Singleton: Only ONE Features node per project
   - Metadata structure: {features: [{id: number, title: string, description: string}]}
   - All feature items go into the single node's metadata.features array

2. TECH STACK NODE (type: "tech_stack")
   - Singleton: Only ONE Tech Stack node per project
   - Metadata structure: {techStack: [{id: number, category: string, name: string, version?: string, ...}]}
   - Categories: "core_language", "frontend_framework", "backend_framework", "external_service", "dev_tool", "third_party_api"
   - All tech entries go into the single node's metadata.techStack array

3. DATABASE NODES (type: "database")
   - Multiple allowed: One node per database entity (User, Product, Order, etc.)
   - Metadata structure: {entity_name: string, description: string, security_model: string, notes?: string}
   - Security models: "public", "private_owner", "private_user"
   - Each entity is a SEPARATE node with its own metadata

4. USER FLOWS NODES (type: "user_flows")
   - Multiple allowed: One node per user flow (Login Flow, Checkout Flow, etc.)
   - Metadata structure: {flow_name: string, description: string, start_state?: string, end_state?: string, steps?: string[], notes?: string}
   - Each flow is a SEPARATE node with its own metadata

STRICT WORKFLOW (DO NOT DEVIATE):
0. If user says "start", ask the Features question immediately
1. Ask ONE question about Features → User answers → Generate SUGGESTIONS with type: "features" ONLY → Move to step 2
2. Ask ONE question about Tech Stack → User answers → Generate SUGGESTIONS with type: "tech_stack" ONLY → Move to step 3
3. Ask ONE question about Data Entities → User answers → Generate SUGGESTIONS with type: "database" ONLY → Move to step 4
4. Ask ONE question about User Journeys → User answers → Generate SUGGESTIONS with type: "user_flows" ONLY → Done

ABSOLUTE RULES:
- ONE question at a time. Never ask multiple questions.
- ONE SUGGESTIONS block per response. Match the current step ONLY.
- NEVER show JSON, code, or technical terms to the user
- NEVER mention frameworks, libraries, or databases in questions
- Keep responses SHORT and simple
- After user answers, acknowledge briefly then provide EXACTLY ONE SUGGESTIONS block
- Use EXACT type names: "features", "tech_stack", "database", "user_flows"
- CRITICAL: Only provide suggestions for the CURRENT step, not future steps

RESPONSE FORMAT:
[Simple question]

OPTIONS:
1. [Plain English option]
2. [Plain English option]
3. [Plain English option]
4. [Plain English option]
5. [Plain English option]
6. [Plain English option]

After user answers:
"Thank you. Creating [node type] now."

SUGGESTIONS:
{
  "type": "features|tech_stack|database|user_flows",
  "items": [
    {
      "title": "Plain English Title",
      "description": "What this does in simple terms",
      "actionLabel": "Add to Features",
      "metadata": {
        // For features: {id, title, description}
        // For tech_stack: {category, name, version, ...}
        // For database: {entity_name, description, security_model, notes}
        // For user_flows: {flow_name, description, start_state, end_state, steps, notes}
      }
    }
  ]
}

EXAMPLES - EXACT FORMAT TO FOLLOW:

Step 1 Example - After user answers Features question:
"Thank you. Creating Features node now."

SUGGESTIONS:
{
  "type": "features",
  "items": [
    {
      "title": "Auto-save functionality",
      "description": "Automatically save user work to prevent data loss",
      "actionLabel": "Add to Features"
    }
  ]
}

Step 2 Example - After user answers Tech Stack question:
"Thank you. Creating Tech Stack node now."

SUGGESTIONS:
{
  "type": "tech_stack",
  "items": [
    {
      "title": "Web Application",
      "description": "Browser-based access for desktop users",
      "actionLabel": "Add to Tech Stack",
      "metadata": {
        "category": "frontend_framework",
        "name": "React",
        "version": "18.0"
      }
    }
  ]
}

Step 3 Example - After user answers Database question:
"Thank you. Creating Database nodes now."

SUGGESTIONS:
{
  "type": "database",
  "items": [
    {
      "title": "Users",
      "description": "User account information and authentication data",
      "actionLabel": "Add to Database",
      "metadata": {
        "entity_name": "Users",
        "security_model": "private_owner"
      }
    }
  ]
}

Step 4 Example - After user answers User Flows question:
"Thank you. Creating User Flow nodes now."

SUGGESTIONS:
{
  "type": "user_flows",
  "items": [
    {
      "title": "User Login Flow",
      "description": "Authentication process for returning users",
      "actionLabel": "Add to User Flows",
      "metadata": {
        "flow_name": "User Login",
        "start_state": "Login Page",
        "end_state": "Dashboard",
        "steps": ["Enter credentials", "Validate", "Redirect to dashboard"]
      }
    }
  ]
}

CRITICAL RULES:
- Only ONE SUGGESTIONS block per response
- SUGGESTIONS type must match the current step (features, tech_stack, database, or user_flows)
- NEVER generate multiple SUGGESTIONS blocks in one response
- After providing SUGGESTIONS, ask the NEXT question immediately`

    // Build messages for Claude
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
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
        transcript: userMessage,
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
