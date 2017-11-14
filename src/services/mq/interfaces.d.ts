export type ConsumerMQMethod = (data: string, replyTo: any, channel: string) => void;

/**
 * Message queue interface
 */
export interface MessageQueue {
  /**
   * Subscribe and return a method for unsubscribing.
   */
  subscribe(channel: string, consumer: ConsumerMQMethod): () => void;

  /**
   * Publish data to the channel
   */
  publish(channel: string, data: string|Object): Promise<void>;
}
