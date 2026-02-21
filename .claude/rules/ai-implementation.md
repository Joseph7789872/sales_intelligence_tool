# AI/LLM Implementation

## Model
- Use `claude-sonnet-4-20250514` for all LLM calls
- Enable extended thinking (max 8k tokens) for: deal analysis algorithm design, prompt structuring, database query optimization

## Pattern Analysis
```typescript
const painPoints = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  messages: [{
    role: 'user',
    content: `Analyze these call transcripts from closed-won deals and extract the top 3 pain points mentioned:
    
    ${transcripts.join('\n---\n')}
    
    Return JSON: { "painPoints": ["pain1", "pain2", "pain3"] }`
  }]
});
```

## Playbook Generation
```typescript
const email = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  messages: [{
    role: 'user',
    content: `Generate a cold email for:
    - Prospect: ${prospect.company} (${prospect.industry}, ${prospect.employees} employees)
    - Similar won deal: ${similarDeal.company} (pain point: ${painPoint})
    - Winning subject format: "How [Company] cut [metric] by X%"
    
    Make it personalized and reference the similar company's success.`
  }]
});
```

## LLM Rules
- Never expose raw LLM responses to frontend — parse and validate JSON before sending to UI
- Always wrap Claude API calls in try/catch with retries
- Chunk large inputs (transcripts >5k words) before sending to Claude
- Validate JSON responses from Claude with Zod before using downstream