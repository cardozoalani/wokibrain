export const typeDefs = `#graphql
  type Query {
    health: Health!
    restaurant(id: ID!): Restaurant
    restaurants(limit: Int = 20, offset: Int = 0): RestaurantConnection!
    booking(id: ID!): Booking
    bookings(
      restaurantId: ID!
      sectorId: ID!
      date: String!
      status: BookingStatus
      limit: Int = 50
      offset: Int = 0
    ): BookingConnection!
    discoverSeats(input: DiscoverSeatsInput!): DiscoveryResult!
  }

  type Mutation {
    createBooking(input: CreateBookingInput!): Booking!
    cancelBooking(id: ID!): CancelBookingResult!
    createRestaurant(input: CreateRestaurantInput!): Restaurant!
    updateRestaurant(id: ID!, input: UpdateRestaurantInput!): Restaurant!
  }

  type Subscription {
    bookingCreated(restaurantId: ID!): Booking!
    bookingCancelled(restaurantId: ID!): Booking!
  }

  type Health {
    status: String!
    version: String!
    timestamp: String!
  }

  type Restaurant {
    id: ID!
    name: String!
    timezone: String!
    windows: [TimeWindow!]!
    sectors: [Sector!]!
    createdAt: String!
    updatedAt: String!
  }

  type RestaurantConnection {
    nodes: [Restaurant!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type Sector {
    id: ID!
    restaurantId: ID!
    name: String!
    tables: [Table!]!
    createdAt: String!
    updatedAt: String!
  }

  type Table {
    id: ID!
    sectorId: ID!
    name: String!
    minSize: Int!
    maxSize: Int!
    createdAt: String!
    updatedAt: String!
  }

  type Booking {
    id: ID!
    restaurantId: ID!
    sectorId: ID!
    tableIds: [ID!]!
    tables: [Table!]!
    partySize: Int!
    start: String!
    end: String!
    durationMinutes: Int!
    status: BookingStatus!
    guestName: String
    guestEmail: String
    guestPhone: String
    createdAt: String!
    updatedAt: String!
  }

  type BookingConnection {
    nodes: [Booking!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type TimeWindow {
    start: String!
    end: String!
  }

  type DiscoveryResult {
    slotMinutes: Int!
    durationMinutes: Int!
    candidates: [Candidate!]!
  }

  type Candidate {
    kind: CandidateKind!
    tableIds: [ID!]!
    tables: [Table!]!
    start: String!
    end: String!
    score: Float
  }

  type CancelBookingResult {
    success: Boolean!
    message: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  enum BookingStatus {
    CONFIRMED
    CANCELLED
  }

  enum CandidateKind {
    SINGLE
    COMBO
  }

  input DiscoverSeatsInput {
    restaurantId: ID!
    sectorId: ID!
    date: String!
    partySize: Int!
    duration: Int!
    windowStart: String
    windowEnd: String
    limit: Int
  }

  input CreateBookingInput {
    restaurantId: ID!
    sectorId: ID!
    partySize: Int!
    durationMinutes: Int!
    date: String!
    windowStart: String
    windowEnd: String
    guestName: String
    guestEmail: String
    guestPhone: String
  }

  input CreateRestaurantInput {
    name: String!
    timezone: String!
    windows: [TimeWindowInput!]
  }

  input UpdateRestaurantInput {
    name: String
    timezone: String
    windows: [TimeWindowInput!]
  }

  input TimeWindowInput {
    start: String!
    end: String!
  }
`;



