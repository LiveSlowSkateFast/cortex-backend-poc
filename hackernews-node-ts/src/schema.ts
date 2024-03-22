import { makeExecutableSchema } from '@graphql-tools/schema'
import type { Link, Comment } from '@prisma/client'
import type { GraphQLContext } from './context'
import { GraphQLError } from 'graphql'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

const typeDefinitions = /* GraphQL */ `
  type Query {
    info: String!
    link(id: ID!): Link
    comment(id: ID!): Comment
    feed(
        filter: String 
        limit: Int
        ): [Link!]!
  }
 
  type Mutation {
    postLink(url: String!, description: String!): Link!
    postCommentOnLink(linkId: ID!, body: String!): Comment!
  }
 
  type Link {
    id: ID!
    description: String!
    url: String!
    comments: [Comment!]!
  }

   type Comment {
    id: ID!
    body: String!
    link: Link!
    linkId: Int!
   }
`

const resolvers = {
    Query: {
        info: () => `This is the API of a Hackernews Clone`,
        async feed(parent: unknown, args: {filter: string, limit: number}, 
            context: GraphQLContext)  {
                const where = args.filter 
                    ? {
                        OR: [
                            { description: { contains: args.filter } },
                            { url: { contains: args.filter } }
                        ]
                      }
                    : {}
                return context.prisma.link.findMany({ where, take: args.limit})
        },
        async comment( parent: unknown, args: { id: string }, context: GraphQLContext ) {
            return context.prisma.comment.findUnique({
                where: { id: parseInt(args.id) }
            })
        },
        async link( parent: unknown, args: { id: string }, context: GraphQLContext ) {
            return context.prisma.link.findUnique({
                where: { id: parseInt(args.id) }
            })
        }
    },
    Link: {
        comments( parent: Link, args: {}, context: GraphQLContext ) {
            return context.prisma.comment.findMany({
                where: { linkId: parent.id }
            })
        }
    },
    Comment:{
        link( parent: Comment, args: {}, context: GraphQLContext) {
            return context.prisma.link.findUnique({
                where: { id: parent.linkId || undefined }
            })
        }
    },

    Mutation: {
        async postLink( parent: unknown, args: { description: string; url: string }, 
            context: GraphQLContext ) {
            const newLink = await context.prisma.link.create({
                data: {
                    url: args.url,
                    description: args.description
                }
            })
            return newLink
        },
        async postCommentOnLink( parent: unknown, args: { linkId: string; body: string },
            context: GraphQLContext ) {
            const newComment = await context.prisma.comment.create({
                data: {
                    linkId: parseInt(args.linkId),
                    body: args.body
                }
            })
            .catch((err: unknown) => {
                if (err instanceof PrismaClientKnownRequestError && err.code === 'P2003') {
                    return Promise.reject(
                        new GraphQLError(`Cannot post comment on non-existing link with id ${args.linkId}`)
                    )
                }
                return Promise.reject(err)
            })
            return newComment
        }
    }
}

export const schema = makeExecutableSchema({
    resolvers: [resolvers],
    typeDefs: [typeDefinitions]
})