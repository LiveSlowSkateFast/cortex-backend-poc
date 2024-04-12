import { makeExecutableSchema } from '@graphql-tools/schema'
import type { GraphQLContext } from './context'
import { isFullPageOrDatabase, isNotionClientError } from '@notionhq/client'

// TODO: Test that env vars are set

const typeDefinitions = /* GraphQL */ `
  type Query {
    info: String!
    context(url: String!): [Link!]!
    links(urlContains: String): [Link!]!
  }
  type Mutation {
    postLink(url: String!, title: String!): Link!
    deleteLink(id: String!): DeleteLinkResponse!
  }
  type Link {
    title: String!
    url: String!
    id: String
  }
  type DeleteLinkResponse {
    success: Boolean!
    message: String!
    deletedLink: Link
  }
`

const getLinksFromNotion = async (
  urlContains: string,
  context: GraphQLContext,
) => {
  const response = await context.notion.databases.query({
    database_id: process.env.NOTION_LINK_DB || '',
    filter_properties: ['sFFJ', 'title'],
    filter: {
      property: 'Public Url',
      url: {
        contains: urlContains,
      },
    },
  })

  return response.results.filter(isFullPageOrDatabase).map((result) => ({
    title: (result.properties.Name as any).title[0].text.content,
    url: (result.properties['Public Url'] as any).url,
    id: result.id,
  }))
}

const resolvers = {
  Query: {
    info: () =>
      'This is the info response from Project Cortext GraphQL API.  You have successfully connected to the API.',
    async context(
      parent: unknown,
      args: { url: string },
      context: GraphQLContext,
    ) {
      const response = await context.notion.databases.query({
        database_id: process.env.NOTION_LINK_DB || '',
        filter_properties: ['sFFJ', 'title'],
        filter: {
          property: 'Public Url',
          url: {
            contains: args.url,
          },
        },
      })
      return response.results.filter(isFullPageOrDatabase).map((result) => ({
        title: (result.properties.Name as any).title[0].text.content,
        url: (result.properties['Public Url'] as any).url,
        id: result.id,
      }))
    },
    async links(
      parent: unknown,
      args: { urlContains: string },
      context: GraphQLContext,
    ) {
      return getLinksFromNotion(args.urlContains, context)
    },
  },
  Mutation: {
    async postLink(
      parent: unknown,
      args: { url: string; title: string },
      context: GraphQLContext,
    ) {
      const response = await context.notion.pages.create({
        parent: {
          database_id: process.env.NOTION_LINK_DB || '',
        },
        properties: {
          Name: { title: [{ text: { content: args.title } }] },
          'Public Url': { url: args.url },
        },
      })
      // console.log(`New Link: ${JSON.stringify(response, null, 2)}`)
      return isFullPageOrDatabase(response)
        ? {
            title: (response.properties.Name as any).title[0].text.content,
            url: (response.properties['Public Url'] as any).url,
            id: response.id,
          }
        : null
    },
    async deleteLink(
      parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) {
      try {
        const response = await context.notion.pages.update({
          page_id: args.id,
          archived: true,
        })
        return (
          isFullPageOrDatabase(response) && {
            success: true,
            message: 'Link deleted successfully',
            deletedLink: {
              title: (response.properties.Name as any).title[0].text.content,
              url: (response.properties['Public Url'] as any).url,
              id: response.id,
            },
          }
        )
      } catch (error: unknown) {
        return (
          isNotionClientError(error) && {
            success: false,
            message: error.message,
            deletedLink: null,
          }
        )
      }
    },
  },
}

export const schema = makeExecutableSchema({
  resolvers: [resolvers],
  typeDefs: [typeDefinitions],
})
