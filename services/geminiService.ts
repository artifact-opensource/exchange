
export const simulateRepoStructure = async (repoName: string, context: string) => {
  try {
    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Act as a senior software architect. Generate a realistic JSON file structure for a repository named "${repoName}" in the context of "${context}". 
        Return ONLY a JSON array of objects with this structure: [{ "name": "string", "path": "string", "type": "file" | "dir", "size": number }].
        Focus on core infrastructure files, typical directory structures for this kind of project, and naming conventions.
        Keep it to 10-15 items. Do not include markdown or explanations.`
      })
    });

    if (!response.ok) throw new Error('Simulation failed');
    const data = await response.json();
    
    // Extract JSON from the text if Gemini included markdown blocks
    const text = data.text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Simulation failed:", error);
    return [];
  }
};
