import { makeExecutableSchema } from '@graphql-tools/schema'
import type { GraphQLContext } from './context'
import { isFullPageOrDatabase } from '@notionhq/client'

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
        async context(parent: unknown, args: { url: string },
            context: GraphQLContext) {
            const response = await context.notion.databases.query({
                // TODO: Make a link database environment variable
                database_id: '30cd6f171a484bab8bf7d264cd55dedc',
                filter_properties: ['sFFJ', 'title'],
                filter: {
                    property: 'Public Url',
                    url: {
                        contains: args.url
                    }
                }
            })
            return response.results
                .filter(isFullPageOrDatabase)
                .map(result => ({
                    title: (result.properties.Name as any).title[0].text.content,
                    url: result.url
                }))
        }
    },
    Mutation: {
        async postLink(parent: unknown, args: { url: string, title: string },
            context: GraphQLContext) {
            const newLink = await context.notion.pages.create({
                parent: {
                    database_id: '30cd6f171a484bab8bf7d264cd55dedc'
                },
                properties: {
                    Name: { title: [{ text: { content: args.title } }] },
                    'Public Url': { url: args.url }
                }
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
