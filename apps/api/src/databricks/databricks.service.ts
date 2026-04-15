import { Injectable, Logger } from '@nestjs/common'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatabricksStatementPayload {
  statement: string
  catalog?: string
  schema?: string
  parameters?: unknown[]
  rowLimit?: number
}

interface DatabricksColumn {
  name: string
  type_name?: string
}

interface DatabricksChunk {
  data_array?: (string | null)[][]
  next_chunk_internal_link?: string
}

interface DatabricksStatementResult {
  statement_id: string
  status: {
    state: string
    error?: { message?: string; error_code?: string }
  }
  manifest?: {
    schema?: { columns?: DatabricksColumn[] }
    truncated?: boolean
  }
  result?: DatabricksChunk
}

interface DatabricksTokenResponse {
  access_token: string
  expires_in?: number | string
}

type ConnectionMode = 'pat' | 'oauth' | 'none'

interface RunStatementResult {
  rows: Record<string, unknown>[]
  audit: {
    source: 'databricks'
    statementId: string
    rowCount: number
    truncated: boolean
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class DatabricksService {
  private readonly logger = new Logger(DatabricksService.name)

  private readonly tokenCache: { accessToken: string | null; expiresAt: number } = {
    accessToken: null,
    expiresAt: 0,
  }

  // -------------------------------------------------------------------------
  // Env helpers
  // -------------------------------------------------------------------------

  private normalizeValue(value: unknown): string {
    return String(value ?? '').trim()
  }

  private extractJdbcParts(rawValue: unknown): { host: string; httpPath: string } {
    const value = this.normalizeValue(rawValue)
    if (!value.startsWith('jdbc:databricks://')) {
      return { host: value, httpPath: '' }
    }

    const withoutPrefix = value.replace(/^jdbc:databricks:\/\//u, '')
    const [hostPortPart, ...paramParts] = withoutPrefix.split(';')
    const host = hostPortPart.split('/')[0].replace(/:443$/u, '')
    const httpPathEntry = paramParts.find((part) => part.startsWith('httpPath='))

    return {
      host,
      httpPath: httpPathEntry ? httpPathEntry.replace(/^httpPath=/u, '') : '',
    }
  }

  private normalizeHost(): string {
    const rawHost = this.extractJdbcParts(process.env.DATABRICKS_HOST).host
    return rawHost.replace(/^https?:\/\//u, '').replace(/\/+$/u, '')
  }

  private getHttpPath(): string {
    return (
      this.normalizeValue(process.env.DATABRICKS_HTTP_PATH) ||
      this.extractJdbcParts(process.env.DATABRICKS_HOST).httpPath
    )
  }

  private parseWarehouseIdFromHttpPath(httpPath: string): string {
    const match = this.normalizeValue(httpPath).match(/\/sql\/1\.0\/warehouses\/([^/?]+)/u)
    return match ? match[1] : ''
  }

  private getWarehouseId(): string {
    return (
      this.normalizeValue(process.env.DATABRICKS_SQL_WAREHOUSE_ID) ||
      this.parseWarehouseIdFromHttpPath(this.getHttpPath())
    )
  }

  // -------------------------------------------------------------------------
  // Auth detection
  // -------------------------------------------------------------------------

  private isPatConfigured(): boolean {
    return (
      Boolean(this.normalizeHost()) &&
      Boolean(process.env.DATABRICKS_TOKEN) &&
      Boolean(this.getWarehouseId())
    )
  }

  private isOAuthConfigured(): boolean {
    return (
      Boolean(this.normalizeHost()) &&
      Boolean(process.env.DATABRICKS_CLIENT_ID) &&
      Boolean(process.env.DATABRICKS_CLIENT_SECRET) &&
      Boolean(this.getWarehouseId())
    )
  }

  /** Returns the active connection mode based on available env vars. PAT takes priority. */
  getConnectionMode(): ConnectionMode {
    if (this.isPatConfigured()) return 'pat'
    if (this.isOAuthConfigured()) return 'oauth'
    return 'none'
  }

  // -------------------------------------------------------------------------
  // HTTP helper
  // -------------------------------------------------------------------------

  private async fetchJson<T = Record<string, unknown>>(
    url: string,
    options: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, options)
    const text = await response.text()
    let payload: Record<string, unknown> = {}

    if (text) {
      try {
        payload = JSON.parse(text) as Record<string, unknown>
      } catch {
        payload = { raw: text }
      }
    }

    if (!response.ok) {
      const message =
        (payload?.message as string) ||
        (payload?.error as string) ||
        (payload?.raw as string) ||
        `Databricks request failed with status ${response.status}.`
      const error = Object.assign(new Error(message), { statusCode: 502 })
      throw error
    }

    return payload as T
  }

  // -------------------------------------------------------------------------
  // Token acquisition
  // -------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    if (this.getConnectionMode() === 'pat') {
      return this.normalizeValue(process.env.DATABRICKS_TOKEN)
    }

    const now = Date.now()
    if (this.tokenCache.accessToken && this.tokenCache.expiresAt - 60_000 > now) {
      return this.tokenCache.accessToken
    }

    const host = this.normalizeHost()
    const clientId = process.env.DATABRICKS_CLIENT_ID ?? ''
    const clientSecret = process.env.DATABRICKS_CLIENT_SECRET ?? ''

    const tokenPayload = await this.fetchJson<DatabricksTokenResponse>(
      `https://${host}/oidc/v1/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'all-apis',
        }).toString(),
      },
    )

    this.tokenCache.accessToken = tokenPayload.access_token
    this.tokenCache.expiresAt = now + Number(tokenPayload.expires_in ?? 3600) * 1000
    return this.tokenCache.accessToken
  }

  // -------------------------------------------------------------------------
  // Row mapping
  // -------------------------------------------------------------------------

  private coerceValue(value: string | null | undefined, column: DatabricksColumn): unknown {
    if (value === null || value === undefined) return value

    const typeName = String(column?.type_name ?? '').toUpperCase()
    if (
      ['BIGINT', 'INT', 'INTEGER', 'LONG', 'SHORT', 'TINYINT', 'DECIMAL', 'DOUBLE', 'FLOAT'].includes(
        typeName,
      )
    ) {
      const numericValue = Number(value)
      return Number.isNaN(numericValue) ? value : numericValue
    }

    if (typeName === 'BOOLEAN') {
      return value === 'true'
    }

    return value
  }

  private mapRows(
    manifest: DatabricksStatementResult['manifest'],
    chunks: DatabricksChunk[],
  ): Record<string, unknown>[] {
    const columns = manifest?.schema?.columns ?? []
    const rows: Record<string, unknown>[] = []

    for (const chunk of chunks) {
      for (const rawRow of chunk?.data_array ?? []) {
        const record: Record<string, unknown> = {}
        columns.forEach((column, index) => {
          record[column.name] = this.coerceValue(rawRow[index], column)
        })
        rows.push(record)
      }
    }

    return rows
  }

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------

  private async pollStatement(
    host: string,
    statementId: string,
    authHeaders: Record<string, string>,
    { maxAttempts = 120, intervalMs = 2000 }: { maxAttempts?: number; intervalMs?: number } = {},
  ): Promise<DatabricksStatementResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const payload = await this.fetchJson<DatabricksStatementResult>(
        `https://${host}/api/2.0/sql/statements/${statementId}`,
        { method: 'GET', headers: authHeaders },
      )

      const state = payload?.status?.state
      if (
        state === 'SUCCEEDED' ||
        state === 'FAILED' ||
        state === 'CANCELED' ||
        state === 'CLOSED'
      ) {
        return payload
      }

      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
    }

    throw Object.assign(
      new Error('Databricks statement timed out while polling results.'),
      { statusCode: 504 },
    )
  }

