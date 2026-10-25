export type HubSubscriber = {
  name: string;
  url: string;
  secret: string;
  /** Reference prefixes that route to this subscriber; empty = all events. */
  prefixes: string[];
};
