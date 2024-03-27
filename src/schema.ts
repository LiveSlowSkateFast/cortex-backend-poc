import { makeExecutableSchema } from '@graphql-tools/schema'
import type { GraphQLContext } from './context'
import { isFullPageOrDatabase } from '@notionhq/client'

const typeDefinitions = /* GraphQL */ `
  type Query {
    info: String!
    context(url: String!): [Link!]!
    links(urlContains: String): [Link!]!
  }
  type Mutation {
    postLink(url: String!, title: String!): Link!
  }
  type Link {
    title: String!
    url: String!
    id: String
  }
`

const getLinksFromNotion = async (urlContains: string, context: GraphQLContext) => {
    const response = await context.notion.databases.query({
        database_id: process.env.NOTION_LINK_DB || '',
        filter_properties: ['sFFJ', 'title'],
        filter: {
            property: 'Public Url',
            url: {
                contains: urlContains
            }
        }
    })
    return response.results
        .filter(isFullPageOrDatabase)
        .map(result => ({
            title: (result.properties.Name as any).title[0].text.content,
            url: (result.properties['Public Url'] as any).url,
            id: result.id
        }))
}

const resolvers = {
    Query: {
        info: () => 'This is the Project Cortext GraphQL API',
        async context(parent: unknown, args: { url: string },
            context: GraphQLContext) {
            const response = await context.notion.databases.query({
                database_id: process.env.NOTION_LINK_DB || '',
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
                    url: (result.properties['Public Url'] as any).url,
                    id: result.id
                }))
        },
        async links(
            parent: unknown, 
            args: { urlContains: string },
            context: GraphQLContext
            ) { return getLinksFromNotion(args.urlContains, context) 
        },
    },
    Mutation: {
        async postLink(parent: unknown, args: { url: string, title: string },
            context: GraphQLContext) {
            const response = await context.notion.pages.create({
                parent: {
                    database_id: process.env.NOTION_LINK_DB || ''
                },
                properties: {
                    Name: { title: [{ text: { content: args.title } }] },
                    'Public Url': { url: args.url }
                }
            })
            console.log(`New Link: ${JSON.stringify(response, null, 2)}`)
            return isFullPageOrDatabase(response) ? ({
                title: (response.properties.Name as any).title[0].text.content,
                url: (response.properties['Public Url'] as any).url,
                id: response.id
            }) : null
        }
    }
}

export const schema = makeExecutableSchema({
    resolvers: [resolvers],
    typeDefs: [typeDefinitions]
})