  // -------------------------------------------------------------------------
  // Chunk collection
  // -------------------------------------------------------------------------

  private async collectChunks(
    host: string,
    initialPayload: DatabricksStatementResult,
    authHeaders: Record<string, string>,
  ): Promise<DatabricksChunk[]> {
    const chunks: DatabricksChunk[] = [initialPayload.result ?? {}]
    let nextChunk = initialPayload.result?.next_chunk_internal_link

    while (nextChunk) {
      const chunkPayload = await this.fetchJson<{ result?: DatabricksChunk }>(
        `https://${host}${nextChunk}`,
        { method: 'GET', headers: authHeaders },
      )
      chunks.push(chunkPayload.result ?? {})
      nextChunk = chunkPayload.result?.next_chunk_internal_link
    }

    return chunks
  }

  // -------------------------------------------------------------------------
  // Statement execution
  // -------------------------------------------------------------------------

  private async executeStatementOnce(
    payload: DatabricksStatementPayload,
  ): Promise<RunStatementResult> {
    const host = this.normalizeHost()
    const token = await this.getAccessToken()
    const warehouseId = this.getWarehouseId()
    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const statementPayload = await this.fetchJson<DatabricksStatementResult>(
      `https://${host}/api/2.0/sql/statements/`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          warehouse_id: warehouseId,
          catalog: payload.catalog,
          schema: payload.schema,
          statement: payload.statement,
          parameters: payload.parameters,
          format: 'JSON_ARRAY',
          disposition: 'INLINE',
          wait_timeout: '30s',
          on_wait_timeout: 'CONTINUE',
          row_limit: payload.rowLimit ?? 366,
        }),
      },
    )

    const terminalPayload =
      statementPayload?.status?.state === 'SUCCEEDED'
        ? statementPayload
        : await this.pollStatement(host, statementPayload.statement_id, authHeaders)

    const state = terminalPayload?.status?.state
    if (state !== 'SUCCEEDED') {
      const detail =
        terminalPayload?.status?.error?.message ||
        terminalPayload?.status?.error?.error_code ||
        ''
      const msg = detail
        ? `Databricks statement ended with status ${state ?? 'UNKNOWN'}: ${detail}`
        : `Databricks statement ended with status ${state ?? 'UNKNOWN'}.`
      const s = String(payload.statement)
      this.logger.error(`[FAILED SQL chars 1400-1900]\n${s.slice(1400, 1900)}`)
      throw Object.assign(new Error(msg), { statusCode: 502 })
    }

    const chunks = await this.collectChunks(host, terminalPayload, authHeaders)
    const rows = this.mapRows(terminalPayload.manifest, chunks)

    return {
      rows,
      audit: {
        source: 'databricks',
        statementId: terminalPayload.statement_id,
        rowCount: rows.length,
        truncated: Boolean(terminalPayload.manifest?.truncated),
      },
    }
  }

  /**
   * Execute a SQL statement on Databricks.
   * Automatically retries once on timeout (504) or CANCELED status.
   */
  async runStatement(payload: DatabricksStatementPayload): Promise<RunStatementResult> {
    try {
      return await this.executeStatementOnce(payload)
    } catch (error) {
      const message = String((error as Error)?.message ?? '')
      const retryable =
        (error as { statusCode?: number })?.statusCode === 504 ||
        message.includes('status CANCELED')
      if (!retryable) throw error
      return this.executeStatementOnce(payload)
    }
  }
}
