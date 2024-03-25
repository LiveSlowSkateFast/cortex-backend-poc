import { Client as NotionClient } from "@notionhq/client"

// Initialize the Notion Client
const notion = new NotionClient({
  auth: process.env.NOTION_API_KEY,
})

// Define the types for the GraphQL context
export type GraphQLContext = {
    notion: NotionClient
}
 
export async function createContext(): Promise<GraphQLContext> {
  return { notion }
}