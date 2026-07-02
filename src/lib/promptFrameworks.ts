export interface PromptFramework {
  id: string;
  name: string;
  acronym: string;
  description: string;
  bestFor: string[];
  sections: { label: string; description: string }[];
  instruction: string;
  exampleSnippet: string;
}

export const PROMPT_FRAMEWORKS: PromptFramework[] = [
  {
    id: 'crispe',
    name: 'CRISPE',
    acronym: 'Capacity · Request · Insight · Statement · Personality · Experiment',
    description: 'Research-backed framework for precise, repeatable LLM outputs.',
    bestFor: ['Coding', 'Research & Data', 'Writing & Content'],
    sections: [
      { label: 'Capacity/Role', description: 'Define the expert persona and domain authority' },
      { label: 'Request', description: 'State the exact task in one clear sentence' },
      { label: 'Insight', description: 'Provide background context, constraints, and assumptions' },
      { label: 'Statement', description: 'Specify the desired output format and structure' },
      { label: 'Personality', description: 'Set tone, voice, and stylistic preferences' },
      { label: 'Experiment', description: 'Add 1–2 few-shot examples or edge-case handling' },
    ],
    instruction: `Structure the final prompt using the CRISPE framework with clearly labeled sections:
[Capacity/Role], [Request], [Insight], [Statement], [Personality], [Experiment].
Each section must be substantive — no placeholder text.`,
    exampleSnippet: `[Capacity/Role] You are a senior staff engineer specializing in distributed systems.
[Request] Refactor the provided monolith into microservices.
[Insight] Team of 8, Node.js/PostgreSQL, 99.9% uptime SLA, 6-week deadline.`,
  },
  {
    id: 'co-star',
    name: 'CO-STAR',
    acronym: 'Context · Objective · Style · Tone · Audience · Response',
    description: 'Singapore GovTech framework — excellent for business and marketing prompts.',
    bestFor: ['Writing & Content', 'Research & Data'],
    sections: [
      { label: 'Context', description: 'Background information the model needs' },
      { label: 'Objective', description: 'The specific goal to achieve' },
      { label: 'Style', description: 'Writing or output style (formal, conversational, etc.)' },
      { label: 'Tone', description: 'Emotional quality (authoritative, empathetic, urgent)' },
      { label: 'Audience', description: 'Who will consume the output' },
      { label: 'Response', description: 'Exact format, length, and structure of the output' },
    ],
    instruction: `Structure the final prompt using CO-STAR with labeled sections:
[Context], [Objective], [Style], [Tone], [Audience], [Response].
Make each section specific to the user's idea — generic filler is forbidden.`,
    exampleSnippet: `[Context] B2B SaaS startup launching a new analytics dashboard.
[Objective] Write a launch email that drives demo bookings.
[Audience] VP of Engineering at mid-market companies.`,
  },
  {
    id: 'risen',
    name: 'RISEN',
    acronym: 'Role · Instructions · Steps · End Goal · Narrowing',
    description: 'Step-by-step framework ideal for complex multi-phase tasks.',
    bestFor: ['Coding', 'Research & Data', 'RAG / AI Agent'],
    sections: [
      { label: 'Role', description: 'Expert identity and credentials' },
      { label: 'Instructions', description: 'High-level rules and constraints' },
      { label: 'Steps', description: 'Numbered sequence of actions to follow' },
      { label: 'End Goal', description: 'Definition of success / acceptance criteria' },
      { label: 'Narrowing', description: 'Scope limits, exclusions, and boundaries' },
    ],
    instruction: `Structure the final prompt using RISEN with labeled sections:
[Role], [Instructions], [Steps], [End Goal], [Narrowing].
Steps must be numbered and actionable. End Goal must include measurable criteria.`,
    exampleSnippet: `[Role] You are a data analyst with 10 years in healthcare analytics.
[Steps] 1. Parse the CSV  2. Identify outliers  3. Generate summary stats  4. Visualize trends
[End Goal] A markdown report with 3 key insights and 2 recommended actions.`,
  },
  {
    id: 'rtf',
    name: 'RTF',
    acronym: 'Role · Task · Format',
    description: 'Minimal, high-impact structure — best when brevity matters.',
    bestFor: ['Coding', 'Writing & Content', 'Image Generation'],
    sections: [
      { label: 'Role', description: 'Who the AI should act as' },
      { label: 'Task', description: 'What to do, with all requirements inline' },
      { label: 'Format', description: 'Exact output structure (JSON schema, markdown, etc.)' },
    ],
    instruction: `Structure the final prompt using RTF with three clearly separated blocks:
[Role], [Task], [Format]. Keep it tight but complete — every requirement belongs in [Task].`,
    exampleSnippet: `[Role] Expert Python developer and code reviewer.
[Task] Write a FastAPI endpoint that accepts a CSV upload, validates columns, returns JSON stats.
[Format] Return only the Python code with type hints and docstrings. No explanations.`,
  },
  {
    id: 'react-agent',
    name: 'ReAct Agent',
    acronym: 'Role · Tools · Thought/Action/Observation · Guardrails · Output Schema',
    description: 'Production-grade system prompt structure for autonomous AI agents.',
    bestFor: ['RAG / AI Agent'],
    sections: [
      { label: 'Role', description: 'Agent identity and capabilities' },
      { label: 'Tools', description: 'Available tools and when to use each' },
      { label: 'Reasoning Loop', description: 'Thought → Action → Observation cycle rules' },
      { label: 'Guardrails', description: 'Safety rules, refusal conditions, PII handling' },
      { label: 'Output Schema', description: 'Strict JSON/XML response format' },
    ],
    instruction: `Structure as a production system prompt for an AI agent using:
[Role/Persona], [Available Tools], [Reasoning Protocol (Thought/Action/Observation)],
[Guardrails & Safety Rules], [Output Format/Schema].
Include explicit instructions for handling {context} in RAG scenarios.`,
    exampleSnippet: `[Role] Enterprise HR policy assistant with read-only document access.
[Reasoning Protocol] Always cite the source document section before answering.
[Guardrails] Refuse legal advice. Redact employee names. Never speculate beyond documents.`,
  },
  {
    id: 'chain-of-thought',
    name: 'Chain-of-Thought',
    acronym: 'Problem · Reasoning Steps · Verification · Final Answer',
    description: 'Forces explicit step-by-step reasoning before conclusions.',
    bestFor: ['Research & Data', 'Coding'],
    sections: [
      { label: 'Problem', description: 'Clear problem statement with all given data' },
      { label: 'Reasoning Steps', description: 'Instruction to think step-by-step aloud' },
      { label: 'Verification', description: 'Self-check criteria before finalizing' },
      { label: 'Final Answer', description: 'Format for the conclusive output' },
    ],
    instruction: `Structure the prompt to enforce Chain-of-Thought reasoning:
[Problem Statement], [Step-by-Step Reasoning Instructions], [Self-Verification Checklist], [Final Answer Format].
Explicitly instruct: "Think through each step before providing the final answer."`,
    exampleSnippet: `[Problem] Calculate the ROI of migrating 50 servers to cloud given the cost data below.
[Reasoning] Show each calculation step. State assumptions explicitly.
[Verification] Cross-check totals. Flag any assumption that changes the result by >10%.`,
  },
  {
    id: 'ape',
    name: 'APE',
    acronym: 'Action · Purpose · Expectation',
    description: 'Ultra-focused framework for quick, high-quality single-shot prompts.',
    bestFor: ['Writing & Content', 'Image Generation', 'Video Generation'],
    sections: [
      { label: 'Action', description: 'The specific action to perform' },
      { label: 'Purpose', description: 'Why this output matters — the "so what"' },
      { label: 'Expectation', description: 'Quality bar, examples of good vs bad output' },
    ],
    instruction: `Structure using APE: [Action], [Purpose], [Expectation].
The Expectation section must define quality criteria and at least one anti-pattern to avoid.`,
    exampleSnippet: `[Action] Write a product description for a wireless ergonomic mouse.
[Purpose] Drive conversions on an Amazon listing targeting remote workers.
[Expectation] 150 words max, lead with the top benefit, include 3 bullet specs. Avoid clichés like "revolutionary".`,
  },
  {
    id: 'care',
    name: 'CARE',
    acronym: 'Context · Action · Result · Example',
    description: 'Few-shot friendly framework — great when examples dramatically improve quality.',
    bestFor: ['Coding', 'Writing & Content', 'RAG / AI Agent'],
    sections: [
      { label: 'Context', description: 'Situation and background' },
      { label: 'Action', description: 'What the model should do' },
      { label: 'Result', description: 'Expected outcome and format' },
      { label: 'Example', description: '1–2 concrete input→output examples' },
    ],
    instruction: `Structure using CARE: [Context], [Action], [Result], [Example].
Include at least one realistic few-shot example in [Example] tailored to the user's domain.`,
    exampleSnippet: `[Context] Customer support chatbot for a SaaS billing product.
[Action] Classify the user message into: billing, technical, or account.
[Example] Input: "I was charged twice" → Output: {"category": "billing", "urgency": "high"}`,
  },
];

export function getRecommendedFramework(category: string): PromptFramework {
  const match = PROMPT_FRAMEWORKS.find(f => f.bestFor.includes(category));
  return match ?? PROMPT_FRAMEWORKS[0];
}

export function getFrameworkInstruction(frameworkId: string): string {
  const fw = PROMPT_FRAMEWORKS.find(f => f.id === frameworkId);
  if (!fw) return PROMPT_FRAMEWORKS[0].instruction;
  return fw.instruction;
}

export function buildFrameworkSystemPreamble(frameworkId: string, category: string): string {
  const fw = PROMPT_FRAMEWORKS.find(f => f.id === frameworkId) ?? getRecommendedFramework(category);
  const sectionGuide = fw.sections
    .map(s => `  • ${s.label}: ${s.description}`)
    .join('\n');

  return `
PROMPT ENGINEERING FRAMEWORK: ${fw.name} (${fw.acronym})
${fw.description}

Required section structure:
${sectionGuide}

Framework rules:
${fw.instruction}

Reference quality bar (adapt to user's topic):
${fw.exampleSnippet}
`.trim();
}
