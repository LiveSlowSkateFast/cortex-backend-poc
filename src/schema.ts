import { makeExecutableSchema } from '@graphql-tools/schema'
import type { GraphQLContext } from './context'

// TODO: context to return link type & remove note type until needed
const typeDefinitions = /* GraphQL */ `
  type Query {
    info: String!
    context(url: String!): [Note!]!
  }
  type Mutation {
    postLink(url: String!, title: String!): Link!
  }
  type Link {
    title: String!
    url: String!
  }
  type Note {
    title: String!
    url: String!
  }
`

const resolvers = {
    Query: {
        info: () => 'This is the Project Cortext GraphQL API',
        // TODO: Refactor to use the notion client rather than fetch
        context: async (parent: unknown, args: { url: string }) => {
            const notionContext = await queryNotion(args.url)
            console.log(`Notion Context: ${JSON.stringify(notionContext, null, 2)}`)
            return notionContext
        }
    },
    Mutation: {
        async postLink(parent: unknown, args: { url: string, title: string },
            context: GraphQLContext ) {
            const newLink = await context.notion.pages.create({
                parent:{
                    database_id: '30cd6f171a484bab8bf7d264cd55dedc'
                },
                properties:{ 
                    Name:{ title:[ { text:{ content: args.title } } ] }, 
                    'Public Url':{ url: args.url } }
            })
            console.log(`New Link: ${JSON.stringify(newLink, null, 2)}`)
            // TODO: Figure out why I can't access any properties of newLink other than id and object
            return {
                title: newLink.id,
                url: newLink.object
            }
        }
    }
}

export const schema = makeExecutableSchema({
    resolvers: [resolvers],
    typeDefs: [typeDefinitions]
})

// TODO: Save this as a refernece and remove
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
            title: result.properties.Name.title[0].plain_text,
            url: result.properties['Public Url'].url,
        }
    })
    return results
}

