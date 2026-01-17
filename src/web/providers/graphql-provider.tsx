/**
 * GraphQL Provider Component
 * Wraps the application with Apollo Provider
 */
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../lib/apollo-client';

interface GraphQLProviderProps {
  children: React.ReactNode;
}

export function GraphQLProvider({ children }: GraphQLProviderProps) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
