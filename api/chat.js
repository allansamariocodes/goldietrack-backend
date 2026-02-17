export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { question, portfolio } = req.body;

  try {
    const response = await fetch("https://consistent-black-cicada.fastmcp.app/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FASTMCP_TOKEN}`
      },
      body: JSON.stringify({
        method: "mcp.call_tool",
        params: {
          name: "generate_ai_analysis",
          arguments: {
            // Send the real portfolio data from the phone
            portfolio_data: JSON.stringify(portfolio),
            question: question
          }
        }
      })
    });

    const data = await response.json();
    
    // Grab the text from the first content block
    const aiResponse = data.result.content[0].text;

    return res.status(200).json({ answer: aiResponse });
  } catch (error) {
    console.error("Vercel Bridge Error:", error);
    return res.status(500).json({ error: "Could not connect to AI server" });
  }
}