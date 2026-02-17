// api/chat.js (Node.js runtime)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { question, portfolio } = req.body;

  try {
    const response = await fetch("https://consistent-black-cicada.fastmcp.app/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FASTMCP_TOKEN}` // Set this in Vercel Dashboard
      },
      body: JSON.stringify({
        method: "mcp.call_tool",
        params: {
          name: "generate_ai_analysis",
          arguments: {
            // We pass the local portfolio data directly into the tool
            custom_context: JSON.stringify(portfolio),
            user_question: question
          }
        }
      })
    });

    const data = await response.json();
    
    // Extract the text from the MCP content block
    const aiResponse = data.result.content[0].text;

    return res.status(200).json({ answer: aiResponse });
  } catch (error) {
    console.error("Bridge Error:", error);
    return res.status(500).json({ error: "Failed to reach AI Brain" });
  }
}