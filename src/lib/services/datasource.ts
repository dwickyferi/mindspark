import { pgDb as db } from "@/lib/db/pg/db.pg";
import { DatasourceSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/server";
import { decrypt } from "@/lib/crypto";
import type { DatasourceListItem } from "@/lib/api/datasources";

export class DatasourceService {
  static async getDatasource(datasourceId: string): Promise<{
    success: boolean;
    data?: DatasourceListItem & { connectionConfig?: any };
    error?: string;
  }> {
    try {
      const session = await getSession();
      const userId = session.user.id;

      const datasource = await db
        .select({
          id: DatasourceSchema.id,
          name: DatasourceSchema.name,
          type: DatasourceSchema.type,
          isActive: DatasourceSchema.isActive,
          lastConnectionTest: DatasourceSchema.lastConnectionTest,
          metadata: DatasourceSchema.metadata,
          tags: DatasourceSchema.tags,
          createdAt: DatasourceSchema.createdAt,
          updatedAt: DatasourceSchema.updatedAt,
          connectionConfig: DatasourceSchema.connectionConfig,
        })
        .from(DatasourceSchema)
        .where(
          and(
            eq(DatasourceSchema.id, datasourceId),
            eq(DatasourceSchema.userId, userId),
          ),
        )
        .limit(1);

      if (datasource.length === 0) {
        return {
          success: false,
          error: "Datasource not found",
        };
      }

      const result = datasource[0];

      // Decrypt the connection config
      let connectionConfig = null;
      if (result.connectionConfig) {
        try {
          connectionConfig = JSON.parse(
            decrypt(result.connectionConfig as string),
          );
        } catch (error) {
          console.error("Failed to decrypt connection config:", error);
          return {
            success: false,
            error: "Failed to decrypt connection configuration",
          };
        }
      }

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          type: result.type,
          status: result.isActive
            ? "connected"
            : ("error" as "connected" | "error" | "connecting"),
          lastTested: result.lastConnectionTest || undefined,
          tags: result.tags || undefined,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          connectionConfig,
        },
      };
    } catch (error) {
      console.error("Error getting datasource:", error);
      return {
        success: false,
        error: "Failed to get datasource",
      };
    }
  }
}
