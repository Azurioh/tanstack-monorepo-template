/** Source of unique identifiers for new entities. */
export interface IdGenerator {
  next(): string;
}
