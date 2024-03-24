import { makeExecutableSchema } from '@graphql-tools/schema'
import { url } from 'inspector'

const typeDefinitions = /* GraphQL */ `
  type Query {
    info: String!
    context(url: String!): String!
  }
`

const resolvers = {
    Query: {
        info: () => 'This is the Project Cortext GraphQL API',
        context: async (parent: unknown, args: { url: string }) => {
            const notionContext = await queryNotion(args.url)
            return notionContext
        }
    }
}

export const schema = makeExecutableSchema({
    resolvers: [resolvers],
    typeDefs: [typeDefinitions]
})

const queryNotion = async (url: string) => {
    console.log(`Received URL: ${url}`)
    const databaseId = '30cd6f171a484bab8bf7d264cd55dedc'
    const filter = {
        "property": "Public Url",
        "url": {
            "contains": url
        }
    }
    const props = `filter_properties=sFFJ&&filter_properties=title`
    const endpoint = `https://api.notion.com/v1/databases/${databaseId}/query?${props}`
    console.log(`Endpoint: ${endpoint}`)
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "filter": filter
        })
    })
        .then(resp => resp.json())
        .then(json => json)
        .catch(error => console.error('Error:', error))

    const results = response.results.map((result: any) => {
        return {
            name: result.properties.Name.title[0].plain_text,
            url: result.properties['Public Url'].url,
        }
    })
    console.log(`Received results: ${JSON.stringify(results, null, 2)}`)
    return `This is a test of the notion query for ${url}, with results: ${JSON.stringify(results)}`
    // return results
}

