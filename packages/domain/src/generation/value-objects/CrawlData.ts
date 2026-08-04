import { DomainError } from '../../shared/domain-error';

export class InvalidCrawlDataError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(message: string) {
    super(`Invalid crawl data: ${message}`);
  }
}

export interface CrawlDataProps {
  source: string;       // e.g. 'google-ai-overview', 'serp-api'
  query: string;        // The search query used
  rawResponse: unknown; // Raw API response (serializable)
  fetchedAt: Date;
}

/**
 * Value Object representing raw external API data persisted for replay and cache.
 * Immutable. Created once when API data is fetched, never modified.
 * Used by the ai-overview-analysis tool to persist SERP/Google AI Overview data.
 */
export class CrawlData {
  private constructor(
    readonly source: string,
    readonly query: string,
    readonly rawResponse: unknown,
    readonly fetchedAt: Date,
  ) {}

  static create(props: CrawlDataProps): CrawlData {
    if (!props.source.trim()) throw new InvalidCrawlDataError('source is required');
    if (!props.query.trim()) throw new InvalidCrawlDataError('query is required');
    return new CrawlData(props.source, props.query, props.rawResponse, props.fetchedAt);
  }

  static reconstitute(props: CrawlDataProps): CrawlData {
    return new CrawlData(props.source, props.query, props.rawResponse, props.fetchedAt);
  }

  toJSON(): CrawlDataProps {
    return {
      source: this.source,
      query: this.query,
      rawResponse: this.rawResponse,
      fetchedAt: this.fetchedAt,
    };
  }

  equals(other: CrawlData): boolean {
    return this.source === other.source
      && this.query === other.query
      && this.fetchedAt.getTime() === other.fetchedAt.getTime();
  }
}
