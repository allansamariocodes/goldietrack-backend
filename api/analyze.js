import { MultiServerMCPClient } from "langchain_mcp_adapters/client";

const SERVERS = {
  "Precious Metals Portfolio AI": {
    transport: "streamable_http",
    url: "https://consistent-black-cicada.fastmcp.app/mcp",
  },
};

export default async function handler(req, res) {
  try {
    const client = new MultiServerMCPClient(SERVERS);
    const tools = await client.get_tools();

    const tool = tools.find(t => t.name === "analyze_precious_metals");

    const result = await tool.ainvoke({});

    res.status(200).json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "MCP call failed" });
  }
}
