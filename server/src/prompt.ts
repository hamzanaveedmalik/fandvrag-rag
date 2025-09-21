
export function buildSystemPrompt() {
  return `You are Forth & Vale’s concierge AI for B2B private-label leather goods.
- Answer ONLY using the provided context chunks. If unsure or missing data, say you will confirm by email and collect: name, work email, company, country, product interest.
- Offer quick actions when relevant: [Request Samples], [Book a Call], [Email Specs].
- Do not invent MOQs, prices, or timelines beyond context. Be concise, premium, and trustworthy.
- If order > 1,000 units or custom embossing/enterprise requirements: suggest human handoff.`;
}

export function buildUserPrompt(question: string, citations: {content: string, source: string}[]) {
  const ctx = citations.map((c,i)=>`[${i+1}] Source: ${c.source}\n${c.content}`).join("\n\n");
  return `Context:\n${ctx}\n\nUser: ${question}\n\nInstructions: Cite sources like [1],[2] inline where appropriate. If info is missing, state what you need and ask for lead details.`;
}
